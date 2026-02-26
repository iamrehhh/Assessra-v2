// app/api/generate-question/route.js
// POST endpoint to generate Cambridge-style exam questions using RAG context.

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

        // ══════════════════════════════════════════════════════════════════
        // MCQ MODE: marks = number of questions, returns JSON array
        // ══════════════════════════════════════════════════════════════════
        if (qType === 'multiple_choice') {
            const numQuestions = marksInt;

            const mcqPrompt = `Here are real Cambridge ${level} ${subject} past paper questions on the topic of ${topic} for reference:

${context}

---

Based on Cambridge ${level} ${subject} exam style, generate exactly ${numQuestions} unique multiple choice questions on the topic: ${topic}
Difficulty: ${diff}

RULES:
- Each question must have exactly 4 options (A, B, C, D)
- Exactly one option is correct per question
- Distractors must be plausible but wrong
- Cover different aspects of the topic across questions
- Do NOT copy any question from the references

Respond ONLY with valid JSON (no markdown, no code fences). Use this exact format:
[
  {
    "question": "question stem text",
    "options": { "A": "option A text", "B": "option B text", "C": "option C text", "D": "option D text" },
    "correct": "B",
    "explanation": "Why B is correct and why each other option is wrong"
  }
]`;

            const raw = await callLLM(mcqPrompt, subject, 6000);

            // Parse JSON from LLM response
            let mcqQuestions;
            try {
                const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
                mcqQuestions = JSON.parse(cleaned);
            } catch (parseErr) {
                throw new Error('Failed to parse MCQ response as JSON: ' + parseErr.message);
            }

            if (!Array.isArray(mcqQuestions) || mcqQuestions.length === 0) {
                throw new Error('LLM did not return a valid array of MCQ questions.');
            }

            return NextResponse.json({
                mcqMode: true,
                mcqQuestions,
                subject,
                level,
                topic,
                totalQuestions: mcqQuestions.length,
                difficulty: diff,
            });
        }

        // ══════════════════════════════════════════════════════════════════
        // NON-MCQ: Structured, Essay, Data Response
        // ══════════════════════════════════════════════════════════════════
        let formatInstructions = '';
        if (qType === 'data_response') {
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

        const prompt = `Here are real Cambridge ${level} ${subject} past paper questions and marking schemes on the topic of ${topic} for reference:

${context}

---

Based strictly on the style and format used in Cambridge ${level} ${subject} exams, generate ONE new original question with these specifications:
- Subject: ${subject}
- Level: ${level}
- Topic: ${topic}
- Total Marks: ${marksInt}
- Difficulty: ${diff}
- Question Type: ${qType === 'data_response' ? 'Data Response' : qType === 'essay' ? 'Essay' : 'Structured'}

${formatInstructions}

Do not copy any question directly from the past papers provided. Generate an original question inspired by the style and format only.`;

        const raw = await callLLM(prompt, subject, 4000);

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
