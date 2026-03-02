import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request) {
    try {
        const { term, type, meaning } = await request.json();

        if (!term || !type || !meaning) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            You are an expert English language tutor. Your task is to provide exactly 1 contextual example sentence and exactly 2 or 3 common synonyms for the given ${type}.
            
            Term (${type}): "${term}"
            Meaning: "${meaning}"
            
            Return ONLY a valid JSON object in the following format, with no markdown formatting, no code blocks, and no extra text:
            {
                "example": "A clear, natural sentence demonstrating how the term is used in everyday context.",
                "synonyms": ["synonym1", "synonym2"]
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
        console.error("Error generating vocab/idiom context:", error);
        return NextResponse.json({ error: "Failed to generate context" }, { status: 500 });
    }
}
