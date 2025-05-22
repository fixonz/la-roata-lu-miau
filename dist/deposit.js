import fetch from 'node-fetch';
import prisma from './prisma.js';
const BLOCKCHAIR_API = 'https://api.blockchair.com/litecoin/dashboards/address/';
export async function getConfirmedLtcDeposits(address) {
    const url = `${BLOCKCHAIR_API}${address}`;
    const res = await fetch(url);
    if (!res.ok)
        throw new Error('Blockchair API error');
    const data = (await res.json());
    const utxos = data.data[address]?.utxo || [];
    // Only confirmed incoming transactions
    return utxos
        .filter((utxo) => utxo.recipient === address && utxo.block_id && utxo.spending_block_id === null)
        .map((utxo) => ({
        txid: utxo.transaction_hash,
        value: utxo.value / 1e8,
        time: utxo.time,
        block_id: utxo.block_id,
        is_confirmed: true,
        confirmations: utxo.confirmations || 0,
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
