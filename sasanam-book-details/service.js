const SasanamBookDetails = require('./schema');

// Create new book details
exports.createBookDetails = async (data) => {
  const bookDetails = new SasanamBookDetails(data);
  return await bookDetails.save();
};

// Get all book details
exports.getAllBookDetails = async () => {
  return await SasanamBookDetails.find().populate('bookid');
};

// Get book details by ID
exports.getBookDetailsById = async (id) => {
  return await SasanamBookDetails.findById(id).populate('bookid');
};

// Update book details
exports.updateBookDetails = async (id, data) => {
  return await SasanamBookDetails.findByIdAndUpdate(id, data, { new: true });
};

// Delete book details
exports.deleteBookDetails = async (id) => {
  return await SasanamBookDetails.findByIdAndDelete(id);
};
