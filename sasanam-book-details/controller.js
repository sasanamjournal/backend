
const service = require('./service');
const genAI = require("../genAI");
const { extractImagesFromPDF } = require("./pdfImageExtractor");
const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://api.gemini.com/v1/generate';

const createBookDetails = async (req, res) => {
  try {
    console.log("Received request body:", req.body);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You will receive a set of HTML elements extracted from a PDF. Your task is to enhance the UI without changing the structure or the exact vertical order of the content. Do not alter, omit, or rearrange any elements—preserve the PDF’s original reading order exactly. If images are included, ensure they are fully rendered and visible. Use clean, modern CSS embedded within a <style> block, ensuring a centered layout with a maximum width of 900px, 'Noto Sans Tamil' font, proper spacing, and responsive image sizing. The final output must be a complete HTML document, safe for React's dangerouslySetInnerHTML. No external scripts, no external CSS, no JavaScript—only inline styles. Ensure a polished, readable, and uniform experience.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: req.body.content,
          mimeType: 'text/html'
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
    res.status(201).json({ data });
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