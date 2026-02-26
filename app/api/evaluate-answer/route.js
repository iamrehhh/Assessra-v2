// app/api/evaluate-answer/route.js
// POST endpoint to evaluate a student's answer against a marking scheme using RAG context.

import { NextResponse } from 'next/server';
import { retrieveRelevantContent } from '@/lib/rag';
import { callLLM } from '@/lib/llm';

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            subject,
            level,
            question,
            markingScheme,
            studentAnswer,
            totalMarks,
            finalAnswerOnly,
        } = body;

        // ── Validate required fields ────────────────────────────────────
        if (!subject || !question || !studentAnswer || !totalMarks) {
            return NextResponse.json(
                { error: 'Missing required fields: subject, question, studentAnswer, totalMarks.' },
                { status: 400 }
            );
        }

        const marksInt = parseInt(totalMarks, 10);

        // ── Optionally retrieve additional marking context ──────────────
        let additionalContext = '';
        try {
            additionalContext = await retrieveRelevantContent(
                question,
                subject,
                level || null,
                3
            );
        } catch (retrievalError) {
            console.warn('RAG retrieval failed, continuing without context:', retrievalError.message);
        }

        // ── Build the evaluation prompt ─────────────────────────────────
        const isFinalOnly = finalAnswerOnly === true || finalAnswerOnly === 'true';

        const prompt = `You are evaluating a student's answer for a Cambridge ${level || ''} ${subject} examination question.

QUESTION:
${question}

TOTAL MARKS AVAILABLE: ${marksInt}

MARKING SCHEME:
${markingScheme || 'Not provided — use your expertise as a Cambridge examiner.'}

${additionalContext ? `ADDITIONAL MARKING CONTEXT FROM PAST PAPERS:\n${additionalContext}\n` : ''}
STUDENT'S ANSWER:
${studentAnswer}

${isFinalOnly ? 'NOTE: The student has submitted their final answer only, not their working. Evaluate the final answer for correctness and provide a complete worked solution.\n' : ''}
---

Evaluate the student's answer and respond in this exact structure:

MARKS AWARDED: X / ${marksInt}

MARK BREAKDOWN:
- Point by point explanation of what was credited and what was not

FEEDBACK:
- What the student did well
- What was missing or incorrect
- How to improve

MODEL ANSWER:
- A perfect candidate response for this question

EXAMINER TIP:
- One specific actionable tip for this student`;

        // ── Call the LLM ────────────────────────────────────────────────
        const raw = await callLLM(prompt, subject, 4000);

        // ── Parse the structured response ───────────────────────────────
        let marksAwarded = 0;
        const scoreMatch = raw.match(/MARKS AWARDED:\s*(\d+(?:\.\d+)?)/i);
        if (scoreMatch) {
            marksAwarded = parseFloat(scoreMatch[1]);
        }

        const parseSection = (text, sectionName, nextSections) => {
            const pattern = new RegExp(
                `${sectionName}:\\s*\\n([\\s\\S]*?)(?=${nextSections.map(s => `${s}:`).join('|')}|$)`,
                'i'
            );
            const match = text.match(pattern);
            return match ? match[1].trim() : '';
        };

        const breakdown = parseSection(raw, 'MARK BREAKDOWN', ['FEEDBACK']);
        const feedback = parseSection(raw, 'FEEDBACK', ['MODEL ANSWER']);
        const modelAnswer = parseSection(raw, 'MODEL ANSWER', ['EXAMINER TIP']);
        const examinerTip = parseSection(raw, 'EXAMINER TIP', []);

        const percentage = marksInt > 0 ? Math.round((marksAwarded / marksInt) * 100) : 0;

        return NextResponse.json({
            marksAwarded,
            totalMarks: marksInt,
            percentage,
            breakdown,
            feedback,
            modelAnswer,
            examinerTip,
        });
    } catch (err) {
        console.error('Evaluate Answer API error:', err);
        return NextResponse.json(
            { error: 'Answer evaluation failed.', detail: err.message },
            { status: 500 }
        );
    }
}
