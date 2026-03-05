import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SUBJECT_KNOWLEDGE = {
    maths: "Focus on Cambridge 0580/9709 standards. Show full logical working steps. Use LaTeX for math. Mention Method Marks when applicable. Structure: Identify → Show Steps → State Answer.",
    physics: "Standard gravity g=9.81 m/s². Use SI units. Define context, state equation, substitute, then calculate. Stress precision and unit consistency.",
    chemistry: "Follow IUPAC nomenclature. Focus on mole calculations, redox, and organic reaction mechanisms. Explain step-by-step with balanced equations.",
    biology: "Use precise Cambridge mark scheme terminology. Use Point-Evidence-Explain (PEE) structure. Focus on biological processes and keyword-heavy definitions.",
    economics: "Focus on definitions, diagrams (describe them), and evaluative points (Pros/Cons). Use terms like 'Ceteris Paribus'.",
    business: "Analyze based on business objectives and stakeholders. Use 'Application' to specific scenarios. Focus on evaluation and chain of reasoning.",
    history: "Focus on source analysis, causation, and significance. Structure with clear chronological or thematic arguments.",
    english: "Focus on PEE structure, literary devices, and authorial intent. Use academic and analytical vocabulary."
};

function getSystemPrompt(subject, level, tone, uploadText, ragContext = '') {
    const toneInstructions = {
        professional: "Academic, rigorous, and formal. Act as a senior Cambridge examiner.",
        friend: "Casual, encouraging, and clear. Use relatable examples.",
        girlfriend: "Playful, endearing, smart, and highly supportive. Use affectionate but respectful language.",
        boyfriend: "Caring, supportive, clever, and protective of their academic success."
    }[tone] || "A helpful academic tutor.";

    const basePrompt = `You are a world-class AI Tutor for the Cambridge Assessment International Education (CAIE) syllabus.
Subject: ${subject}
Level: ${level}
Personality/Tone: ${toneInstructions}

CORE RULES:
1. Ground every answer in the official Cambridge syllabus (${level} standards).
2. ${SUBJECT_KNOWLEDGE[subject.toLowerCase()] || "Explain clearly using academic terminology."}
3. If the user asks a tricky question, include a section: 📝 Exam Tip: [Advice on how to get marks or common pitfalls].
4. If a question feels like a typical exam problem, flag it with: 📋 Past Paper Style Question.
5. Injected Reference Context (Trusted Source): ${ragContext}
6. User Uploaded Material: ${uploadText ? uploadText.substring(0, 10000) : 'None provided.'}

MANDATORY RESPONSE FORMAT:
- Use clean Markdown.
- Keep the tone consistent throughout.
- ALWAYS end your response with exactly 3 short follow-up suggestions in this format: 
SUGGESTIONS: [Question 1] | [Question 2] | [Question 3]`;

    return basePrompt;
}

export async function POST(request) {
    try {
        const { email, conversationId, messages, subject, level, tone, uploadText } = await request.json();

        if (!email || !messages || !subject || !level) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Fetch RAG Context from Admin Textbooks
        let ragContext = '';
        try {
            const userMsg = messages[messages.length - 1].content;
            const embedRes = await openai.embeddings.create({
                model: "text-embedding-ada-002",
                input: userMsg,
            });
            const embedding = embedRes.data[0].embedding;

            const { data: chunks } = await supabase.rpc('match_tutor_reference', {
                query_embedding: embedding,
                match_count: 5,
                filter_subject: subject,
                filter_level: level
            });

            if (chunks) {
                ragContext = chunks.map(c => c.content).join('\n---\n');
            }
        } catch (e) {
            console.error('RAG Error:', e);
        }

        const systemMessage = {
            role: 'system',
            content: getSystemPrompt(subject, level, tone, uploadText, ragContext)
        };

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [systemMessage, ...messages],
            stream: true,
        });

        // 2. Setup Stream
        let fullContent = '';
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                for await (const chunk of response) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullContent += content;
                        controller.enqueue(encoder.encode(content));
                    }
                }

                // 3. Save to database after full stream completion
                try {
                    // Save User Message
                    const lastUserMsg = messages[messages.length - 1];
                    await supabase.from('ai_tutor_messages').insert({
                        conversation_id: conversationId,
                        role: 'user',
                        content: lastUserMsg.content
                    });

                    // Save Assistant Message
                    await supabase.from('ai_tutor_messages').insert({
                        conversation_id: conversationId,
                        role: 'assistant',
                        content: fullContent
                    });

                    // Update conversation timestamp
                    await supabase.from('ai_tutor_conversations').update({ updated_at: new Date() }).eq('id', conversationId);
                } catch (dbErr) {
                    console.error('DB Save Error:', dbErr);
                }

                controller.close();
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
            },
        });

    } catch (error) {
        console.error('AI Chat Error:', error);
        return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }
}
