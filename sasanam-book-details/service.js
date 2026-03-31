const SasanamBookDetails = require('./schema');

// Create new book details
const createBookDetails = async (data) => {
  const bookDetails = new SasanamBookDetails(data);
  return await bookDetails.save();
};

// Get all book details
const getAllBookDetails = async () => {
  return await SasanamBookDetails.find().populate('bookid');
};

// Get book details by ID
const getBookDetailsById = async (id) => {
  return await SasanamBookDetails.findById(id).populate('bookid');
};

// Update book details
const updateBookDetails = async (id, data) => {
  return await SasanamBookDetails.findByIdAndUpdate(id, data, { new: true });
};

// Delete book details
const deleteBookDetails = async (id) => {
  return await SasanamBookDetails.findByIdAndDelete(id);
};

module.exports = {
  createBookDetails,
  getAllBookDetails,
  getBookDetailsById,
  updateBookDetails,
  deleteBookDetails
};
