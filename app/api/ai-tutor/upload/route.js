import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

// Use Edge / Node environment config if needed, but standard NextResponse logic handles formData
export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract text from the PDF
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
