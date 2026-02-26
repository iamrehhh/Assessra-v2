// app/api/generate-question/route.js
// POST endpoint to generate a new Cambridge-style exam question using RAG context.

import { NextResponse } from 'next/server';
import { retrieveRelevantContent } from '@/lib/rag';
import { callLLM } from '@/lib/llm';

export async function POST(request) {
    try {
        const body = await request.json();
        const { subject, level, topic, marks, difficulty, questionType } = body;

        // ── Validate required fields ────────────────────────────────────
        if (!subject || !level || !topic) {
            return NextResponse.json(
                { error: 'Missing required fields: subject, level, topic.' },
                { status: 400 }
            );
        }

        const marksInt = parseInt(marks, 10) || 8;
        const diff = difficulty || 'medium';
        const qType = questionType || 'structured';

        // ── Retrieve relevant past paper context from vector store ──────
        let context = '';
        try {
            context = await retrieveRelevantContent(
                `${topic} ${subject} ${qType}`,
                subject,
                level,
                4
            );
        } catch (retrievalError) {
            console.warn('RAG retrieval failed, continuing without context:', retrievalError.message);
            context = 'No past paper context available.';
        }

        // ── Build the generation prompt ─────────────────────────────────
        const prompt = `Here are real Cambridge ${level} ${subject} past paper questions and marking schemes on the topic of ${topic} for reference:

${context}

---

Based strictly on the style, format, difficulty, and command words used in the above Cambridge examples, generate ONE new original question with the following specifications:
- Subject: ${subject}
- Level: ${level}
- Topic: ${topic}
- Total Marks: ${marksInt}
- Difficulty: ${diff}
- Question Type: ${qType}

Your response must follow this exact structure:

QUESTION:
[The full question text using appropriate Cambridge command words such as define, explain, analyse, evaluate, discuss, calculate, describe]

MARK ALLOCATION:
[Breakdown of marks per part if multi-part question]

MARKING SCHEME:
[Detailed marking scheme showing all acceptable answers, mark allocation per point, and examiner notes on what to accept or reject]

EXAMINER NOTES:
[Common mistakes candidates make on this topic and what distinguishes a high scoring answer]

Do not copy any question directly from the past papers provided. Generate an original question inspired by the style and format only.`;

        // ── Call the LLM ────────────────────────────────────────────────
        const raw = await callLLM(prompt, subject, 4000);

        // ── Parse the structured response ───────────────────────────────
        const parseSection = (text, sectionName, nextSections) => {
            const pattern = new RegExp(
                `${sectionName}:\\s*\\n([\\s\\S]*?)(?=${nextSections.map(s => `${s}:`).join('|')}|$)`,
                'i'
            );
            const match = text.match(pattern);
            return match ? match[1].trim() : '';
        };

        const question = parseSection(raw, 'QUESTION', ['MARK ALLOCATION']);
        const markAllocation = parseSection(raw, 'MARK ALLOCATION', ['MARKING SCHEME']);
        const markingScheme = parseSection(raw, 'MARKING SCHEME', ['EXAMINER NOTES']);
        const examinerNotes = parseSection(raw, 'EXAMINER NOTES', []);

        return NextResponse.json({
            question,
            markAllocation,
            markingScheme,
            examinerNotes,
            subject,
            level,
            topic,
            marks: marksInt,
            difficulty: diff,
        });
    } catch (err) {
        console.error('Generate Question API error:', err);
        return NextResponse.json(
            { error: 'Question generation failed.', detail: err.message },
            { status: 500 }
        );
    }
}
