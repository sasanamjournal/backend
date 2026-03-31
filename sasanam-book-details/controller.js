const service = require('./service');
const genAI = require('../genAI');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const createBookDetails = async (req, res) => {
  try {
    if (!req.body || !req.body.content) {
      return res.status(400).json({ success: false, error: 'content is required' });
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = `You will receive a set of HTML elements extracted from a PDF. Your task is to enhance the UI without changing the structure or the exact vertical order of the content. Do not alter, omit, or rearrange any elements - preserve the PDF's original reading order exactly. If images are included, ensure they are fully rendered and visible. Use clean, modern CSS embedded within a <style> block, ensuring a centered layout with a maximum width of 900px, 'Noto Sans Tamil' font, proper spacing, and responsive image sizing. The final output must be a complete HTML document, safe for React's dangerouslySetInnerHTML. No external scripts, no external CSS, no JavaScript - only inline styles. Ensure a polished, readable, and uniform experience.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: req.body.content,
          mimeType: 'text/html'
        }
      }
    ]);

    const data = result.response.text();
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('createBookDetails error:', error);
    res.status(500).json({ success: false, error: 'Failed to process the document.' });
  }
};

const getAllBookDetails = async (req, res) => {
  try {
    const result = await service.getAllBookDetails();
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getBookDetailsById = async (req, res) => {
  try {
    const result = await service.getBookDetailsById(req.params.id);
    if (!result) return res.status(404).json({ success: false, error: 'Not found' });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const updateBookDetails = async (req, res) => {
  try {
    const result = await service.updateBookDetails(req.params.id, req.body);
    if (!result) return res.status(404).json({ success: false, error: 'Not found' });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

const deleteBookDetails = async (req, res) => {
  try {
    const result = await service.deleteBookDetails(req.params.id);
    if (!result) return res.status(404).json({ success: false, error: 'Not found' });
    res.status(200).json({ success: true, message: 'Book details deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  createBookDetails,
  getAllBookDetails,
  getBookDetailsById,
  updateBookDetails,
  deleteBookDetails
};
