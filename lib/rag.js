// lib/rag.js
// RAG pipeline: PDF ingestion into Supabase pgvector + similarity retrieval

import OpenAI from 'openai';
import supabase from '@/lib/supabase';

// ─── OpenAI client for embeddings ───────────────────────────────────────────

function getOpenAIClient() {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured.');
    }
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ─── Generate embedding vector ─────────────────────────────────────────────

/**
 * Generate a 1536-dimensional embedding for the given text.
 * @param {string} text - The text to embed.
 * @returns {Promise<number[]>} Embedding vector.
 */
async function generateEmbedding(text) {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
    });
    const embedding = response.data[0].embedding;

    // ada-002 always returns 1536 dimensions, but validate just in case
    if (embedding.length !== 1536) {
        throw new Error(`Embedding returned ${embedding.length} dimensions instead of 1536. Model: ${response.model}`);
    }

    return embedding;
}

/**
 * Generate 1536-dimensional embeddings for a batch of texts.
 * @param {string[]} texts - Array of texts to embed.
 * @returns {Promise<number[][]>} Array of embedding vectors.
 */
async function generateEmbeddingsBatch(texts) {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: texts,
    });
    // Ensure the order matches the input
    const sortedData = response.data.sort((a, b) => a.index - b.index);
    return sortedData.map(d => d.embedding);
}

// ─── Simple text splitter (no LangChain dependency) ─────────────────────────

/**
 * Split text into overlapping chunks of a given size.
 * @param {string} text - Full document text.
 * @param {number} chunkSize - Max characters per chunk.
 * @param {number} overlap - Overlap characters between chunks.
 * @returns {string[]} Array of text chunks.
 */
function splitText(text, chunkSize = 500, overlap = 100) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end));
        start += chunkSize - overlap;
    }
    return chunks;
}

// ─── PDF Ingestion ──────────────────────────────────────────────────────────

/**
 * Ingest a PDF: parse buffer, split into chunks, embed, and store in Supabase.
 * @param {Buffer} fileBuffer - The PDF file as a Buffer.
 * @param {object} metadata - { subject, level, year, type, filename }
 * @returns {Promise<number>} Number of chunks inserted.
 */
export async function ingestPDF(fileBuffer, metadata) {
    try {
        console.log(`[RAG] Starting ingestion for ${metadata.filename} (${fileBuffer.byteLength} bytes)`);
        const startTime = Date.now();

        // Use unpdf — designed for serverless, no DOMMatrix/workers needed
        const { extractText } = await import('unpdf');

        const uint8Array = new Uint8Array(fileBuffer);
        const { text } = await extractText(uint8Array, { mergePages: true });

        console.log(`[RAG] Extracted text: ${text.length} characters in ${(Date.now() - startTime) / 1000}s`);

        if (!text || text.trim().length === 0) {
            throw new Error('PDF appears to be empty or contains no extractable text.');
        }

        // Split text into chunks of 500 chars with 100 char overlap
        const chunks = splitText(text, 500, 100);

        // Generate embeddings and build rows for insertion in chunks of 500
        const rows = [];
        const embedBatchSize = 500;

        for (let i = 0; i < chunks.length; i += embedBatchSize) {
            const chunkBatch = chunks.slice(i, i + embedBatchSize);
            const embeddings = await generateEmbeddingsBatch(chunkBatch);

            for (let j = 0; j < chunkBatch.length; j++) {
                rows.push({
                    content: chunkBatch[j],
                    embedding: embeddings[j],
                    subject: metadata.subject,
                    level: metadata.level,
                    year: metadata.year ? parseInt(metadata.year, 10) : null,
                    type: metadata.type,
                    filename: metadata.filename,
                });
            }
        }

        // Batch insert into Supabase (increased to 200 per batch for faster saves)
        const batchSize = 200;
        let inserted = 0;
        console.log(`[RAG] Generated ${rows.length} embedding rows. Starting Supabase insert...`);

        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const { error } = await supabase
                .from('document_chunks')
                .insert(batch);

            if (error) {
                console.error(`[RAG] Supabase insert error at batch ${i}:`, error.message);
                throw new Error(`Supabase insert error: ${error.message}`);
            }
            inserted += batch.length;
            console.log(`[RAG] Inserted ${inserted}/${rows.length} rows into Supabase so far...`);
        }

        console.log(`[RAG] Finished ingesting ${metadata.filename} entirely in ${(Date.now() - startTime) / 1000}s`);
        return inserted;
    } catch (error) {
        console.error('Error ingesting PDF:', error);
        throw new Error(`PDF ingestion failed: ${error.message}`);
    }
}

// ─── Similarity Retrieval ───────────────────────────────────────────────────

/**
 * Retrieve the most relevant document chunks for a given query.
 * @param {string} query - The search query text.
 * @param {string} subject - Subject filter (e.g. 'economics').
 * @param {string} level - Level filter (e.g. 'igcse' or 'alevel').
 * @param {number} numResults - Number of results to return.
 * @returns {Promise<string>} Combined text of the top matching chunks.
 */
export async function retrieveRelevantContent(query, subject, level, numResults = 4) {
    try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query);

        // Call the match_documents Supabase RPC function
        const { data, error } = await supabase.rpc('match_documents', {
            query_embedding: queryEmbedding,
            match_count: numResults,
            filter_subject: subject || null,
            filter_level: level || null,
        });

        if (error) {
            throw new Error(`Supabase RPC error: ${error.message}`);
        }

        if (!data || data.length === 0) {
            return '';
        }

        // Combine the content of all matched chunks
        return data.map((doc) => doc.content).join('\n\n---\n\n');
    } catch (error) {
        console.error('Error retrieving content:', error);
        throw new Error(`Content retrieval failed: ${error.message}`);
    }
}
