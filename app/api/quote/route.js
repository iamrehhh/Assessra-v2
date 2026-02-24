import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import OpenAI from 'openai';

// GET /api/quote
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ quote: "Knowledge is power." }, { status: 200 });
        }

        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const themes = [
            'Humorous',
            'Serious',
            'Motivating',
            'Romantic',
            'Little erotic but tasteful',
            'Jovial',
            'Philosophical'
        ];

        const randomTheme = themes[Math.floor(Math.random() * themes.length)];

        const promptText = `
Generate a single, short, impactful quote (1-2 sentences max) to display on the dashboard of an academic learning platform called Assessra.
The user is a student. 
The tone of the quote must be: ${randomTheme}.
Make sure it is heavily inclined towards academics, studying, or intellectual growth, even if the tone is humorous, romantic, or erotic. 
Do not include quotation marks in your output. Just return the raw text of the quote.
`;

        const completion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a creative writer generating quotes for a student learning portal.' },
                { role: 'user', content: promptText },
            ],
            temperature: 0.9,
            max_tokens: 60,
        });

        const quoteText = completion.choices[0].message.content.trim().replace(/^"|"$/g, '');

        return NextResponse.json({ quote: quoteText }, { status: 200 });

    } catch (e) {
        console.error('AI Quote API Error:', e);
        return NextResponse.json({ quote: "Knowledge is power, but imagination is everything." }, { status: 200 });
    }
}
