// lib/rag.js
// RAG pipeline: PDF ingestion into Supabase pgvector + similarity retrieval

import OpenAI from 'openai';
import supabase from '@/lib/supabase';

// ── Fix 1: upgraded embedding model ─────────────────────────────────────────
// text-embedding-3-small: better quality, 5x cheaper than ada-002
// IMPORTANT: if you have existing ada-002 embeddings in Supabase, you must
// re-ingest your PDFs after this change (embeddings are not cross-compatible)
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 1536;

// ── Fix 2: larger chunks — enough to hold a complete concept ─────────────────
const CHUNK_SIZE = 1200;  // ~200 words, fits one full explanation
const CHUNK_OVERLAP = 200;   // enough overlap to not lose cross-boundary context

// ── Fix 3: minimum similarity threshold ─────────────────────────────────────
// Chunks below this score are irrelevant noise — don't inject them
const MIN_SIMILARITY = 0.72;

// ─── OpenAI client ───────────────────────────────────────────────────────────

export function getOpenAIClient() {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured.');
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ─── Embeddings ──────────────────────────────────────────────────────────────

async function generateEmbedding(text) {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text.trim(),
        dimensions: EMBEDDING_DIMS,
    });
    return response.data[0].embedding;
}

async function generateEmbeddingsBatch(texts) {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts.map(t => t.trim()),
        dimensions: EMBEDDING_DIMS,
    });
    return response.data
        .sort((a, b) => a.index - b.index)
        .map(d => d.embedding);
}

// ─── Text splitter ───────────────────────────────────────────────────────────
// Splits on sentence boundaries where possible to avoid cutting mid-thought

function splitText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
    // Normalise whitespace
    const cleaned = text.replace(/\s+/g, ' ').trim();
    const chunks = [];
    let start = 0;

    while (start < cleaned.length) {
        let end = Math.min(start + chunkSize, cleaned.length);

        // Try to end at a sentence boundary (. ! ?) rather than mid-word
        if (end < cleaned.length) {
            const boundary = cleaned.lastIndexOf('.', end);
            if (boundary > start + chunkSize * 0.6) {
                end = boundary + 1; // include the period
            }
        }

        const chunk = cleaned.slice(start, end).trim();
        if (chunk.length > 50) chunks.push(chunk); // skip tiny remnants
        start = end - overlap;
    }

    return chunks;
}

// ─── Fix 5: query expansion ──────────────────────────────────────────────────
// Expands short/vague queries so the embedding captures more relevant context
// This runs fast (no API call needed) — just prepends subject context

function expandQuery(query, subject, level) {
    const subjectMap = {
        economics: 'Economics',
        business: 'Business Studies',
        physics: 'Physics',
        chemistry: 'Chemistry',
        biology: 'Biology',
        history: 'History',
    };
    const levelMap = {
        alevel: 'Cambridge A-Level',
        igcse: 'Cambridge IGCSE',
    };

    const subjectLabel = subjectMap[subject?.toLowerCase()] || subject || '';
    const levelLabel = levelMap[level?.toLowerCase()] || level || '';

    // If query already mentions the subject/level, don't double-prefix
    const alreadyContextual = query.toLowerCase().includes('cambridge') ||
        query.toLowerCase().includes(subjectLabel.toLowerCase());

    if (alreadyContextual) return query;
    return `${levelLabel} ${subjectLabel}: ${query}`;
}

// ─── PDF Ingestion ────────────────────────────────────────────────────────────

/**
 * Ingest a PDF into Supabase pgvector.
 * @param {Buffer} fileBuffer
 * @param {{ subject, level, year, type, filename }} metadata
 * @returns {Promise<number>} Number of chunks inserted
 */
