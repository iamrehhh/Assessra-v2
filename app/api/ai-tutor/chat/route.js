import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const getToneInstruction = (tone) => {
    switch (tone) {
        case 'friend':
            return 'You are a supportive, casual, and friendly peer who happens to be great at this subject. Use accessible language, an encouraging tone, and be relatable. Always aim for clarity over jargon.';
        case 'girlfriend':
            return "You are the user's smart, playful, and affectionately teasing girlfriend who is helping them study. You want them to succeed and be proud of them, but you also joke around, use sweet terms of endearment casually, and keep the vibe fun, romantic, and engaging while remaining academically sound.";
        case 'boyfriend':
            return "You are the user's smart, caring, and supportive boyfriend who is helping them study. You are affectionate, occasionally protective and romantic, making sure they understand the material well while keeping the mood lighthearted and charming, while remaining academically sound.";
        case 'professional':
        default:
            return 'You are an elite, professional, and rigorous academic professor. You provide highly accurate, comprehensive, and theoretically sound explanations. You demand high standards but are patient and crystal clear in your didactic approach.';
    }
};

async function getAdminReferenceContext(query, subject, level) {
    try {
        const embeddingRes = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: query,
        });
        const queryEmbedding = embeddingRes.data[0].embedding;

        // Level needs string match like 'alevel' or 'igcse' internally
        const sysLevel = level.toLowerCase() === 'a level' || level.toLowerCase() === 'as & a level' ? 'alevel' : 'igcse';
        const sysSubject = subject.toLowerCase().replace(' ', '_');

        const { data: chunks, error } = await supabase.rpc('match_tutor_reference', {
            query_embedding: queryEmbedding,
            match_count: 5,
            filter_subject: sysSubject,
            filter_level: sysLevel
        });

        if (error || !chunks || chunks.length === 0) return '';

        return chunks.map(c => c.content).join('\n\n');
    } catch (err) {
        console.error('Error fetching admin RAG context:', err);
        return '';
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, conversationId, messages, subject, level, tone, uploadText } = body;

        if (!email || !messages || !subject || !level) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Save the user's message to the DB if we have a conversationId
        const lastUserMessage = messages[messages.length - 1];
        if (conversationId && lastUserMessage.role === 'user') {
            await supabase.from('ai_tutor_messages').insert({
                conversation_id: conversationId,
                role: 'user',
                content: lastUserMessage.content
            });
            // Update conversation updated_at
            await supabase.from('ai_tutor_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
        }

        // System prompt context
        const subjectContext = `You are an AI Tutor for students studying ${subject.toUpperCase()} at the ${level.toUpperCase()} level. `;
        const toneContext = getToneInstruction(tone || 'professional');

        let ragContext = '';
        if (uploadText) {
            ragContext = `\n\nThe user has uploaded a relevant text snippet for context. Please use it to inform your answer if relevant:\n"""\n${uploadText.substring(0, 8000)}\n"""`;
        } else if (lastUserMessage) {
            // Attempt to fetch Admin Textbook RAG context
            const adminText = await getAdminReferenceContext(lastUserMessage.content, subject, level);
            if (adminText) {
                ragContext = `\n\nHere is some exact textbook reference context related to the user's latest message. Use this strictly as factual grounding:\n"""\n${adminText}\n"""`;
            }
        }

        const systemMessage = {
            role: 'system',
            content: subjectContext + toneContext + ragContext + '\n\nFormat your answers beautifully using Markdown. Include headers, bullet points, or bold text where it aids readability.'
        };

        const apiMessages = [systemMessage, ...messages.map(m => ({ role: m.role, content: m.content }))];

        const chatCompletion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: apiMessages,
            temperature: tone === 'professional' ? 0.3 : 0.7,
            max_tokens: 1500,
        });

        const assistantMessageContent = chatCompletion.choices[0].message.content;

        // Save assistant message to DB
        if (conversationId) {
            await supabase.from('ai_tutor_messages').insert({
                conversation_id: conversationId,
                role: 'assistant',
                content: assistantMessageContent
            });
        }

        return NextResponse.json({ message: assistantMessageContent });
    } catch (error) {
        console.error('Error in AI Tutor Chat API:', error);
        return NextResponse.json({ error: 'An error occurred during chat completion.' }, { status: 500 });
    }
}
