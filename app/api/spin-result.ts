import { NextApiRequest, NextApiResponse } from 'next';
import { getSpinResultByToken } from '../../services/spin.js';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token lipsă sau invalid.' });
  }
  const result = getSpinResultByToken(token);
  if (!result) {
    return res.status(404).json({ error: 'Token invalid sau expirat.' });
  }
  res.status(200).json(result);
} 