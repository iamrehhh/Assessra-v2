// Webpack/Turbopack workaround: dynamically load PDF.js below

/**
 * Split text into overlapping chunks of a given size.
 * @param {string} text - Full document text.
 * @param {number} chunkSize - Max characters per chunk.
 * @param {number} overlap - Overlap characters between chunks.
 * @returns {string[]} Array of text chunks.
 */
export function splitText(text, chunkSize = 500, overlap = 100) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end));
        start += chunkSize - overlap;
    }
    return chunks;
}

/**
 * Extract text from a PDF File object in the browser.
 * @param {File} file - The PDF File object from a file input.
 * @returns {Promise<string>} - The extracted full text of the PDF.
 */
export async function extractTextFromPDF(file) {
    // Use legacy build which sometimes skips canvas require in Next 15+
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');

    // Set the worker URL dynamically to the CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + ' \n';
    }

    return fullText;
}
