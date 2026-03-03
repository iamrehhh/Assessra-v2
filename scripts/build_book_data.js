/**
 * build_book_data.js
 * Extracts chapters from the Nexus PDF and writes data/book/nexus.json
 * Run: node scripts/build_book_data.js
 */
const { readFileSync, writeFileSync, mkdirSync } = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const PDF_PATH = path.join(__dirname, '..', 'public', 'Books',
    'Nexus A Brief History of Information Networks from the Stone Age to AI (Yuval Noah Harari) (z-library.sk, 1lib.sk, z-lib.sk).pdf');

const OUT_DIR = path.join(__dirname, '..', 'data', 'book');
const OUT_FILE = path.join(OUT_DIR, 'nexus.json');

// The chapter structure of Nexus (from table of contents analysis)
const CHAPTERS = [
    { id: 'prologue', title: 'Prologue', part: null },
    { id: 'chapter-1', title: 'Chapter 1: What Is Information?', part: 'Part I: Human Networks' },
    { id: 'chapter-2', title: 'Chapter 2: Stories: Unlimited Connections', part: 'Part I: Human Networks' },
    { id: 'chapter-3', title: 'Chapter 3: Documents: The Bite of the Paper Tigers', part: 'Part I: Human Networks' },
    { id: 'chapter-4', title: 'Chapter 4: Errors: The Fantasy of Infallibility', part: 'Part I: Human Networks' },
    { id: 'chapter-5', title: 'Chapter 5: Decisions: A Brief History of Democracy and Totalitarianism', part: 'Part I: Human Networks' },
    { id: 'chapter-6', title: 'Chapter 6: The New Members: How Computers Are Different from Printing Presses', part: 'Part II: The Inorganic Network' },
    { id: 'chapter-7', title: 'Chapter 7: Relentless: The Network Is Always On', part: 'Part II: The Inorganic Network' },
    { id: 'chapter-8', title: 'Chapter 8: Fallible: The Network Is Often Wrong', part: 'Part II: The Inorganic Network' },
    { id: 'chapter-9', title: 'Chapter 9: Democracies: Can We Still Hold a Conversation?', part: 'Part III: Computer Politics' },
    { id: 'chapter-10', title: 'Chapter 10: Totalitarianism: All Power to the Algorithms?', part: 'Part III: Computer Politics' },
    { id: 'chapter-11', title: 'Chapter 11: The Silicon Curtain: Global Empire or Global Split?', part: 'Part III: Computer Politics' },
    { id: 'epilogue', title: 'Epilogue', part: null },
];

// Markers to find in the text (search terms)
const CHAPTER_MARKERS = [
    'Prologue',
    'What Is Information?',
    'Stories: Unlimited Connections',
    'Documents: The Bite of the Paper Tigers',
    'Errors: The Fantasy of Infallibility',
    'Decisions: A Brief History of Democracy',
    'The New Members: How Computers Are Di',  // handles ff ligature
    'Relentless: The Network Is Always On',
    'Fallible: The Network Is Often Wrong',
    'Democracies: Can We Still Hold a Conversation',
    'Totalitarianism: All Power to the Algorithms',
    'The Silicon Curtain: Global Empire or Global Split',
    'Epilogue',
];

async function extractPages(pdfPath) {
    const data = new Uint8Array(readFileSync(pdfPath));
    const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
    const pages = [];

    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        pages.push(pageText);
    }

    return pages;
}

function cleanText(text) {
    return text
        .replace(/OceanofPDF\.com/g, '')
        .replace(/\s{3,}/g, '\n\n')   // multiple spaces -> paragraph breaks
        .replace(/fi /g, 'fi')         // fi ligature fix
        .replace(/ff /g, 'ff')         // ff ligature fix  
        .replace(/fl /g, 'fl')         // fl ligature fix
        .replace(/ {2,}/g, ' ')        // double spaces
        .trim();
}

