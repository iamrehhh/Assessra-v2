// lib/diagram.js
// DALL-E 3 diagram generation for exam-style questions.

import OpenAI from 'openai';

/**
 * Generate an exam-style diagram using DALL-E 3.
 * @param {string} description - Plain text description of the diagram to generate.
 * @returns {Promise<string>} Base64 data URL of the generated image.
 */
export async function generateDiagram(description) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured.');
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const styledPrompt = `Create a clean, professional exam-style diagram for a Cambridge IGCSE/A Level question paper. The diagram should be:
- Black lines on a clean white background
- Clearly labelled with proper axis titles, labels, and annotations
- Simple and precise, like a printed textbook diagram
- No decorative elements, no gradients, no 3D effects
- Use standard academic notation and formatting

Diagram to create: ${description}`;

    const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: styledPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'b64_json',
    });

    const base64 = response.data[0].b64_json;
    return `data:image/png;base64,${base64}`;
}
