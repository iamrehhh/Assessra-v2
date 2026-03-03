const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function testPdf() {
    try {
        const safePath = path.join(process.cwd(), 'public', 'past_papers', 'papers', '9609_s24_in_31.pdf');

        console.log("Reading PDF at:", safePath);
        if (!fs.existsSync(safePath)) {
            console.error("File does not exist!");
            return;
        }

        const dataBuffer = fs.readFileSync(safePath);
        console.log("Buffer length:", dataBuffer.length);

        let pdfText = '';
        try {
            // How route.js does it:
            const { PDFParse } = require('pdf-parse');
            const parser = new PDFParse({ data: dataBuffer });
            const data = await parser.getText();
            pdfText = data.text;

            console.log("Success with original route.js syntax! Text:", pdfText.length);
        } catch (e) {
            console.log("Failed original syntax", e.message);
        }

        try {
            // old function syntax
        } catch (e) {
            console.log("Failed modern syntax", e.message);
        }
    } catch (err) {
        console.error("Overall error:", err);
    }
}

testPdf();
