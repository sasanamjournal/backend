const authService = require('./service');

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const signup = async (req, res) => {
  const { username, password, email } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  if (typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 30) {
    return res.status(400).json({ error: 'username must be 3-30 characters' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }
  if (email !== undefined && email !== null) {
    if (typeof email !== 'string' || !isValidEmail(email.trim())) {
      return res.status(400).json({ error: 'invalid email format' });
    }
  }

  try {
    const result = await authService.signup(username, password, email);
    if (result.error) return res.status(result.status || 400).json({ error: result.error });
    return res.status(201).json({ token: result.token, expiresIn: result.expiresIn, user: result.user });
  } catch (err) {
    console.error('Auth signup error:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  try {
    const result = await authService.login(username, password);
    if (result.error) return res.status(result.status || 400).json({ error: result.error });
    res.json({ token: result.token, expiresIn: result.expiresIn, user: result.user });
  } catch (err) {
    console.error('Auth controller error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
};

module.exports = {
  login,
  signup
};
