const express = require('express');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { ObjectId } = require('mongodb');
const connectToDatabase = require('../models/db');
const requireAuth = require('../middleware/auth');
const validate = require('../validation');
const config = require('../config');
const { analyze } = require('../../sentiment');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 12 } });
function fields(body, partial = false) {
  const item = {};
  for (const [key, max] of [['name', 120], ['category', 80], ['condition', 40], ['description', 4000], ['zipcode', 20]]) {
    if (!partial || body[key] !== undefined) item[key] = validate.text(body[key], key, max);
  }
  if (item.condition && !['New', 'Like New', 'Older'].includes(item.condition)) throw validate.invalid('Choose New, Like New, or Older.');
  if (!partial || body.age_days !== undefined) {
    item.age_days = validate.nonNegative(body.age_days ?? 0, 'Age in days');
    item.age_years = Math.round(item.age_days / 365 * 100) / 100;
  }
  return item;
}
function imageExtension(file) {
  const b = file.buffer;
  if (file.mimetype === 'image/png' && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return '.png';
  if (file.mimetype === 'image/jpeg' && b[0] === 255 && b[1] === 216 && b[2] === 255) return '.jpg';
  if (file.mimetype === 'image/gif' && /^GIF8[79]a$/.test(b.subarray(0, 6).toString())) return '.gif';
  if (file.mimetype === 'image/webp' && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return '.webp';
  throw validate.invalid('Upload a PNG, JPEG, GIF, or WebP image.');
}
router.get('/', async (_req, res, next) => {
  try {
    const db = await connectToDatabase();
    res.json(await db.collection('secondChanceItems').find({}).sort({ date_added: -1 }).toArray());
  } catch (error) { next(error); }
});
router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  let filePath;
  try {
    const item = fields(req.body);
    if (!req.file) throw validate.invalid('Choose an image for your item.');
    const filename = randomUUID() + imageExtension(req.file);
    const db = await connectToDatabase();
    if (!(await db.collection('users').findOne({ _id: new ObjectId(req.userId) }))) return res.status(401).json({ error: 'User not found.' });
    await fs.mkdir(config.uploadDir, { recursive: true });
    filePath = path.join(config.uploadDir, filename);
    await fs.writeFile(filePath, req.file.buffer, { flag: 'wx' });
    const record = { ...item, id: randomUUID(), posted_by: req.userId, date_added: Math.floor(Date.now() / 1000), image: '/uploads/' + filename, comments: [] };
    const result = await db.collection('secondChanceItems').insertOne(record);
    res.status(201).json({ ...record, _id: result.insertedId });
  } catch (error) {
    if (filePath) await fs.unlink(filePath).catch(() => {});
    next(error);
  }
});
router.get('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const item = await db.collection('secondChanceItems').findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    res.json(item);
  } catch (error) { next(error); }
});
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const changes = fields(req.body, true);
    if (!Object.keys(changes).length) throw validate.invalid('Provide an item field to update.');
    const db = await connectToDatabase();
    const item = await db.collection('secondChanceItems').findOneAndUpdate(
      { id: req.params.id, posted_by: req.userId }, { $set: changes }, { returnDocument: 'after' }
    );
    if (!item) return res.status(404).json({ error: 'Item not found or you are not its owner.' });
    res.json(item);
  } catch (error) { next(error); }
});
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const item = await db.collection('secondChanceItems').findOneAndDelete({ id: req.params.id, posted_by: req.userId });
    if (!item) return res.status(404).json({ error: 'Item not found or you are not its owner.' });
    // Only delete uploaded files with our generated UUID names, never seed assets.
    if (/^\/uploads\/[0-9a-f-]{36}\.(png|jpg|gif|webp)$/.test(item.image || '')) {
      await fs.unlink(path.join(config.uploadDir, path.basename(item.image))).catch(() => {});
    }
    res.json({ message: 'Item deleted.', id: item.id });
  } catch (error) { next(error); }
});
router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const comment = validate.text(req.body.comment, 'Comment', 2000);
    const db = await connectToDatabase();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.userId) });
    if (!user) return res.status(401).json({ error: 'User not found.' });
    const review = { id: randomUUID(), author: user.firstName, userId: req.userId, comment, ...analyze(comment), createdAt: new Date() };
    // Atomic push preserves all reviews when multiple users post simultaneously.
    const result = await db.collection('secondChanceItems').updateOne({ id: req.params.id }, { $push: { comments: review } });
    if (!result.matchedCount) return res.status(404).json({ error: 'Item not found.' });
    res.status(201).json(review);
  } catch (error) { next(error); }
});
module.exports = router;
