import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { callLLM } from '@/lib/llm';
import fs from 'fs';
import path from 'path';
import { extractText, getDocumentProxy } from 'unpdf';

export const maxDuration = 60; // Prevent Vercel hobby 10s timeout on heavy PDF + LLM generation

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { pdfPath, questionNumber, userAnswer, correctAnswer, questionText } = body;

        if (!pdfPath || questionNumber === undefined || !userAnswer) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const decodedPdfPath = decodeURIComponent(pdfPath);
        const safePath = path.join(process.cwd(), 'public', decodedPdfPath);
        if (!fs.existsSync(safePath)) {
            console.error('PDF not found at path:', safePath);
            return NextResponse.json({ error: `PDF not found at path: ${decodedPdfPath}` }, { status: 404 });
        }

        const dataBuffer = new Uint8Array(fs.readFileSync(safePath));
        const pdf = await getDocumentProxy(dataBuffer);
        const { text } = await extractText(pdf);
        const pdfText = String(text);

        // Build question context — use provided text if available for precise targeting
        const questionContext = questionText
            ? `The exact question text is: "${questionText}"`
            : `Find Question ${questionNumber} in the extracted paper text below.`;

        let prompt = '';
        if (correctAnswer) {
            prompt = `
You are an expert A-Level Economics tutor with deep subject knowledge.

**Question ${questionNumber}**: ${questionContext}
- The student chose: **${userAnswer}**
- The correct answer is: **${correctAnswer}**

Here is the full paper text for reference:
\`\`\`
${pdfText.substring(0, 80000)}
\`\`\`

**Your task — provide a thorough, high-quality explanation:**

1. **Identify the question** — Quote or summarize what Question ${questionNumber} is actually asking, including all the options (A, B, C, D) and their content from the paper.

2. **Why ${correctAnswer} is correct** — Explain the underlying concept or principle clearly. If it involves a calculation, show the full working step by step using plain text math (e.g., "Revenue = Price × Quantity = $5 × 200 = $1,000"). Connect to real economic theory where relevant.

3. **Why each wrong option is incorrect** — For each of the other options (A, B, C, D excluding ${correctAnswer}), briefly explain the specific flaw in reasoning or the misconception it represents. Highlight the student's choice (${userAnswer}) with a bit more detail.

4. **Key takeaway** — One sentence summarizing the core concept the student should remember.

**Formatting rules:**
- Use **bold** for key economic terms, option letters, and important values.
- Use bullet points or numbered lists for clarity.
- For math/calculations, write them as readable inline text with Unicode symbols (×, ÷, →, =, ≈, ≠). Do NOT use LaTeX syntax.
- Be educational, clear, and encouraging — help the student truly understand.
`;
        } else {
            prompt = `
You are an expert A-Level Economics tutor with deep subject knowledge.

**Question ${questionNumber}**: ${questionContext}
- The student chose: **${userAnswer}**
- No official answer key is available for this paper.

Here is the full paper text for reference:
\`\`\`
${pdfText.substring(0, 80000)}
\`\`\`

**Your task — determine the correct answer and provide a thorough explanation:**

1. **Identify the question** — Quote or summarize what Question ${questionNumber} is actually asking, including all the options (A, B, C, D) and their content from the paper.

2. **Determine the correct answer** — State which option (A, B, C, or D) is correct and explain your reasoning thoroughly. If it involves a calculation, show the full working step by step using plain text math (e.g., "Revenue = Price × Quantity = $5 × 200 = $1,000"). Connect to real economic theory.

3. **Why each wrong option is incorrect** — For each of the other three options, briefly explain the specific flaw or misconception. If the student's choice (${userAnswer}) differs from the correct answer, give extra detail on why it's wrong.

4. **Key takeaway** — One sentence summarizing the core concept the student should remember.

**Formatting rules:**
- Use **bold** for key economic terms, option letters, and important values.
- Use bullet points or numbered lists for clarity.
- For math/calculations, write them as readable inline text with Unicode symbols (×, ÷, →, =, ≈, ≠). Do NOT use LaTeX syntax.
- Be educational, clear, and encouraging — help the student truly understand.
`;
        }

        const systemPrompt = "You are a world-class A-Level Economics tutor. You provide clear, thorough, and insightful explanations that help students truly understand concepts — not just memorize answers. Always respond in clean, well-structured markdown. Never use LaTeX notation. When explaining, first identify the exact question being asked, then give a deep but accessible explanation with real economic reasoning.";
        const feedback = await callLLM(prompt, null, 800, systemPrompt, 'gpt-4o');

        return NextResponse.json({ feedback }, { status: 200 });

    } catch (e) {
        console.error('MCQ Feedback Error:', e);
        return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 });
    }
}
