// app/api/generate-question/route.js
// POST endpoint to generate Cambridge-style exam questions using RAG context.

import { NextResponse } from 'next/server';
import { retrieveRelevantContent } from '@/lib/rag';
import { callLLM } from '@/lib/llm';
import { generateDiagram } from '@/lib/diagram';

export async function POST(request) {
    try {
        const body = await request.json();
        const { subject, level, topic, marks, difficulty, questionType, diagramBudgetRemaining } = body;
        const diagramBudget = typeof diagramBudgetRemaining === 'number' ? diagramBudgetRemaining : 2;

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

            // Determine how many MCQs can have diagrams (max 2, limited by budget)
            const mcqDiagramSlots = Math.min(2, diagramBudget);
            const diagramInstruction = mcqDiagramSlots > 0
                ? `\n- For UP TO ${mcqDiagramSlots} questions where a diagram would naturally enhance understanding (e.g. graphs, charts, geometric figures, circuit diagrams, biological diagrams), include a "diagramDescription" field with a detailed description of the diagram needed. Only include this for questions that genuinely benefit from a visual. For questions that don't need a diagram, omit the "diagramDescription" field entirely.`
                : '';

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
- Do NOT copy any question from the references${diagramInstruction}

Respond ONLY with valid JSON (no markdown, no code fences). Use this exact format:
[
  {
    "question": "question stem text",
    "options": { "A": "option A text", "B": "option B text", "C": "option C text", "D": "option D text" },
    "correct": "B",
    "explanation": "Why B is correct and why each other option is wrong",
    "diagramDescription": "(OPTIONAL) detailed description of a diagram if this question benefits from one"
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

            // Generate diagrams for MCQs that have descriptions (respect budget)
            let diagramsGenerated = 0;
            for (const q of mcqQuestions) {
                if (q.diagramDescription && diagramsGenerated < mcqDiagramSlots) {
                    try {
                        q.diagramUrl = await generateDiagram(q.diagramDescription);
                        diagramsGenerated++;
                    } catch (diagramErr) {
                        console.warn('MCQ diagram generation failed, skipping:', diagramErr.message);
                        delete q.diagramDescription;
                    }
                } else {
                    delete q.diagramDescription;
                }
            }

            return NextResponse.json({
                mcqMode: true,
                mcqQuestions,
                subject,
                level,
                topic,
                totalQuestions: mcqQuestions.length,
                difficulty: diff,
                diagramsGenerated,
            });
        }

        // ══════════════════════════════════════════════════════════════════
        // NON-MCQ: Structured, Essay, Data Response
        // ══════════════════════════════════════════════════════════════════
        const canHaveDiagram = diagramBudget > 0;
        const diagramSection = canHaveDiagram
            ? `\n\nDIAGRAM_DESCRIPTION:\n[OPTIONAL — If this question would naturally benefit from a diagram (e.g. supply/demand curves, geometric figures, graphs, circuit diagrams, biological diagrams, data charts), provide a detailed description of the diagram here. If the question does not need a visual, write "NONE" here. Do NOT force a diagram if the question is purely text-based.]`
            : '';

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
[Common mistakes and what distinguishes high scoring answers]${diagramSection}`;
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
[Common mistakes candidates make on this topic]${diagramSection}`;
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
        const examinerNotes = parseSection(raw, 'EXAMINER NOTES', ['DIAGRAM_DESCRIPTION']);
        const diagramDesc = parseSection(raw, 'DIAGRAM_DESCRIPTION', []);

        // Generate diagram if a meaningful description was provided and budget allows
        let diagramUrl = null;
        let hasDiagram = false;
        if (canHaveDiagram && diagramDesc && diagramDesc.toUpperCase() !== 'NONE' && diagramDesc.length > 10) {
            try {
                diagramUrl = await generateDiagram(diagramDesc);
                hasDiagram = true;
            } catch (diagramErr) {
                console.warn('Diagram generation failed, continuing without:', diagramErr.message);
            }
        }

        return NextResponse.json({
            question,
            markAllocation,
            markingScheme,
            examinerNotes,
            diagramUrl,
            hasDiagram,
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
