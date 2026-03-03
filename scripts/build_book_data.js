/**
 * build_book_data.js — v3
 * Two-pass extraction: simple for boundary detection, smart for content.
 * Heavy post-processing to fix PDF extraction artifacts.
 * Run: node scripts/build_book_data.js
 */
const { readFileSync, writeFileSync, mkdirSync } = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const PDF_PATH = path.join(__dirname, '..', 'public', 'Books',
    'Nexus A Brief History of Information Networks from the Stone Age to AI (Yuval Noah Harari) (z-library.sk, 1lib.sk, z-lib.sk).pdf');

const OUT_DIR = path.join(__dirname, '..', 'data', 'book');
const OUT_FILE = path.join(OUT_DIR, 'nexus.json');

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

const CHAPTER_MARKERS = [
    'Prologue',
    'What Is Information?',
    'Stories: Unlimited Connections',
    'Documents: The Bite of the Paper Tigers',
    'Errors: The Fantasy of Infallibility',
    'Decisions: A Brief History of Democracy',
    'The New Members: How Computers Are Di',
    'Relentless: The Network Is Always On',
    'Fallible: The Network Is Often Wrong',
    'Democracies: Can We Still Hold a Conversation',
    'Totalitarianism: All Power to the Algorithms',
    'The Silicon Curtain: Global Empire or Global Split',
    'Epilogue',
];

// Simple extraction for boundary detection
async function extractPagesSimple(doc) {
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => item.str).join(' '));
    }
    return pages;
}

// Smart extraction: uses font size and Y-gaps to detect paragraphs
async function extractPageSmart(doc, pageNum) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    // Collect items with their positions
    const items = content.items
        .filter(item => item.str && item.str.trim())
        .map(item => ({
            str: item.str,
            x: item.transform[4],
            y: Math.round(item.transform[5] * 10) / 10, // round to 1 decimal
            fontSize: Math.round(item.transform[0]),
            width: item.width || 0,
        }));

    if (items.length === 0) return '';

    // Group by Y coordinate (same line)
    const lineMap = new Map();
    for (const item of items) {
        // Group items within 2px of each other on same line
        let lineY = null;
        for (const key of lineMap.keys()) {
            if (Math.abs(key - item.y) <= 2) { lineY = key; break; }
        }
        if (lineY === null) lineY = item.y;
        if (!lineMap.has(lineY)) lineMap.set(lineY, []);
        lineMap.get(lineY).push(item);
    }

    // Sort lines by Y descending (PDF Y goes bottom-to-top)
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

    const lines = [];
    let prevY = null;
    let prevFontSize = null;

    for (const y of sortedYs) {
        const lineItems = lineMap.get(y).sort((a, b) => a.x - b.x);
        const lineText = lineItems.map(i => i.str).join(' ').trim();
        const fontSize = lineItems[0].fontSize;

        if (!lineText) continue;

        // Detect paragraph breaks based on gap
        if (prevY !== null) {
            const gap = Math.abs(prevY - y);
            const lineHeight = prevFontSize || 12;
            // If gap > 1.5x line height, its a new paragraph
            if (gap > lineHeight * 1.6) {
                lines.push(''); // Empty line = paragraph break
            }
        }

        lines.push(lineText);
        prevY = y;
        prevFontSize = fontSize;
    }

    return lines.join('\n');
}

// === Text Cleaning ===