export async function ingestPDF(fileBuffer, metadata) {
    try {
        console.log(`[RAG] Ingesting: ${metadata.filename} (${fileBuffer.byteLength} bytes)`);
        const t0 = Date.now();

        const { extractText } = await import('unpdf');
        const { text } = await extractText(new Uint8Array(fileBuffer), { mergePages: true });

        if (!text?.trim()) throw new Error('PDF contains no extractable text.');
        console.log(`[RAG] Extracted ${text.length} chars in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

        const chunks = splitText(text);
        console.log(`[RAG] Split into ${chunks.length} chunks`);

        // Embed in batches of 500
        const rows = [];
        for (let i = 0; i < chunks.length; i += 500) {
            const batch = chunks.slice(i, i + 500);
            const embeddings = await generateEmbeddingsBatch(batch);
            for (let j = 0; j < batch.length; j++) {
                rows.push({
                    content: batch[j],
                    embedding: embeddings[j],
                    subject: metadata.subject,
                    level: metadata.level,
                    year: metadata.year ? parseInt(metadata.year, 10) : null,
                    type: metadata.type,
                    filename: metadata.filename,
                });
            }
        }

        // Insert into Supabase in batches of 200
        let inserted = 0;
        for (let i = 0; i < rows.length; i += 200) {
            const { error } = await supabase
                .from('document_chunks')
                .insert(rows.slice(i, i + 200));
            if (error) throw new Error(`Supabase insert error: ${error.message}`);
            inserted += Math.min(200, rows.length - i);
            console.log(`[RAG] Inserted ${inserted}/${rows.length} chunks`);
        }

        console.log(`[RAG] Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
        return inserted;

    } catch (err) {
        console.error('[RAG] Ingestion failed:', err);
        throw new Error(`PDF ingestion failed: ${err.message}`);
    }
}

// ─── Similarity Retrieval ─────────────────────────────────────────────────────

/**
 * Retrieve relevant chunks for a query.
 * @param {string} query       - Student question or search text
 * @param {string} subject     - e.g. 'economics'
 * @param {string} level       - e.g. 'alevel' or 'igcse'
 * @param {number} numResults  - Max chunks to return (default 4)
 * @returns {Promise<{ context: string, found: boolean, count: number }>}
 *   context: formatted text ready to inject into a prompt
 *   found:   false if nothing passed the similarity threshold
 *   count:   number of chunks actually returned
 */
export async function retrieveRelevantContent(query, subject, level, numResults = 4) {
    try {
        // Fix 5: expand query before embedding
        const expandedQuery = expandQuery(query, subject, level);
        const queryEmbedding = await generateEmbedding(expandedQuery);

        // Fetch more than needed so we can filter by threshold
        const fetchCount = numResults * 3;

        const { data, error } = await supabase.rpc('match_documents', {
            query_embedding: queryEmbedding,
            match_count: fetchCount,
            filter_subject: subject || null,
            filter_level: level || null,
        });

        if (error) throw new Error(`Supabase RPC error: ${error.message}`);
        if (!data?.length) return { context: '', found: false, count: 0 };

        // Fix 3: filter by minimum similarity score
        const relevant = data.filter(doc => doc.similarity >= MIN_SIMILARITY);
        if (!relevant.length) {
            console.log(`[RAG] No chunks above threshold ${MIN_SIMILARITY} for: "${query}"`);
            return { context: '', found: false, count: 0 };
        }

        // Fix 4: deduplicate near-identical chunks (same first 100 chars)
        const seen = new Set();
        const deduped = [];
        for (const doc of relevant) {
            const key = doc.content.slice(0, 100).toLowerCase().replace(/\s+/g, ' ');
            if (!seen.has(key)) {
                seen.add(key);
                deduped.push(doc);
            }
            if (deduped.length >= numResults) break;
        }

        // Fix 4: format with source labels so the AI knows where content is from
        const context = deduped
            .map((doc, i) => {
                const source = [doc.filename, doc.year, doc.type]
                    .filter(Boolean).join(' · ');
                return `[Source ${i + 1}${source ? `: ${source}` : ''}]\n${doc.content}`;
            })
            .join('\n\n---\n\n');

        console.log(`[RAG] Retrieved ${deduped.length} chunks (scores: ${deduped.map(d => d.similarity?.toFixed(2)).join(', ')})`);
        return { context, found: true, count: deduped.length };

    } catch (err) {
        console.error('[RAG] Retrieval failed:', err);
        // Return empty rather than crashing the whole request
        return { context: '', found: false, count: 0 };
    }
}