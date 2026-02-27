import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import path from 'path';
import fs from 'fs';

// Helper to recursively find a file in a directory
const findFileRecursively = (dir, targetFilename) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(findFileRecursively(file, targetFilename));
        } else {
            if (path.basename(file) === targetFilename) {
                results.push(file);
            }
        }
    });
    return results;
};

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

        // 3. Construct the local public pdf URLs
        // We will host them in public/past_papers/
        // Since the user is organizing them into nested folders, we need to find the specific path
        const publicDir = path.join(process.cwd(), 'public');
        const pastPapersDir = path.join(publicDir, 'past_papers');

        let finalPdfUrl = null;
        let finalInsertUrl = null;

        if (fs.existsSync(pastPapersDir)) {
            // Find the main paper
            const paperMatches = findFileRecursively(pastPapersDir, filename);
            if (paperMatches.length > 0) {
                // Convert absolute path to relative public path
                finalPdfUrl = paperMatches[0].replace(publicDir, '');
            }

            // Find the insert if it exists
            if (insertFilename) {
                const insertMatches = findFileRecursively(pastPapersDir, insertFilename);
                if (insertMatches.length > 0) {
                    finalInsertUrl = insertMatches[0].replace(publicDir, '');
                }
            }
        }

        // If not found locally, fallback to a best guess or return 404 URL
        if (!finalPdfUrl) {
            finalPdfUrl = `/past_papers/${filename}`; // fallback just in case
        }

        return NextResponse.json({
            pdfUrl: finalPdfUrl,
            insertFilename: insertFilename,
            insertUrl: finalInsertUrl,
        });

    } catch (err) {
        console.error('API /past-papers/info error:', err);
        return NextResponse.json({ error: 'Failed to fetch paper info' }, { status: 500 });
    }
}
