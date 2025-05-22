import fetch from 'node-fetch';
import prisma from './primsa.js';

const API_BASE = 'https://sandbox-api.3xpl.com'; // Use 'https://api.3xpl.com' with API key for production

export async function getConfirmedLtcDeposits(address) {
  const url = `${API_BASE}/litecoin/address/${address}?data=address,balances,events&from=all`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    console.error('3xpl API error:', res.status, errorText);
    throw new Error('3xpl API error: ' + res.status);
  }
  const data = await res.json();

  const events = (data.data.events && data.data.events["litecoin-main"]) || [];
  // Only confirmed incoming transactions
  return events
    .filter(ev => ev.effect > 0 && ev.block && !ev.failed)
    .map(ev => ({
      txid: ev.transaction,
      value: ev.effect, // LTC amount
      time: ev.time,
      block_id: ev.block,
      is_confirmed: true,
      confirmations: ev.confirmations || 0,
    }));
}

// Check and update deposits for a user, return new credited transactions
export async function checkAndUpdateDeposits(userId, address, spinPriceLTC) {
  const deposits = await getConfirmedLtcDeposits(address);
  let newDeposits = [];
  for (const dep of deposits) {
    // Check if tx already recorded
    const exists = await prisma.transaction.findFirst({ where: { userId, txid: dep.txid, type: 'DEPOSIT' } });
    if (!exists) {
      // Mark as pending if 1 confirmation, credit if 2+
      await prisma.transaction.create({
        data: {
          userId,
          txid: dep.txid,
          amount: dep.value,
          type: 'DEPOSIT',
          prizeName: dep.confirmations === 1 ? 'pending' : 'credited',
          prizeValue: `${dep.value} LTC`,
        },
      });
      if (dep.confirmations >= 2) {
        // Credit spins
        const spins = Math.floor(dep.value / spinPriceLTC);
        if (spins > 0) {
          await prisma.transaction.create({
            data: {
              userId,
              txid: dep.txid,
              amount: spins,
              type: 'BONUS',
              prizeName: 'SPINS',
              prizeValue: `${spins} SPINS`,
            },
          });
        }
      }
      newDeposits.push(dep);
    }
  }
  return newDeposits;
} 