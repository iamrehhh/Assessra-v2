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
        const { pdfPath, questionNumber, userAnswer, correctAnswer } = body;

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

        let prompt = '';
        if (correctAnswer) {
            prompt = `
You are an expert A-Level tutor.
The student answered Question ${questionNumber}.
They chose Option ${userAnswer}, and the official correct answer is Option ${correctAnswer}.

Here is the text extracted from the MCQ paper:
\`\`\`
${pdfText.substring(0, 80000)}
\`\`\`

Task:
Find Question ${questionNumber} in the text above.
Provide strictly targeted feedback in clean, well-structured markdown. Briefly explain:

1. **Why ${correctAnswer} is correct** — explain the reasoning clearly.
2. **Why the other options are incorrect** — briefly address each wrong option.

Formatting rules:
- Use **bold** for key terms and option letters.
- Use bullet points or numbered lists for clarity.
- For any math or calculations, write them as readable inline text using Unicode symbols (×, ÷, →, =, ≈, ≠). Example: "5,000 ÷ 2.5 = 2,000" instead of LaTeX.
- Do NOT use LaTeX syntax like \\frac, \\text, \\[, \\], or $$ at all.
- Keep it concise, direct, and encouraging.
- Do NOT provide a full model answer for the paper.
`;
        } else {
            prompt = `
You are an expert A-Level tutor.
The student answered Question ${questionNumber}. They chose Option ${userAnswer}.
There is no official answer key provided for this paper.

Here is the text extracted from the MCQ paper:
\`\`\`
${pdfText.substring(0, 80000)}
\`\`\`

Task:
Find Question ${questionNumber} in the text above.
First, determine the correct option (A, B, C, or D) for Question ${questionNumber}.
Then, provide strictly targeted feedback in clean, well-structured markdown:

1. **Which option is correct** and why.
2. **Why the other options are incorrect** — briefly address each, including the student's choice (${userAnswer}).

Formatting rules:
- Use **bold** for key terms and option letters.
- Use bullet points or numbered lists for clarity.
- For any math or calculations, write them as readable inline text using Unicode symbols (×, ÷, →, =, ≈, ≠). Example: "5,000 ÷ 2.5 = 2,000" instead of LaTeX.
- Do NOT use LaTeX syntax like \\frac, \\text, \\[, \\], or $$ at all.
- Keep it concise, direct, and clear.
- Do NOT provide a full model answer for the paper.
`;
        }

        const systemPrompt = "You are a helpful and concise tutor providing specific explanations for multiple choice questions. Always respond in clean, well-structured markdown. Never use LaTeX notation — use Unicode math symbols and plain text for calculations.";
        const feedback = await callLLM(prompt, null, 500, systemPrompt);

        return NextResponse.json({ feedback }, { status: 200 });

    } catch (e) {
        console.error('MCQ Feedback Error:', e);
        return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 });
    }
}
