const { getAllDonations: getAllDonationsService } = require('./service');

const getAllDonations = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const result = await getAllDonationsService(limit, page);

    if (!result || result.error) {
      return res.status(result && result.status ? result.status : 400).json({
        success: false,
        error: result && result.error ? result.error : 'Failed to fetch donations',
        code: result && result.status === 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (err) {
    console.error('Get all donations controller error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  getAllDonations
};