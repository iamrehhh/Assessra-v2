'use server'

import { getOpenAIClient } from '@/lib/rag'; // We'll need to export this or recreate it
import supabase from '@/lib/supabase';
import OpenAI from 'openai';

// Exported from rag.js or redefined here
function getOpenAIClientSetup() {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured.');
    }
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function generateEmbeddingsBatch(texts) {
    const openai = getOpenAIClientSetup();
    const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: texts,
    });
    const sortedData = response.data.sort((a, b) => a.index - b.index);
    return sortedData.map(d => d.embedding);
}

export async function embedAction(chunks, metadata, adminSecret, isFirstBatch) {
    try {
        if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
            return { error: 'Unauthorized. Invalid or missing ADMIN_SECRET.' };
        }

        if (!chunks || chunks.length === 0) {
            return { success: true, inserted: 0 };
        }

        // If it's the very first batch, we should clear out any existing document chunks for this filename
        // This acts as the duplicate detection replacement
        if (isFirstBatch) {
            const { data: existing } = await supabase
                .from('document_chunks')
                .select('id')
                .eq('filename', metadata.filename)
                .limit(1);

            if (existing && existing.length > 0) {
                await supabase
                    .from('document_chunks')
                    .delete()
                    .eq('filename', metadata.filename);
                // Can log or return that we replaced it
            }
        }

        // Generate embeddings for the batch
        const embeddings = await generateEmbeddingsBatch(chunks);

        const rows = chunks.map((chunk, index) => ({
            content: chunk,
            embedding: embeddings[index],
            subject: metadata.subject,
            level: metadata.level,
            year: metadata.year ? parseInt(metadata.year, 10) : null,
            type: metadata.type,
            filename: metadata.filename,
        }));

        // Insert into Supabase
        const { error } = await supabase
            .from('document_chunks')
            .insert(rows);

        if (error) {
            throw new Error(`Supabase insert error: ${error.message}`);
        }

        return {
            success: true,
            inserted: rows.length
        };

    } catch (err) {
        console.error('Embed Action error:', err);
        return { error: err.message || 'Embedding batch failed.' };
    }
}
