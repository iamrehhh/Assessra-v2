import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');

        if (!filename) {
            return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
        }

        // 1. Get the paper's metadata
        const { data: docData, error: docError } = await supabase
            .from('document_chunks')
            .select('subject, level, year')
            .eq('filename', filename)
            .limit(1);

        if (docError) throw docError;

        let insertFilename = null;

        if (docData && docData.length > 0) {
            const meta = docData[0];

            // 2. Try to find a matching insert
            const { data: insertData } = await supabase
                .from('document_chunks')
                .select('filename')
                .eq('type', 'insert')
                .eq('subject', meta.subject)
                .eq('level', meta.level)
                .eq('year', meta.year || '0')
                .limit(1);

            if (insertData && insertData.length > 0) {
                insertFilename = insertData[0].filename;
            }
        }

        // 3. Construct the public pdf URLs manually using the base URL
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const bucketPath = `${baseUrl}/storage/v1/object/public/past_papers`;

        return NextResponse.json({
            pdfUrl: `${bucketPath}/${filename}`,
            insertFilename: insertFilename,
            insertUrl: insertFilename ? `${bucketPath}/${insertFilename}` : null,
        });

    } catch (err) {
        console.error('API /past-papers/info error:', err);
        return NextResponse.json({ error: 'Failed to fetch paper info' }, { status: 500 });
    }
}
