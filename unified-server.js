import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSpinResultByToken } from './dist/spin.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Needed for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from webapp
app.use(express.static(path.join(__dirname, 'webapp')));

// API endpoint for spin result
app.get('/api/spin-result', (req, res) => {
  const token = req.query.token;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token lipsă sau invalid.' });
  }
  const result = getSpinResultByToken(token);
  if (!result) {
    return res.status(404).json({ error: 'Token invalid sau expirat.' });
  }
  res.status(200).json(result);
});

// CORS for local development (optional, can remove in prod)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.listen(PORT, () => {
  console.log(`Unified server running at http://localhost:${PORT}`);
}); 