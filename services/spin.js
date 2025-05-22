import prisma from './primsa.js';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '../config/settings.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// In-memory store for spin results by token (replace with DB for production)
const spinResults = {};

function weightedRandom(outcomes) {
  const total = outcomes.reduce((sum, o) => sum + o.frequency, 0);
  let r = Math.floor(Math.random() * total);
  for (const o of outcomes) {
    if (r < o.frequency) return o.outcome;
    r -= o.frequency;
  }
  return outcomes[outcomes.length - 1].outcome;
}

export async function spinWheelWithToken(userId) {
  // Check user SPINS
  const credited = await prisma.transaction.aggregate({
    where: { userId, type: 'BONUS', prizeName: 'SPINS' },
    _sum: { amount: true },
  });
  const used = await prisma.transaction.aggregate({
    where: { userId, type: { in: ['WIN', 'LOSS'] } },
    _sum: { amount: true },
  });
  const creditedSpins = credited._sum.amount || 0;
  const usedSpins = used._sum.amount || 0;
  if (creditedSpins - usedSpins < 1) {
    throw new Error('Nu ai suficiente SPINS!');
  }
  // Deduct a spin (record as WIN or LOSS after outcome)
  const outcome = weightedRandom(config.spinOutcomes);
  let prize = null;
  let type = 'LOSS';
  if (outcome === 'lose' || outcome === 'loose') {
    type = 'LOSS';
  } else {
    type = 'WIN';
    // Pick a prize matching the outcome
    const possible = config.prizes.filter((p) => p.outcome === outcome);
    if (possible.length > 0) {
      prize = possible[Math.floor(Math.random() * possible.length)];
    }
  }
  await prisma.transaction.create({
    data: {
      userId,
      amount: 1,
      type,
      prizeName: prize ? prize.name : 'PIERDUT',
      prizeValue: prize ? prize.description : 'Niciun premiu',
    },
  });
  // Generate token and store result
  const token = uuidv4();
  spinResults[token] = {
    outcome,
    prize,
    type,
    createdAt: Date.now(),
    userId,
  };
  return { token, outcome, prize, type };
}

export function getSpinResultByToken(token) {
  const result = spinResults[token];
  // Optionally, add expiration logic (e.g., 5 min)
  if (!result) return null;
  if (Date.now() - result.createdAt > 5 * 60 * 1000) {
    delete spinResults[token];
    return null;
  }
  return result;
} 