function findChapterBoundaries(pages) {
    // We find the page index where each chapter starts
    // Skip front matter (first ~8 pages are title, copyright, TOC, dedication)
    const boundaries = [];

    for (let mi = 0; mi < CHAPTER_MARKERS.length; mi++) {
        const marker = CHAPTER_MARKERS[mi];
        let found = false;

        // Search pages, skipping front matter for prologue
        const startPage = mi === 0 ? 5 : (boundaries.length > 0 ? boundaries[boundaries.length - 1] : 5);

        for (let pi = startPage; pi < pages.length; pi++) {
            const pageText = pages[pi];
            if (pageText.includes(marker)) {
                // For prologue specifically, look for the actual prologue start, not TOC
                if (mi === 0 && pi < 8) {
                    // This is probably the TOC mention, keep looking
                    continue;
                }
                // For epilogue, skip the notes section
                if (mi === CHAPTER_MARKERS.length - 1) {
                    // The notes section has "EPILOGUE" as a heading too, check if this is the actual epilogue
                    if (pageText.length > 200 && !pageText.includes('BACK TO NOTE')) {
                        boundaries.push(pi);
                        found = true;
                        break;
                    }
                    continue;
                }
                boundaries.push(pi);
                found = true;
                break;
            }
        }

        if (!found) {
            console.warn(`WARNING: Could not find marker "${marker}"`);
            boundaries.push(-1);
        }
    }

    return boundaries;
}

async function main() {
    console.log('Extracting pages from PDF...');
    const pages = await extractPages(PDF_PATH);
    console.log(`Extracted ${pages.length} pages`);

    console.log('Finding chapter boundaries...');
    const boundaries = findChapterBoundaries(pages);

    console.log('\nChapter boundaries (page indices):');
    boundaries.forEach((b, i) => {
        console.log(`  ${CHAPTERS[i].title}: page ${b + 1}`);
    });

    // Find where notes/references start (to exclude them)
    let notesStart = pages.length;
    for (let i = Math.floor(pages.length * 0.7); i < pages.length; i++) {
        if (pages[i].includes('BACK TO NOTE REFERENCE') || pages[i].includes('PROLOGUE 1.')) {
            notesStart = i;
            break;
        }
    }
    console.log(`\nNotes section starts at page ${notesStart + 1}`);

    // Build chapter data
    const chaptersData = [];

    for (let i = 0; i < CHAPTERS.length; i++) {
        const startPage = boundaries[i];
        if (startPage === -1) {
            console.warn(`Skipping ${CHAPTERS[i].title} — boundary not found`);
            continue;
        }

        // End page is either the start of the next chapter or the notes section
        let endPage;
        if (i < CHAPTERS.length - 1 && boundaries[i + 1] !== -1) {
            endPage = boundaries[i + 1];
        } else {
            endPage = notesStart;
        }

        // Collect text from startPage to endPage (exclusive)
        let chapterText = '';
        for (let p = startPage; p < endPage; p++) {
            chapterText += pages[p] + '\n\n';
        }

        chapterText = cleanText(chapterText);

        // Remove part headers like "PART I  Human Networks" from the beginning
        chapterText = chapterText.replace(/^PART\s+[IVXLC]+\s+.+?\n+/i, '');

        chaptersData.push({
            id: CHAPTERS[i].id,
            title: CHAPTERS[i].title,
            part: CHAPTERS[i].part,
            content: chapterText,
            charCount: chapterText.length,
        });

        console.log(`  ${CHAPTERS[i].title}: ${chapterText.length} chars (pages ${startPage + 1}–${endPage})`);
    }

    // Write output
    mkdirSync(OUT_DIR, { recursive: true });

    const output = {
        bookTitle: 'Nexus: A Brief History of Information Networks from the Stone Age to AI',
        author: 'Yuval Noah Harari',
        year: 2024,
        totalChapters: chaptersData.length,
        chapters: chaptersData,
    };

    writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\nWrote ${chaptersData.length} chapters to ${OUT_FILE}`);
    console.log(`Total size: ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