function fixLigatures(text) {
    let r = text;

    // Common ligature-split patterns with surrounding context
    // "fi " followed by lowercase = ligature break (e.g., "offi cial", "arti ficial")
    // But we need to be careful not to join "fi rst" into "first" incorrectly
    // Strategy: apply iteratively and use word-boundary awareness

    // Handle specific common broken words first
    const ligatureWords = [
        // fi ligature
        ['de fi ne', 'define'], ['de fi ned', 'defined'], ['de fi ning', 'defining'], ['de fi nition', 'definition'],
        ['de fi nite', 'definite'], ['de fi nitely', 'definitely'], ['de fi ant', 'defiant'], ['de fi ance', 'defiance'],
        ['offi ce', 'office'], ['offi cial', 'official'], ['offi cials', 'officials'], ['offi cer', 'officer'],
        ['offi cially', 'officially'], ['unoffi cial', 'unofficial'],
        ['arti fi cial', 'artificial'], ['arti fi cially', 'artificially'],
        ['signi fi cant', 'significant'], ['signi fi cantly', 'significantly'], ['signi fi cance', 'significance'],
        ['speci fi c', 'specific'], ['speci fi cally', 'specifically'], ['speci fi ed', 'specified'],
        ['identi fi ed', 'identified'], ['identi fi cation', 'identification'], ['identi fi es', 'identifies'],
        ['classi fi ed', 'classified'], ['classi fi cation', 'classification'],
        ['justi fi ed', 'justified'], ['justi fi cation', 'justification'],
        ['magni fi cent', 'magnificent'],
        ['bene fi t', 'benefit'], ['bene fi ts', 'benefits'], ['bene fi cial', 'beneficial'],
        ['sacri fi ce', 'sacrifice'], ['sacri fi ced', 'sacrificed'],
        ['certi fi cate', 'certificate'],
        ['fi nd', 'find'], ['fi nds', 'finds'], ['fi nding', 'finding'], ['fi ndings', 'findings'],
        ['fi rst', 'first'], ['fi re', 'fire'], ['fi red', 'fired'], ['fi res', 'fires'],
        ['fi ght', 'fight'], ['fi ghting', 'fighting'], ['fi ghts', 'fights'],
        ['fi ll', 'fill'], ['fi lled', 'filled'], ['fi lling', 'filling'],
        ['fi eld', 'field'], ['fi elds', 'fields'],
        ['fi le', 'file'], ['fi les', 'files'], ['fi led', 'filed'],
        ['fi lm', 'film'], ['fi lms', 'films'],
        ['fi nal', 'final'], ['fi nally', 'finally'], ['fi nale', 'finale'],
        ['fi ne', 'fine'], ['fi ner', 'finer'], ['fi nest', 'finest'],
        ['fi nish', 'finish'], ['fi nished', 'finished'],
        ['fi rm', 'firm'], ['fi rmly', 'firmly'], ['fi rms', 'firms'],
        ['fi gure', 'figure'], ['fi gures', 'figures'], ['fi gured', 'figured'],
        ['fi ction', 'fiction'], ['fi ctional', 'fictional'],
        ['fi nger', 'finger'], ['fi ngers', 'fingers'],
        ['fi xed', 'fixed'], ['fi x', 'fix'],
        ['fi ve', 'five'],
        ['fi t', 'fit'], ['fi ts', 'fits'], ['fi tted', 'fitted'], ['fi tting', 'fitting'],
        ['con fi rm', 'confirm'], ['con fi rmed', 'confirmed'], ['con fi rms', 'confirms'],
        ['con fi dence', 'confidence'], ['con fi dent', 'confident'],
        ['con fi ne', 'confine'], ['con fi ned', 'confined'], ['con fi nes', 'confines'],
        ['con fi guration', 'configuration'],
        ['pro fi le', 'profile'], ['pro fi les', 'profiles'],
        ['pro fi t', 'profit'], ['pro fi ts', 'profits'], ['pro fi table', 'profitable'],
        ['suf fi cient', 'sufficient'], ['insuf fi cient', 'insufficient'],
        ['ef fi cient', 'efficient'], ['ef fi ciency', 'efficiency'],
        ['forti fi ed', 'fortified'], ['forti fi cation', 'fortification'],
        ['puri fi ed', 'purified'], ['puri fi cation', 'purification'],
        ['testi fi ed', 'testified'],
        ['noti fi ed', 'notified'], ['noti fi cation', 'notification'],
        ['veri fi ed', 'verified'], ['veri fi cation', 'verification'],
        ['uni fi ed', 'unified'], ['uni fi cation', 'unification'],
        ['quali fi ed', 'qualified'], ['quali fi cation', 'qualification'],
        // fl ligature
        ['fl ow', 'flow'], ['fl ows', 'flows'], ['fl owing', 'flowing'],
        ['fl ew', 'flew'], ['fl ight', 'flight'], ['fl ights', 'flights'],
        ['fl at', 'flat'], ['fl ag', 'flag'], ['fl ags', 'flags'],
        ['fl ood', 'flood'], ['fl oods', 'floods'],
        ['fl oor', 'floor'], ['fl oors', 'floors'],
        ['fl esh', 'flesh'],
        ['fl ed', 'fled'],
        ['fl exible', 'flexible'], ['fl exibility', 'flexibility'], ['fl exibly', 'flexibly'],
        ['in fl uence', 'influence'], ['in fl uenced', 'influenced'], ['in fl uences', 'influences'], ['in fl uential', 'influential'],
        ['con fl ict', 'conflict'], ['con fl icts', 'conflicts'], ['con fl icting', 'conflicting'],
        ['re fl ect', 'reflect'], ['re fl ected', 'reflected'], ['re fl ection', 'reflection'], ['re fl ects', 'reflects'],
        ['in fl ation', 'inflation'],
        // ff ligature
        ['di ff erent', 'different'], ['di ff erently', 'differently'], ['di ff erence', 'difference'], ['di ff erences', 'differences'],
        ['di ffi cult', 'difficult'], ['di ffi culty', 'difficulty'], ['di ffi culties', 'difficulties'],
        ['e ff ect', 'effect'], ['e ff ects', 'effects'], ['e ff ective', 'effective'], ['e ff ectively', 'effectively'],
        ['e ff ort', 'effort'], ['e ff orts', 'efforts'],
        ['o ff er', 'offer'], ['o ff ered', 'offered'], ['o ff ers', 'offers'], ['o ff ering', 'offering'],
        ['o ff icial', 'official'], ['o ff icials', 'officials'], ['o ff icially', 'officially'],
        ['o ff ice', 'office'], ['o ff ices', 'offices'], ['o ff icer', 'officer'],
        ['su ff er', 'suffer'], ['su ff ered', 'suffered'], ['su ff ering', 'suffering'], ['su ff ers', 'suffers'],
        ['a ff ect', 'affect'], ['a ff ected', 'affected'], ['a ff ects', 'affects'],
        ['a ff ord', 'afford'], ['a ff orded', 'afforded'],
        ['a ff air', 'affair'], ['a ff airs', 'affairs'],
        ['stu ff', 'stuff'],
        ['sta ff', 'staff'],
        ['co ff ee', 'coffee'],
        ['ba ffl ed', 'baffled'],
    ];

    for (const [broken, fixed] of ligatureWords) {
        // Case-insensitive replace
        const regex = new RegExp(broken.replace(/ /g, '\\s+'), 'gi');
        r = r.replace(regex, (match) => {
            // Preserve original case
            if (match[0] === match[0].toUpperCase()) {
                return fixed.charAt(0).toUpperCase() + fixed.slice(1);
            }
            return fixed;
        });
    }

    // Generic fallback: join remaining "X fi Y" patterns where X ends mid-word
    // This catches any we missed
    r = r.replace(/([a-z])fi ([a-z])/g, '$1fi$2');
    r = r.replace(/([a-z])fl ([a-z])/g, '$1fl$2');
    r = r.replace(/([a-z])ff ([a-z])/g, '$1ff$2');
    // Run twice for chained breaks
    r = r.replace(/([a-z])fi ([a-z])/g, '$1fi$2');
    r = r.replace(/([a-z])fl ([a-z])/g, '$1fl$2');
    r = r.replace(/([a-z])ff ([a-z])/g, '$1ff$2');

    return r;
}

