import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { callLLM } from '@/lib/llm';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

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

        const dataBuffer = fs.readFileSync(safePath);
        const data = await pdfParse(dataBuffer);
        const pdfText = data.text;

        let prompt = '';
        if (correctAnswer) {
            prompt = `
You are an expert A-Level tutor.
The student answered Question ${questionNumber}.
They chose Option ${userAnswer}, and the official correct answer is Option ${correctAnswer}.

Here is the text extracted from the MCQ paper (find Question ${questionNumber}):
\`\`\`
${pdfText.substring(0, 15000)}
\`\`\`

Task:
Provide strictly targeted feedback. Briefly explain:
1. Why ${correctAnswer} is the correct option.
2. Why the other options (including the student's choice, if different) are incorrect.

Do NOT provide a full model answer for the paper. Be concise, direct, and encouraging.
`;
        } else {
            prompt = `
You are an expert A-Level tutor.
The student answered Question ${questionNumber}. They chose Option ${userAnswer}.
There is no official answer key provided for this paper.

Here is the text extracted from the MCQ paper (find Question ${questionNumber}):
\`\`\`
${pdfText.substring(0, 15000)}
\`\`\`

Task:
First, determine the correct option (A, B, C, or D) for Question ${questionNumber} based on the text.
Then, provide strictly targeted feedback explaining:
1. Which option is correct and why it is correct.
2. Why the other options, including the student's choice (${userAnswer}), are incorrect.

Do NOT provide a full model answer for the paper. Be concise, direct, and clear.
`;
        }

        const systemPrompt = "You are a helpful and concise tutor providing specific explanations and solutions for multiple choice questions.";
        const feedback = await callLLM(prompt, null, 350, systemPrompt);

        return NextResponse.json({ feedback }, { status: 200 });

    } catch (e) {
        console.error('MCQ Feedback Error:', e);
        return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 });
    }
}
