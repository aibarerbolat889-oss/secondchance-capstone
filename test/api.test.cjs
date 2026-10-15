const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
process.env.MONGO_DB = 'secondchance_test_' + randomUUID().replaceAll('-', '');
process.env.JWT_SECRET = randomUUID() + randomUUID();
const request = require('supertest');
const app = require('../secondChance-backend/app');
const dbConnect = require('../secondChance-backend/models/db');
const { loadData } = require('../secondChance-backend/util/import-mongo');
const { app: sentiment } = require('../sentiment');
let db;
let owner;
let other;
let itemId;
const user = { firstName: 'Test', lastName: 'Owner', email: 'owner@example.invalid', password: 'Testing-only-42!' };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ioAAAAASUVORK5CYII=', 'base64');
before(async () => { db = await dbConnect(); await loadData(); });
after(async () => {
  // Only this newly-created test database may be removed.
  assert.match(db.databaseName, /^secondchance_test_[0-9a-f]{32}$/);
  await db.dropDatabase();
  await dbConnect.closeDatabase();
});
test('imports exactly 16 documents and a rerun does not duplicate them', async () => {
  assert.equal(await db.collection('secondChanceItems').countDocuments(), 16);
  const rerun = await loadData();
  assert.equal(rerun.insertedCount, 0);
  assert.equal(rerun.totalSeedDocuments, 16);
});
test('lists items, returns detail and reports missing items', async () => {
  const all = await request(app).get('/api/secondchance/items').expect(200);
  assert.equal(all.body.length, 16);
  const detail = await request(app).get('/api/secondchance/items/875').expect(200);
  assert.equal(detail.body.name, 'Lamp');
  await request(app).get('/api/secondchance/items/missing').expect(404);
});
test('filters category, name and age and rejects query injection', async () => {
  const result = await request(app).get('/api/secondchance/search').query({ category: 'Office', name: 'desk', age_years: 3 }).expect(200);
  assert.ok(result.body.length > 0);
  assert.ok(result.body.every(item => item.category === 'Office' && /desk/i.test(item.name) && item.age_years <= 3));
  const literal = await request(app).get('/api/secondchance/search').query({ name: '.*' }).expect(200);
  assert.equal(literal.body.length, 0);
  await request(app).get('/api/secondchance/search?category[$ne]=x').expect(400);
  await request(app).get('/api/secondchance/search?age_years=-1').expect(400);
});
test('registers with a hashed password and rejects duplicate emails', async () => {
  const result = await request(app).post('/api/auth/register').send(user).expect(201);
  owner = result.body.authtoken;
  assert.ok(owner);
  assert.equal(result.body.user.passwordHash, undefined);
  const stored = await db.collection('users').findOne({ email: user.email });
  assert.notEqual(stored.passwordHash, user.password);
  assert.ok(stored.passwordHash.startsWith('$2'));
  await request(app).post('/api/auth/register').send({ ...user, email: 'OWNER@example.invalid' }).expect(409);
  const second = await request(app).post('/api/auth/register').send({ ...user, email: 'other@example.invalid' }).expect(201);
  other = second.body.authtoken;
});
test('authenticates users and rejects wrong passwords and token tampering', async () => {
  const result = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password }).expect(200);
  assert.equal(result.body.userEmail, user.email);
  await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrong-password' }).expect(401);
  await request(app).post('/api/auth/login').send({ email: { $ne: null }, password: user.password }).expect(400);
  await request(app).get('/api/auth/profile').set('Authorization', 'Bearer invalid').expect(401);
  await request(app).put('/api/auth/update').send({ name: 'Changed' }).expect(401);
});
test('updates only the authenticated profile, ignoring spoofed email headers', async () => {
  await request(app).put('/api/auth/update').set('Authorization', 'Bearer ' + owner)
    .set('Email', 'other@example.invalid').send({ name: 'Updated', email: 'other@example.invalid' }).expect(200);
  assert.equal((await db.collection('users').findOne({ email: user.email })).firstName, 'Updated');
  assert.equal((await db.collection('users').findOne({ email: 'other@example.invalid' })).firstName, 'Test');
});
test('uploads an image and does not trust a submitted owner or path', async () => {
  const result = await request(app).post('/api/secondchance/items').set('Authorization', 'Bearer ' + owner)
    .field('name', 'Test chair').field('category', 'Office').field('condition', 'Like New')
    .field('zipcode', '00000').field('age_days', '365').field('description', 'Integration test item')
    .field('posted_by', 'forged-owner').field('image', '../../unsafe')
    .attach('file', png, { filename: '../../image.png', contentType: 'image/png' }).expect(201);
  itemId = result.body.id;
  assert.match(result.body.image, /^\/uploads\/[0-9a-f-]{36}\.png$/);
  assert.notEqual(result.body.posted_by, 'forged-owner');
  assert.equal(result.body.age_years, 1);
  await request(app).get(result.body.image).expect(200);
});
test('requires authentication and rejects fake images', async () => {
  await request(app).post('/api/secondchance/items').expect(401);
  await request(app).post('/api/secondchance/items').set('Authorization', 'Bearer ' + owner)
    .field('name', 'Fake').field('category', 'Office').field('condition', 'New')
    .field('zipcode', '00000').field('description', 'Test')
    .attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'fake.png', contentType: 'image/png' }).expect(400);
});
test('only an item owner may edit or delete it', async () => {
  await request(app).put('/api/secondchance/items/' + itemId).set('Authorization', 'Bearer ' + other).send({ name: 'Stolen' }).expect(404);
  await request(app).delete('/api/secondchance/items/' + itemId).set('Authorization', 'Bearer ' + other).expect(404);
  const changed = await request(app).put('/api/secondchance/items/' + itemId).set('Authorization', 'Bearer ' + owner).send({ name: 'Updated chair' }).expect(200);
  assert.equal(changed.body.name, 'Updated chair');
});
test('concurrent reviews are preserved and analyzed', async () => {
  const results = await Promise.all(['A wonderful useful chair', 'A great comfortable chair'].map(comment =>
    request(app).post('/api/secondchance/items/' + itemId + '/comments').set('Authorization', 'Bearer ' + owner).send({ comment }).expect(201)));
  assert.equal(results.length, 2);
  const detail = await request(app).get('/api/secondchance/items/' + itemId).expect(200);
  assert.equal(detail.body.comments.length, 2);
  assert.ok(detail.body.comments.every(comment => comment.sentiment === 'positive'));
  await request(app).delete('/api/secondchance/items/' + itemId).set('Authorization', 'Bearer ' + owner).expect(200);
  await request(app).get('/api/secondchance/items/' + itemId).expect(404);
});
test('sentiment API handles positive, negative and invalid input', async () => {
  const positive = await request(sentiment).post('/sentiment').send({ sentence: 'I love this excellent gift' }).expect(200);
  assert.equal(positive.body.sentiment, 'positive');
  const negative = await request(sentiment).post('/sentiment').send({ sentence: 'This is terrible and awful' }).expect(200);
  assert.equal(negative.body.sentiment, 'negative');
  await request(sentiment).post('/sentiment').send({}).expect(400);
});
test('serves a landing page with the project name and Get Started', async () => {
  const page = await request(app).get('/').expect(200);
  assert.match(page.text, /Second Chance/);
  assert.match(page.text, /Get Started/);
  await request(app).get('/api/unknown').expect(404);
});
