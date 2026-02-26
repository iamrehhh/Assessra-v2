'use server'

import { ingestPDF } from '@/lib/rag';
import supabase from '@/lib/supabase';


export async function ingestAction(formData) {
    try {
        // ── Admin auth check ────────────────────────────────────────────
        const adminSecret = formData.get('adminSecret');
        if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
            return { error: 'Unauthorized. Invalid or missing ADMIN_SECRET.' };
        }

        // ── Parse multipart form data ───────────────────────────────────
        const file = formData.get('file');
        const subject = formData.get('subject');
        const level = formData.get('level');
        const year = formData.get('year');
        const type = formData.get('type'); // 'paper', 'markscheme', 'textbook'

        if (!file || !subject || !level) {
            return { error: 'Missing required fields: file, subject, level.' };
        }

        // Validate file is a PDF
        if (!file.name.endsWith('.pdf')) {
            return { error: 'Only PDF files are accepted.' };
        }

        // ── Convert to buffer and ingest directly ───────────────────────
        const buffer = Buffer.from(await file.arrayBuffer());

        const metadata = {
            subject,
            level,
            year: year || null,
            type: type || 'paper',
            filename: file.name,
        };

        // ── Duplicate detection: remove old chunks if same file was uploaded before ──
        const { data: existing } = await supabase
            .from('document_chunks')
            .select('id')
            .eq('filename', file.name)
            .limit(1);

        let replaced = false;
        if (existing && existing.length > 0) {
            await supabase
                .from('document_chunks')
                .delete()
                .eq('filename', file.name);
            replaced = true;
        }

        const chunks = await ingestPDF(buffer, metadata);

        return {
            success: true,
            chunks,
            filename: file.name,
            replaced,
        };
    } catch (err) {
        console.error('Ingest Action error:', err);
        return { error: err.message || 'PDF ingestion failed.' };
    }
}
