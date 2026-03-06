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

Evaluate the student's answer and respond in this EXACT structure (do not change the ALL CAPS headers below so the system can parse your answer):

MARKS AWARDED: X / ${marksInt}

MARK BREAKDOWN:
(Write this section as "What you did well". Speak directly to the student. Identify specific knowledge, application, or phrasing they used correctly. Be warm and encouraging. E.g., "You nailed the definition here...")

FEEDBACK:
(Write this section as "What was missing". Be honest and highly specific. Diagnose their misconception. Explain exactly *why* they lost marks based on the mark scheme. Use Cambridge phrasing like "chain of reasoning" or "evaluative point".)

MODEL ANSWER:
(Construct a perfect candidate response that would obtain full marks. Add a brief 1-line note at the end explaining *why* it scores full marks.)

EXAMINER TIP:
(One sharp, actionable tip for this student on how to avoid this pitfall next time.)`;

        // ─── Dynamic Model Routing for Economics Calculations ────────────────
        let modelToUse = null;
        if (subject === 'economics') {
            const lowerQ = (question || '').toLowerCase();
            const calcKeywords = ['calculate', 'ped', 'xed', 'yed', 'elasticity', 'opportunity cost', 'gdp', 'profit', 'revenue', '%', 'percentage'];
            const isCalcQuestion = calcKeywords.some(kw => lowerQ.includes(kw));
            if (isCalcQuestion) {
                modelToUse = 'gpt-4o'; // Route to stronger reasoning model
                console.log(`[Evaluate Answer API] Detected Economics calculation question. Routing to: ${modelToUse}`);
            }
        }

        // ── Call the LLM ────────────────────────────────────────────────
        const raw = await callLLM(prompt, subject, 4000, null, modelToUse);

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
