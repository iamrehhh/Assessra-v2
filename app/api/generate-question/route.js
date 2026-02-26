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

        // ── Build question-type-specific instructions ─────────────────
        let formatInstructions = '';
        if (qType === 'multiple_choice') {
            formatInstructions = `
FORMAT RULES (Multiple Choice):
- Write a clear question stem
- Provide exactly 4 options labelled A, B, C, D
- Exactly one option must be correct
- Distractors must be plausible but clearly wrong
- Do NOT reveal the answer in the question stem
- Each question is worth 1 mark

Your response must follow this exact structure:

QUESTION:
[Question stem]

A. [Option A]
B. [Option B]
C. [Option C]
D. [Option D]

MARK ALLOCATION:
1 mark for correct answer

MARKING SCHEME:
Correct answer: [Letter]
[Explanation of why this is correct and why each distractor is wrong]

EXAMINER NOTES:
[Common misconceptions that lead to wrong answers]`;
        } else if (qType === 'data_response') {
            formatInstructions = `
FORMAT RULES (Data Response):
- First provide a short data stimulus (table, extract, or scenario with numbers/data)
- Then ask structured sub-questions (a), (b), (c) etc. based on the data
- Include a mix of knowledge, application, and analysis questions
- Use command words: identify, calculate, explain, analyse, evaluate

Your response must follow this exact structure:

QUESTION:
[Data/stimulus/extract]

[Sub-questions (a), (b), (c) etc. with marks shown as [X marks] for each]

MARK ALLOCATION:
[Breakdown per sub-question]

MARKING SCHEME:
[Detailed per sub-question with acceptable answers]

EXAMINER NOTES:
[Common mistakes and what distinguishes high scoring answers]`;
        } else {
            formatInstructions = `
FORMAT RULES (${qType === 'essay' ? 'Essay' : 'Structured'}):
${qType === 'essay'
                    ? '- Write a single essay question using high-order command words (Discuss, Evaluate, To what extent, Assess)\n- The question should require extended writing with arguments for and against'
                    : '- Write a multi-part structured question with sub-parts (a), (b), (c) etc.\n- Progress from low-order (Define, State, Identify) to high-order (Explain, Analyse, Evaluate)\n- Show marks per sub-part as [X marks]'}

Your response must follow this exact structure:

QUESTION:
[The full question text]

MARK ALLOCATION:
[Breakdown of marks per part]

MARKING SCHEME:
[Detailed marking scheme showing all acceptable answers]

EXAMINER NOTES:
[Common mistakes candidates make on this topic]`;
        }

        // ── Build the generation prompt ─────────────────────────────────
        const prompt = `Here are real Cambridge ${level} ${subject} past paper questions and marking schemes on the topic of ${topic} for reference:

${context}

---

Based strictly on the style and format used in Cambridge ${level} ${subject} exams, generate ONE new original question with these specifications:
- Subject: ${subject}
- Level: ${level}
- Topic: ${topic}
- Total Marks: ${marksInt}
- Difficulty: ${diff}
- Question Type: ${qType === 'multiple_choice' ? 'Multiple Choice' : qType === 'data_response' ? 'Data Response' : qType === 'essay' ? 'Essay' : 'Structured'}

${formatInstructions}

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
