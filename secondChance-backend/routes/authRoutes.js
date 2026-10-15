const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { rateLimit } = require('express-rate-limit');
const connectToDatabase = require('../models/db');
const requireAuth = require('../middleware/auth');
const config = require('../config');
const validate = require('../validation');
const router = express.Router();
const limit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' } });
function publicUser(user) {
  return { id: user._id.toString(), firstName: user.firstName, lastName: user.lastName, name: user.firstName, email: user.email };
}
function session(user) {
  const authtoken = jwt.sign({}, config.jwtSecret, {
    subject: user._id.toString(), expiresIn: '1h', algorithm: 'HS256', issuer: 'secondchance', audience: 'secondchance-web'
  });
  return { authtoken, email: user.email, userEmail: user.email, userName: user.firstName, user: publicUser(user) };
}
router.post('/register', limit, async (req, res, next) => {
  try {
    const firstName = validate.text(req.body.firstName, 'First name', 80);
    const lastName = validate.text(req.body.lastName, 'Last name', 80);
    const email = validate.email(req.body.email);
    const password = validate.password(req.body.password);
    const db = await connectToDatabase();
    const user = { firstName, lastName, email, passwordHash: await bcrypt.hash(password, 12), createdAt: new Date() };
    const result = await db.collection('users').insertOne(user);
    user._id = result.insertedId;
    res.status(201).json({ message: 'User registered successfully.', ...session(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'This email is already registered.' });
    next(error);
  }
});
router.post('/login', limit, async (req, res, next) => {
  try {
    const email = validate.email(req.body.email);
    const password = validate.password(req.body.password);
    const db = await connectToDatabase();
    const user = await db.collection('users').findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid email or password.' });
    res.json({ message: 'Login successful.', ...session(user) });
  } catch (error) { next(error); }
});
router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.userId) });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(publicUser(user));
  } catch (error) { next(error); }
});
router.put('/update', requireAuth, async (req, res, next) => {
  try {
    const changes = {};
    if (req.body.firstName !== undefined || req.body.name !== undefined) changes.firstName = validate.text(req.body.firstName ?? req.body.name, 'First name', 80);
    if (req.body.lastName !== undefined) changes.lastName = validate.text(req.body.lastName, 'Last name', 80);
    if (!Object.keys(changes).length) throw validate.invalid('Provide a name to update.');
    const db = await connectToDatabase();
    // Only the signed JWT identifies the owner, never an Email header or body ID.
    const user = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(req.userId) }, { $set: { ...changes, updatedAt: new Date() } }, { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'Profile updated.', user: publicUser(user) });
  } catch (error) { next(error); }
});
module.exports = router;
