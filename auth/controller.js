const authService = require('./service');

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const signup = async (req, res) => {
  const { fullName, password, email } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }
  if (typeof fullName !== 'string' || fullName.trim().length < 3 || fullName.trim().length > 30) {
    return res.status(400).json({ error: 'fullName must be 3-30 characters' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }
  if (email !== undefined && email !== null) {
    if (typeof email !== 'string' || !isValidEmail(email.trim())) {
      return res.status(400).json({ error: 'invalid email format' });
    }
  }

  // ...existing code...
try {
  const result = await authService.signup(fullName, password, email);
  
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }
  
  // Add: Send success response
  return res.status(result.status || 201).json({ message: 'Signup successful' });
} catch (err) {
  console.error('Auth signup error:', err);
  return res.status(500).json({ error: 'internal server error' });
}
// ...existing code...
};

const login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  try {
    const result = await authService.login(email, password);
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
