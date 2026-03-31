// pdfImageExtractor.js



const { PDFDocument } = require('pdf-lib');
const path = require('path');
const fs = require('fs');

/**
 * Extracts only embedded images from a PDF and saves them to the file system.
 * @param {Buffer|string} pdfBufferOrPath - PDF file buffer or path
 * @param {string} outputDir - Directory to save images
 * @returns {Promise<string[]>} - Array of image file paths
 */
async function extractImagesFromPDF(pdfBufferOrPath, outputDir) {
    // Load PDF
    let pdfDoc;
    if (Buffer.isBuffer(pdfBufferOrPath)) {
        pdfDoc = await PDFDocument.load(pdfBufferOrPath);
    } else if (typeof pdfBufferOrPath === 'string') {
        const fileBuffer = fs.readFileSync(pdfBufferOrPath);
        pdfDoc = await PDFDocument.load(fileBuffer);
    } else {
        throw new Error('Invalid input: must be Buffer or file path');
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const imagePaths = [];
    let imageCount = 0;

    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
        const page = pdfDoc.getPage(i);
        const images = page.node.Resources().lookupMaybe('XObject') || {};
        const xObjectNames = Object.keys(images);
        for (const name of xObjectNames) {
            const xObject = images[name];
            if (!xObject) continue;
            const subtype = xObject.lookup('Subtype');
            if (subtype && subtype.name === 'Image') {
                let imageBytes, ext;
                if (xObject.lookup('Filter')?.name === 'DCTDecode') {
                    // JPEG
                    imageBytes = xObject.contents;
                    ext = 'jpg';
                } else if (xObject.lookup('Filter')?.name === 'FlateDecode') {
                    // PNG (raw, needs conversion, but we'll save as .png)
                    imageBytes = xObject.contents;
                    ext = 'png';
                } else {
                    continue; // skip unsupported
                }
                const imagePath = path.join(outputDir, `pdfimg_page${i+1}_${name}.${ext}`);
                fs.writeFileSync(imagePath, imageBytes);
                imagePaths.push(imagePath);
                imageCount++;
            }
        }
    }
    return imagePaths;
}

module.exports = { extractImagesFromPDF };