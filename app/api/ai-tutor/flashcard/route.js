import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, subject, contextMessage } = body;

        if (!email || !subject || !contextMessage) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const systemMessage = {
            role: 'system',
            content: `You are an expert ${subject} tutor. The user wants to create a flashcard based on their recent understanding or context.
Given the context message below, generate exactly ONE high-quality flashcard. 
Your response MUST be in strict JSON format with exactly three string fields: "topic", "front" (the question or term), and "back" (the concise answer or definition). Do NOT wrap in markdown \`\`\`json blocks, just return raw JSON.`
        };

        const userMessage = {
            role: 'user',
            content: `Context:\n${contextMessage}\n\nGenerate the JSON flashcard.`
        };

        const chatCompletion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [systemMessage, userMessage],
            temperature: 0.2,
        });

        let flashcardData;
        try {
            const content = chatCompletion.choices[0].message.content.trim();
            // Remove markdown format if AI included it anyway
            const jsonString = content.replace(/^```json/, '').replace(/```$/, '').trim();
            flashcardData = JSON.parse(jsonString);
        } catch (parseError) {
            console.error('Failed to parse flashcard JSON:', chatCompletion.choices[0].message.content);
            return NextResponse.json({ error: 'Failed to format flashcard properly' }, { status: 500 });
        }

        const { data, error } = await supabase
            .from('ai_tutor_flashcards')
            .insert({
                user_email: email,
                subject,
                topic: flashcardData.topic,
                front: flashcardData.front,
                back: flashcardData.back,
            })
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ flashcard: data });
    } catch (error) {
        console.error('Error creating flashcard:', error);
        return NextResponse.json({ error: 'An error occurred while generating the flashcard' }, { status: 500 });
    }
}
