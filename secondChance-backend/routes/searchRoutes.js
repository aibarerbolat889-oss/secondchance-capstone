const express = require('express');
const connectToDatabase = require('../models/db');
const { text, nonNegative, escapeRegex } = require('../validation');
const router = express.Router();
router.get('/', async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const query = {};
    if (req.query.name) query.name = { $regex: escapeRegex(text(req.query.name, 'Name', 100)), $options: 'i' };
    if (req.query.category) query.category = { $regex: '^' + escapeRegex(text(req.query.category, 'Category', 80)) + '$', $options: 'i' };
    if (req.query.condition) query.condition = { $regex: '^' + escapeRegex(text(req.query.condition, 'Condition', 40)) + '$', $options: 'i' };
    if (req.query.age_years !== undefined && req.query.age_years !== '') query.age_years = { $lte: nonNegative(req.query.age_years, 'Age') };
    const items = await db.collection('secondChanceItems').find(query).sort({ date_added: -1 }).toArray();
    res.json(items);
  } catch (error) { next(error); }
});
module.exports = router;
