const service = require('./service');

exports.createBookDetails = async (req, res) => {
  try {
    const result = await service.createBookDetails(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllBookDetails = async (req, res) => {
  try {
    const result = await service.getAllBookDetails();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBookDetailsById = async (req, res) => {
  try {
    const result = await service.getBookDetailsById(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateBookDetails = async (req, res) => {
  try {
    const result = await service.updateBookDetails(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteBookDetails = async (req, res) => {
  try {
    const result = await service.deleteBookDetails(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
