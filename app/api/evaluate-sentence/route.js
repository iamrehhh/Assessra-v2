import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request) {
    try {
        const { sentence, term, meaning } = await request.json();

        if (!sentence || !term || !meaning) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            You are an expert English teacher. A student has written a sentence to practice a specific word or idiom they struggled with.
            
            Term: "${term}"
            Meaning: "${meaning}"
            Student's Sentence: "${sentence}"
            
            Evaluate if the student used the term correctly in their sentence, demonstrating an understanding of its meaning.
            Return a JSON object with two fields:
            1. "correct": A boolean (true if the usage is correct and natural, false if it is incorrect, nonsensical, or grammatically poor).
            2. "feedback": A short, encouraging string explaining why it's right, or how to fix it if it's wrong.
            
            Return ONLY valid JSON with no markdown formatting.
            {
                "correct": true,
                "feedback": "Great job! You used it accurately."
            }
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        let cleanedText = responseText;
        if (cleanedText.startsWith('\`\`\`json')) {
            cleanedText = cleanedText.replace(/^\`\`\`json\\s*/, '').replace(/\\s*\`\`\`$/, '');
        }

        const parsedData = JSON.parse(cleanedText);

        return NextResponse.json(parsedData);

    } catch (error) {
        console.error("Error generating sentence evaluation:", error);
        return NextResponse.json({ error: "Failed to evaluate sentence" }, { status: 500 });
    }
}
