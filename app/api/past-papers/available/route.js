import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET() {
    try {
        // Fetch all chunks but only the metadata we need. 
        // Note: For a very large dataset, a dedicated "documents" metadata table or a Supabase RPC for "distinct" is better,
        // but this works for now given the RAG ingestion design.
        const { data, error } = await supabase
            .from('document_chunks')
            .select('filename, subject, level, year, type');

        if (error) throw error;

        // Filter out textbooks, we only want past papers, inserts, and markschemes
        const validDocs = data.filter(d => ['paper', 'insert', 'markscheme'].includes(d.type));

        // Deduplicate based on filename since chunks belonging to the same file share the same metadata
        const uniqueDocsMap = new Map();
        validDocs.forEach(doc => {
            if (!uniqueDocsMap.has(doc.filename)) {
                uniqueDocsMap.set(doc.filename, {
                    filename: doc.filename,
                    subject: doc.subject,
                    level: doc.level,
                    year: doc.year,
                    type: doc.type
                });
            }
        });

        const uniqueDocs = Array.from(uniqueDocsMap.values());

        // Grouping
        const levels = [...new Set(uniqueDocs.map(d => d.level))];
        const subjectsByLevel = {};
        
        levels.forEach(l => {
            subjectsByLevel[l] = [...new Set(uniqueDocs.filter(d => d.level === l).map(d => d.subject))];
        });

        return NextResponse.json({
            success: true,
            levels,
            subjectsByLevel,
            documents: uniqueDocs
        });
        
    } catch (err) {
        console.error('Error fetching available past papers:', err);
        return NextResponse.json({ error: 'Failed to fetch available past papers' }, { status: 500 });
    }
}
