const { getTeamMembers: getTeamMembersService, addTeamMember: addTeamMemberService, getAuthors: getAuthorsService, addAuthor: addAuthorService } = require('./service');

const getTeamMembers = async (req, res) => {
  try {
    const result = await getTeamMembersService();
    if (!result || result.error) {
      return res.status(result?.status || 500).json({ success: false, error: result?.error || 'Failed to fetch team members' });
    }
    return res.status(200).json({ success: true, data: result.data });
  } catch (err) {
    console.error('Get team members controller error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const addTeamMember = async (req, res) => {
  try {
    const result = await addTeamMemberService(req.body);
    if (!result || result.error) {
      return res.status(result?.status || 400).json({ success: false, error: result?.error || 'Failed to add team member' });
    }
    return res.status(201).json({ success: true, data: result.data });
  } catch (err) {
    console.error('Add team member controller error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const getAuthors = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const deviceType = req.query.deviceType;
    const networkSpeed = req.query.networkSpeed;
    const result = await getAuthorsService(limit, page, deviceType, networkSpeed);
    if (!result || result.error) {
      return res.status(result?.status || 500).json({ success: false, error: result?.error || 'Failed to fetch authors' });
    }
    return res.status(200).json({ success: true, data: result.data });
  } catch (err) {
    console.error('Get authors controller error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const addAuthor = async (req, res) => {
  try {
    const result = await addAuthorService(req.body);
    if (!result || result.error) {
      return res.status(result?.status || 400).json({ success: false, error: result?.error || 'Failed to add author' });
    }
    return res.status(201).json({ success: true, data: result.data });
  } catch (err) {
    console.error('Add author controller error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = { getTeamMembers, addTeamMember, getAuthors, addAuthor };
