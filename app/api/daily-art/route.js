import { NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';

export const revalidate = 86400; // Cache for 24 hours

export async function GET() {
    try {
        // Deterministically pick a page to get a different art piece daily based on the day of the year
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        // Use the day of year to determine an offset (there are thousands of results, we just shift through them)
        const limit = 20;
        const page = (dayOfYear % 100) + 1;

        const res = await fetch(`https://api.artic.edu/api/v1/artworks/search?q=impressionism&query[term][is_public_domain]=true&fields=id,title,image_id,artist_title,date_display&limit=${limit}&page=${page}`, { next: { revalidate: 86400 } });
        const data = await res.json();

        if (!data || !data.data || data.data.length === 0) {
            return NextResponse.json({ error: 'Failed to fetch artwork from API' }, { status: 500 });
        }

        // Pick one artwork from the page array based on the day to ensure consistency across reloads that day
        const artIndex = dayOfYear % data.data.length;
        const artwork = data.data[artIndex];

        // Format the image URL
        const imageUrl = `https://www.artic.edu/iiif/2/${artwork.image_id}/full/843,/0/default.jpg`;

        // Have the AI generate a brief profound quote related to the artwork
        const prompt = `You are a museum curator creating a daily moment of inspiration for students using a learning application.
Look at the metadata for this artwork:
Title: "${artwork.title}"
Date: ${artwork.date_display}
Artist: ${artwork.artist_title || 'Unknown Artist'}

Write a profound, very short, 2-sentence poetic observation or reflection linking this artwork's theme to the pursuit of knowledge, perseverance, or life's journey.
Do NOT use quotes. Keep it extremely concise, elegant, and perfectly suited for a daily widget.`;

        let aiQuote = '';
        try {
            // Using a fast model for text generation
            aiQuote = await callLLM(prompt, 'general', 100, null, 'gpt-4o-mini');
        } catch (llmErr) {
            console.error('LLM error fetching art quote:', llmErr);
            aiQuote = "Art washes away from the soul the dust of everyday life. Perseverance paints the canvas of our future.";
        }

        return NextResponse.json({
            title: artwork.title,
            artist: artwork.artist_title || 'Unknown Artist',
            date: artwork.date_display,
            imageUrl: imageUrl,
            curatorNote: aiQuote.trim()
        });

    } catch (err) {
        console.error('API /daily-art error:', err);
        return NextResponse.json({ error: 'Failed to generate vintage art' }, { status: 500 });
    }
}
