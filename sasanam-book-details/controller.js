
const service = require('./service');
const genAI = require("../genAI");
const { extractImagesFromPDF } = require("./pdfImageExtractor");
const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://api.gemini.com/v1/generate';

const createBookDetails = async (req, res) => {
  try {
    console.log("Received file:", req?.file);
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "PDF file is required in form-data as 'file' field." });
    }

    // Extract images from PDF (non-blocking for Gemini flow)
    let images = [];
    try {
      images = await extractImagesFromPDF(req.file.buffer);
      console.log(`Extracted ${images.length} images from PDF., Images info:`, images);
    } catch (imgErr) {
      console.warn("Image extraction failed or no images found:", imgErr);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
You are an advanced AI document parser and UI formatter.

Task:
Extract the full content from the provided PDF and convert it into a COMPLETE, RENDER-READY HTML document with embedded CSS styling.

━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━

1. Preserve Exact Order:
- Maintain the EXACT vertical reading order of the PDF.
- Do NOT rearrange, summarize, or skip any content.

2. Output Format:
- Return a COMPLETE HTML structure:

<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>...</style>
</head>
<body>...</body>
</html>

- Do NOT include explanations or markdown.

━━━━━━━━━━━━━━━━━━━━━━━
3. IMAGE HANDLING (VERY STRICT)
━━━━━━━━━━━━━━━━━━━━━━━

- Extract ALL images from the PDF.
- DO NOT skip any image.

- Render images using:
<figure>
  <img src="data:image/jpeg;base64,COMPLETE_BASE64_STRING" alt="image" />
  <figcaption>Caption if available</figcaption>
</figure>

STRICT RULES:
- Base64 MUST be COMPLETE and NOT truncated.
- DO NOT shorten, summarize, or compress base64 data.
- DO NOT cut the base64 string at any point.
- Ensure the image renders correctly in a browser.

IF base64 is too large:
- Split into multiple parts and CONCATENATE like:

<img src="data:image/jpeg;base64,PART1PART2PART3" />

IF image extraction fails:
- Provide fallback:

<figure>
  <div class="image-placeholder">Image not available</div>
</figure>

━━━━━━━━━━━━━━━━━━━━━━━
4. HTML STRUCTURE RULES
━━━━━━━━━━━━━━━━━━━━━━━

- Wrap each logical block:
<div class="block">...</div>

- Use semantic HTML:
  - <h1>, <h2>, <h3> → headings
  - <p> → paragraphs
  - <br/> → line breaks
  - <ol>, <ul>, <li> → lists

- Preserve Tamil text EXACTLY as-is.
- Do NOT translate or normalize text.

━━━━━━━━━━━━━━━━━━━━━━━
5. STYLING REQUIREMENTS (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━

Include clean, modern CSS inside <style>:

- Font:
  font-family: 'Noto Sans Tamil', system-ui, sans-serif;

- Layout:
  - max-width: 900px
  - centered layout
  - padding: 20px
  - soft background

- Typography:
  - line-height: 1.7
  - letter-spacing: 0.02em
  - proper heading sizes

- Block UI:
  - spacing between blocks
  - subtle border-left or shadow
  - rounded corners

- Images:
  - max-width: 100%
  - height: auto
  - border-radius: 8px
  - centered display

- Add this fallback style:
.image-placeholder {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f3f5;
  color: #888;
  border-radius: 8px;
  font-style: italic;
}

━━━━━━━━━━━━━━━━━━━━━━━
6. UI ENHANCEMENT
━━━━━━━━━━━━━━━━━━━━━━━

- Ensure clean reading experience
- Add spacing between sections
- Maintain document-style layout
- Keep page separators if present

━━━━━━━━━━━━━━━━━━━━━━━
7. SAFETY (STRICT)
━━━━━━━━━━━━━━━━━━━━━━━

- NO JavaScript
- NO external scripts
- NO external CSS links
- ONLY inline <style>
- Must be safe for React dangerouslySetInnerHTML

━━━━━━━━━━━━━━━━━━━━━━━
8. SPECIAL CONTENT HANDLING
━━━━━━━━━━━━━━━━━━━━━━━

- Preserve page numbers
- Maintain numbering exactly
- Preserve line-by-line formatting
- Keep multi-line Tamil structure

━━━━━━━━━━━━━━━━━━━━━━━
9. COMPLETENESS
━━━━━━━━━━━━━━━━━━━━━━━

- Do NOT omit ANY content
- Include:
  - text
  - headings
  - images
  - captions

━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY the final HTML document as a string.
Do NOT include explanations.
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: "application/pdf"
        }
      }
    ]);

    const responseText = result.response.text();
    console.log("Gemini response:", responseText);
    let data;
    try {
      // First parse: remove outer string quotes and escapes
      const firstParse = JSON.parse(responseText);
      // Second parse: get the actual JSON object/array
      data = typeof firstParse === 'string' ? JSON.parse(firstParse) : firstParse;
    } catch (e) {
      console.error('Failed to parse Gemini response:', e, responseText);
      // Fallback: just return the raw response
      data = responseText;
    }
    // Attach images info to the response, but do not break existing flow
    res.status(201).json({ data, images });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process the document order." });
  }
};

const getAllBookDetails = async (req, res) => {
  try {
    const result = await service.getAllBookDetails();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getBookDetailsById = async (req, res) => {
  try {
    const result = await service.getBookDetailsById(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateBookDetails = async (req, res) => {
  try {
    const result = await service.updateBookDetails(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteBookDetails = async (req, res) => {
  try {
    const result = await service.deleteBookDetails(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createBookDetails,
  getAllBookDetails,
  getBookDetailsById,
  updateBookDetails,
  deleteBookDetails
};