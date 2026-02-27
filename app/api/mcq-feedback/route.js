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

        if (!pdfPath || !questionNumber || !userAnswer || !correctAnswer) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const safePath = path.join(process.cwd(), 'public', pdfPath);
        if (!fs.existsSync(safePath)) {
            return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
        }

        const dataBuffer = fs.readFileSync(safePath);
        const data = await pdfParse(dataBuffer);
        const pdfText = data.text;

        const prompt = `
You are an expert A-Level Economics tutor.
The student answered Question ${questionNumber} incorrectly.
They chose Option ${userAnswer}, but the correct answer is Option ${correctAnswer}.

Here is the text extracted from the MCQ paper (find Question ${questionNumber}):
\`\`\`
${pdfText.substring(0, 15000)} // Limiting text to avoid token bloat
\`\`\`

Task:
Provide strictly targeted feedback. Briefly explain:
1. Why ${correctAnswer} is the correct option.
2. Why the student's choice, ${userAnswer}, is incorrect.

Do NOT provide a full model answer for the paper. Be concise, direct, and encouraging.
`;

        const systemPrompt = "You are a helpful and concise Economics tutor providing specific feedback on multiple choice questions.";
        const feedback = await callLLM(prompt, null, 150, systemPrompt);

        return NextResponse.json({ feedback }, { status: 200 });

    } catch (e) {
        console.error('MCQ Feedback Error:', e);
        return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 });
    }
}
