import prisma from './primsa.js';
import * as bitcoin from 'bitcoinjs-lib';
import * as bip39 from 'bip39';
import * as BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { Buffer } from 'buffer';

const bip32 = BIP32Factory.default(ecc);

// Litecoin network params
const litecoin = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'ltc',
  bip32: {
    public: 0x019da462,
    private: 0x019d9cfe,
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

function generateLtcWalletWithMnemonic() {
  const mnemonic = bip39.generateMnemonic();
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed, litecoin);
  const child = root.derivePath("m/44'/2'/0'/0/0"); // BIP44 for Litecoin
  const payment = bitcoin.payments.p2pkh({
    pubkey: Buffer.from(child.publicKey),
    network: litecoin,
  });
  if (!payment.address) throw new Error('Failed to generate Litecoin address');
  return {
    address: payment.address,
    privateKey: child.toWIF(),
    mnemonic,
  };
}

export async function findOrCreateUser(telegramId, username) {
  let user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId,
        username,
      },
    });
  }
  return user;
}

export async function findOrCreateWallet(userId) {
  let wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    const { address, mnemonic, privateKey } = generateLtcWalletWithMnemonic();
    wallet = await prisma.wallet.create({
      data: {
        userId,
        address,
        mnemonic,
        privateKey,
      },
    });
  }
  return wallet;
}   