import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Enforce 5 MB max to prevent token explosion
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum size is 5 MB.' }, { status: 413 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Dynamic require to avoid Turbopack ESM/CJS conflict
        const pdfParse = (await import('pdf-parse')).default;
        const pdfData = await pdfParse(buffer);
        const text = pdfData.text;

        // Optionally, truncate the text if it's too large to prevent token explosion.
        // We'll trust the client side slicing but returning up to 50k chars is safe.
        const safeText = text.substring(0, 50000);

        return NextResponse.json({ text: safeText });
    } catch (error) {
        console.error('Error parsing PDF:', error);
        return NextResponse.json({ error: 'Failed to extract text from PDF' }, { status: 500 });
    }
}