function fixQuotesAndPunctuation(text) {
    let r = text;

    // Fix smart quote spacing: ' t -> 't, ' s -> 's, etc.
    r = r.replace(/ ' t\b/g, "'t");
    r = r.replace(/ ' s\b/g, "'s");
    r = r.replace(/ ' re\b/g, "'re");
    r = r.replace(/ ' ll\b/g, "'ll");
    r = r.replace(/ ' ve\b/g, "'ve");
    r = r.replace(/ ' d\b/g, "'d");
    r = r.replace(/ ' m\b/g, "'m");
    r = r.replace(/n ' t/g, "n't");

    // Curly quotes with spaccing
    r = r.replace(/ \u2019 /g, "'");
    r = r.replace(/(\w) ' (\w)/g, "$1'$2");
    r = r.replace(/(\w) ' (\w)/g, "$1'$2");
    r = r.replace(/ ' /g, "'");
    r = r.replace(/ ' /g, "'");

    return r;
}

function cleanText(text) {
    let r = text;

    // Remove watermarks
    r = r.replace(/OceanofPDF\.com/g, '');

    // Fix ligatures
    r = fixLigatures(r);

    // Fix quotes
    r = fixQuotesAndPunctuation(r);

    // Fix double spaces
    r = r.replace(/ {2,}/g, ' ');

    // Normalize paragraph breaks: lines separated by empty lines
    const rawLines = r.split('\n');
    const paragraphs = [];
    let currentPara = '';

    for (const line of rawLines) {
        const trimmed = line.trim();
        if (trimmed === '') {
            if (currentPara.trim()) {
                paragraphs.push(currentPara.trim());
            }
            currentPara = '';
        } else {
            currentPara += (currentPara ? ' ' : '') + trimmed;
        }
    }
    if (currentPara.trim()) paragraphs.push(currentPara.trim());

    // Filter out very short paragraphs that are likely page numbers or artifacts
    const filtered = paragraphs.filter(p => {
        if (p.length < 5) return false;
        if (/^\d+$/.test(p)) return false; // Page numbers
        if (/^CHAPTER\s+\d+$/i.test(p)) return false;
        return true;
    });

    r = filtered.join('\n\n');

    // Fix excessive newlines
    r = r.replace(/\n{3,}/g, '\n\n');

    return r.trim();
}

function removeChapterHeader(text, chapterIdx) {
    let lines = text.split('\n\n');

    // Remove opening lines that are part headings or chapter titles
    while (lines.length > 1) {
        const first = lines[0].trim();
        if (first.length < 150 && (
            /^PART\s+[IVXLC]+/i.test(first) ||
            /^(Prologue|Epilogue)$/i.test(first) ||
            /^CHAPTER\s+\d+/i.test(first) ||
            /^(What Is Information|Stories:|Documents:|Errors:|Decisions:|The New Members|Relentless|Fallible|Democracies|Totalitarianism|The Silicon)/i.test(first) ||
            /^Human Networks$/i.test(first) ||
            /^The Inorganic Network$/i.test(first) ||
            /^Computer Politics$/i.test(first) ||
            /^[A-Z][A-Z\s:?!.–—]{5,}$/.test(first)
        )) {
            lines.shift();
        } else {
            break;
        }
    }

    let result = lines.join('\n\n');

    // Fix misplaced PDF drop cap:
    // The PDF drop cap is a large decorative letter pdfjs extracts at a different Y.
    // It ends up mid-paragraph: "e have named...species. W debatable"
    // We need to: take the W, put it at the start, and rejoin.
    if (/^[a-z]/.test(result)) {
        const firstPara = result.split('\n\n')[0];
        // Find a single capital letter surrounded by spaces (the displaced drop cap)
        // Could appear as: " W " or after punctuation ". C " and followed by upper or lowercase
        const match = firstPara.match(/[\s.]\s?([A-Z])\s+([a-zA-Z])/);
        if (match) {
            const capLetter = match[1];
            const pos = firstPara.indexOf(match[0]);
            const before = firstPara.substring(0, pos);
            // Remove the drop cap from its wrong position, keep the word after it
            const afterMatchStart = pos + match[0].length - match[2].length;
            const after = firstPara.substring(afterMatchStart);
            const fixedPara = capLetter + before.trimEnd() + ' ' + after;
            const rest = result.split('\n\n').slice(1);
            result = [fixedPara, ...rest].join('\n\n');
        }
    }

    // Simple drop cap at start: "W e have" -> "We have"
    result = result.replace(/^([A-Z])\s+([a-z])/, '$1$2');

    return result.trim();
}

function findChapterBoundaries(simplePages) {
    const boundaries = [];
    for (let mi = 0; mi < CHAPTER_MARKERS.length; mi++) {
        const marker = CHAPTER_MARKERS[mi];
        let found = false;
        const startPage = mi === 0 ? 5 : (boundaries.length > 0 ? boundaries[boundaries.length - 1] : 5);

        for (let pi = startPage; pi < simplePages.length; pi++) {
            if (simplePages[pi].includes(marker)) {
                if (mi === 0 && pi < 8) continue;
                if (mi === CHAPTER_MARKERS.length - 1 && (simplePages[pi].length < 200 || simplePages[pi].includes('BACK TO NOTE'))) continue;
                boundaries.push(pi);
                found = true;
                break;
            }
        }
        if (!found) { console.warn(`WARNING: Marker "${marker}" not found`); boundaries.push(-1); }
    }
    return boundaries;
}

async function main() {
    console.log('Loading PDF...');
    const data = new Uint8Array(readFileSync(PDF_PATH));
    const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
    console.log(`Pages: ${doc.numPages}`);

    console.log('Pass 1: boundary detection...');
    const simplePages = await extractPagesSimple(doc);
    const boundaries = findChapterBoundaries(simplePages);
    boundaries.forEach((b, i) => console.log(`  ${CHAPTERS[i].title.padEnd(60)} → page ${b + 1}`));

    let notesStart = simplePages.length;
    for (let i = Math.floor(simplePages.length * 0.7); i < simplePages.length; i++) {
        if (simplePages[i].includes('BACK TO NOTE REFERENCE') || simplePages[i].includes('PROLOGUE 1.')) {
            notesStart = i; break;
        }
    }
    console.log(`Notes: page ${notesStart + 1}`);

    console.log('\nPass 2: smart content extraction...');
    const chaptersData = [];

    for (let i = 0; i < CHAPTERS.length; i++) {
        const startPage = boundaries[i];
        if (startPage === -1) continue;
        const endPage = (i < CHAPTERS.length - 1 && boundaries[i + 1] !== -1) ? boundaries[i + 1] : notesStart;

        let chapterText = '';
        for (let p = startPage; p < endPage; p++) {
            chapterText += await extractPageSmart(doc, p + 1) + '\n\n';
        }

        chapterText = cleanText(chapterText);
        chapterText = removeChapterHeader(chapterText, i);

        chaptersData.push({
            id: CHAPTERS[i].id,
            title: CHAPTERS[i].title,
            part: CHAPTERS[i].part,
            content: chapterText,
            charCount: chapterText.length,
        });

        console.log(`  ${CHAPTERS[i].title}: ${chapterText.length} chars`);
        console.log(`    → "${chapterText.substring(0, 120).replace(/\n/g, ' ')}..."`);
    }

    mkdirSync(OUT_DIR, { recursive: true });
    const output = {
        bookTitle: 'Nexus: A Brief History of Information Networks from the Stone Age to AI',
        author: 'Yuval Noah Harari',
        year: 2024,
        totalChapters: chaptersData.length,
        chapters: chaptersData,
    };
    writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\n✓ Wrote ${chaptersData.length} chapters (${(JSON.stringify(output).length / 1024).toFixed(0)} KB)`);
}

main().catch(console.error);
