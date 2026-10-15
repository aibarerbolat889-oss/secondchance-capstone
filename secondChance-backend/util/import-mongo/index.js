const fs = require('node:fs');
const path = require('node:path');
const connectToDatabase = require('../../models/db');
async function loadData() {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'secondChanceItems.json'), 'utf8')).docs;
  if (!Array.isArray(data) || data.length !== 16) throw new Error('Expected 16 starter documents.');
  const db = await connectToDatabase();
  const collection = db.collection('secondChanceItems');
  // $setOnInsert avoids duplicating records or overwriting later edits.
  const result = await collection.bulkWrite(data.map(item => ({ updateOne: {
    filter: { id: item.id }, update: { $setOnInsert: item }, upsert: true
  } })));
  const output = {
    acknowledged: true,
    insertedCount: result.upsertedCount,
    existingSeedDocuments: result.matchedCount,
    totalSeedDocuments: await collection.countDocuments({ id: { $in: data.map(item => item.id) } })
  };
  console.log(JSON.stringify(output, null, 2));
  return output;
}
if (require.main === module) loadData().catch(error => {
  console.error(error.message); process.exitCode = 1;
}).finally(() => connectToDatabase.closeDatabase());
module.exports = { loadData };
