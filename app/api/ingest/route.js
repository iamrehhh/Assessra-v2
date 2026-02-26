// app/api/ingest/route.js
// POST endpoint to upload and ingest a PDF into the vector store.
// Admin-only: requires ADMIN_SECRET header.

import { NextResponse } from 'next/server';
import { ingestPDF } from '@/lib/rag';

export async function POST(request) {
    try {
        // ── Admin auth check ────────────────────────────────────────────
        const adminSecret = request.headers.get('x-admin-secret');
        if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
            return NextResponse.json(
                { error: 'Unauthorized. Invalid or missing ADMIN_SECRET.' },
                { status: 401 }
            );
        }

        // ── Parse multipart form data ───────────────────────────────────
        const formData = await request.formData();
        const file = formData.get('file');
        const subject = formData.get('subject');
        const level = formData.get('level');
        const year = formData.get('year');
        const type = formData.get('type'); // 'paper' or 'markscheme'

        if (!file || !subject || !level) {
            return NextResponse.json(
                { error: 'Missing required fields: file, subject, level.' },
                { status: 400 }
            );
        }

        // Validate file is a PDF
        if (!file.name.endsWith('.pdf')) {
            return NextResponse.json(
                { error: 'Only PDF files are accepted.' },
                { status: 400 }
            );
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

        const chunks = await ingestPDF(buffer, metadata);

        return NextResponse.json({
            success: true,
            chunks,
            filename: file.name,
        });
    } catch (err) {
        console.error('Ingest API error:', err);
        return NextResponse.json(
            { error: 'PDF ingestion failed.', detail: err.message },
            { status: 500 }
        );
    }
}
