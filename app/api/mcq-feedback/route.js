import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { callLLM } from '@/lib/llm';
import { retrieveRelevantContent } from '@/lib/rag';
import fs from 'fs';
import path from 'path';
import { extractText, getDocumentProxy } from 'unpdf';

export const maxDuration = 60;

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { pdfPath, questionNumber, userAnswer, correctAnswer, questionText, allAnswers } = body;

        if (!pdfPath || questionNumber === undefined || !userAnswer) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const decodedPdfPath = decodeURIComponent(pdfPath);
        const safePath = path.join(process.cwd(), 'public', decodedPdfPath);
        if (!fs.existsSync(safePath)) {
            console.error('PDF not found at path:', safePath);
            return NextResponse.json({ error: `PDF not found at path: ${decodedPdfPath}` }, { status: 404 });
        }

        // Extract PDF text for question context
        const dataBuffer = new Uint8Array(fs.readFileSync(safePath));
        const pdf = await getDocumentProxy(dataBuffer);
        const { text } = await extractText(pdf);
        const pdfText = String(text);

        // Build full answer key string for additional context
        let answerKeyStr = '';
        if (allAnswers && Array.isArray(allAnswers)) {
            answerKeyStr = allAnswers.map((a, idx) => `Q${idx + 1}: ${a}`).join(', ');
        }

        // RAG: Retrieve relevant economics context from textbooks/notes
        let ragContext = '';
        try {
            const ragQuery = questionText
                ? `Economics A-Level: ${questionText}`
                : `Economics A-Level MCQ Question ${questionNumber} concepts`;
            ragContext = await retrieveRelevantContent(ragQuery, 'economics', 'alevel', 4);
        } catch (ragErr) {
            console.warn('[MCQ Feedback] RAG retrieval failed (non-fatal):', ragErr.message);
        }

        const ragSection = ragContext
            ? `\n\n**REFERENCE MATERIAL FROM ECONOMICS TEXTBOOKS:**\n\`\`\`\n${ragContext.substring(0, 6000)}\n\`\`\`\nUse this textbook material to ground your explanation in accurate economic theory.`
            : '';

        let prompt = '';
        if (correctAnswer) {
            prompt = `
You are explaining Question ${questionNumber} from a Cambridge A-Level Economics MCQ paper.

**CRITICAL FACTS (these are DEFINITIVE — do NOT contradict them):**
- The OFFICIAL correct answer to Question ${questionNumber} is: **${correctAnswer}**
- The student selected: **${userAnswer}**
- The student was ${userAnswer === correctAnswer ? 'CORRECT ✓' : 'INCORRECT ✗'}
${answerKeyStr ? `\nFull answer key for this paper: ${answerKeyStr}` : ''}
${questionText ? `\nThe question text is: "${questionText}"` : ''}

**EXTRACTED PAPER TEXT** (use this to find Question ${questionNumber} and its options A, B, C, D):
\`\`\`
${pdfText.substring(0, 80000)}
\`\`\`
${ragSection}

**INSTRUCTIONS:**

Your job is to explain WHY **${correctAnswer}** is the correct answer. The answer key comes from Cambridge's official mark scheme — it is 100% correct and cannot be questioned.

Please structure your response as follows:

**1. The Question**
Find Question ${questionNumber} in the paper text above. Quote the question and list all four options (A, B, C, D) with their content. If you cannot find the exact text, say so but still explain based on the correct answer.

**2. Why ${correctAnswer} is Correct**
Explain the economic concept/principle that makes ${correctAnswer} the right answer. If it's a calculation, show full step-by-step working using plain text (e.g., "PED = %ΔQd ÷ %ΔP = 20% ÷ 10% = 2"). Connect to real A-Level economic theory.

**3. Why the Other Options Are Wrong**
For each wrong option, briefly explain the specific error or misconception.${userAnswer !== correctAnswer ? ` Give extra detail on **${userAnswer}** (the student's choice) — explain exactly why it's wrong and what common misconception leads students to pick it.` : ''}

**4. Key Takeaway**
One clear sentence summarizing the core concept.

**FORMAT RULES:**
- Use **bold** for key terms, option letters, and important values
- Use bullet points for clarity
- For math: use Unicode (×, ÷, →, =, ≈) — NO LaTeX
- Be clear, educational, and accurate
`;
        } else {
            prompt = `
You are explaining Question ${questionNumber} from a Cambridge A-Level Economics MCQ paper.

- The student selected: **${userAnswer}**
- No official answer key is available for this paper.
${questionText ? `\nThe question text is: "${questionText}"` : ''}

**EXTRACTED PAPER TEXT** (use this to find Question ${questionNumber} and its options A, B, C, D):
\`\`\`
${pdfText.substring(0, 80000)}
\`\`\`
${ragSection}

**INSTRUCTIONS:**

Find Question ${questionNumber} in the paper text above. Determine the correct answer using your economics knowledge and the textbook material, then explain it.

**1. The Question**
Quote the question and list all four options (A, B, C, D) with their content.

**2. The Correct Answer**
State which option you believe is correct and explain the economic reasoning thoroughly. Show any calculations step by step using plain text.

**3. Why the Other Options Are Wrong**
For each wrong option, explain the specific error or misconception.

**4. Key Takeaway**
One clear sentence summarizing the core concept.

**FORMAT RULES:**
- Use **bold** for key terms, option letters, and important values
- Use bullet points for clarity
- For math: use Unicode (×, ÷, →, =, ≈) — NO LaTeX
- Be clear, educational, and accurate
`;
        }

        const systemPrompt = "You are a Cambridge A-Level Economics examiner and tutor. You explain MCQ answers with precision and deep subject knowledge. When an official correct answer is provided, you MUST accept it as correct — it comes from Cambridge's official mark scheme and is NEVER wrong. Your job is to explain WHY it is correct, not to verify it. Always respond in clean markdown. Never use LaTeX.";
        const feedback = await callLLM(prompt, null, 1000, systemPrompt);

        return NextResponse.json({ feedback }, { status: 200 });

    } catch (e) {
        console.error('MCQ Feedback Error:', e);
        return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 });
    }
}
