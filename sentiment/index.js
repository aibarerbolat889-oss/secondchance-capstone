const express = require('express');
const natural = require('natural');
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
const tokenizer = new natural.WordTokenizer();
function analyze(sentence) {
  const tokens = tokenizer.tokenize(sentence.toLowerCase());
  const sentimentScore = tokens.length ? analyzer.getSentiment(tokens) : 0;
  return { sentimentScore, sentiment: sentimentScore > 0 ? 'positive' : sentimentScore < 0 ? 'negative' : 'neutral' };
}
const app = express();
app.use(express.json({ limit: '16kb' }));
app.post('/sentiment', (req, res) => {
  if (typeof req.body.sentence !== 'string' || !req.body.sentence.trim() || req.body.sentence.length > 4000) {
    return res.status(400).json({ error: 'Provide a sentence of 1–4000 characters.' });
  }
  res.json(analyze(req.body.sentence));
});
if (require.main === module) app.listen(process.env.PORT || 3061, () => console.log('Sentiment service is ready.'));
module.exports = { app, analyze };
