const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const config = require('../config');
function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Please log in.' });
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret, {
      algorithms: ['HS256'], issuer: 'secondchance', audience: 'secondchance-web'
    });
    if (!ObjectId.isValid(payload.sub)) throw new Error('Invalid user');
    req.userId = payload.sub;
    next();
  } catch (_error) {
    res.status(401).json({ error: 'Your session is invalid or expired. Please log in again.' });
  }
}
module.exports = requireAuth;
