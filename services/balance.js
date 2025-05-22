import prisma from './primsa.js';

export async function getUserSpinsBalance(userId) {
  // Sum all credited spins (BONUS type, prizeName: 'SPINS')
  const credited = await prisma.transaction.aggregate({
    where: { userId, type: 'BONUS', prizeName: 'SPINS' },
    _sum: { amount: true },
  });
  // Count all spins used (WIN or LOSS)
  const used = await prisma.transaction.aggregate({
    where: { userId, type: { in: ['WIN', 'LOSS'] } },
    _sum: { amount: true },
  });
  const creditedSpins = credited._sum.amount || 0;
  const usedSpins = used._sum.amount || 0;
  return creditedSpins - usedSpins;
} 