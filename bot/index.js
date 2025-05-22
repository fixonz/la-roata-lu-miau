import { Telegraf } from 'telegraf';
import * as fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { findOrCreateUser, findOrCreateWallet } from '../services/wallet.js';
import * as QRCode from 'qrcode';
import { checkAndUpdateDeposits } from '../services/deposit.js';
import { getUserSpinsBalance } from '../services/balance.js';
import { spinWheelWithToken } from '../services/spin.js';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const prisma = new PrismaClient();

// Load config
const configPath = path.join(__dirname, '../config/settings.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Load admin IDs from .env if present
let adminIds = config.adminIds || [];
if (process.env.ADMIN_IDS) {
  adminIds = process.env.ADMIN_IDS.split(',').map(id => id.trim());
}

// TODO: Replace with your actual bot token
const BOT_TOKEN = process.env.BOT_TOKEN || '';
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is not set in environment variables');
}

const bot = new Telegraf(BOT_TOKEN);

function mainMenuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Spin', callback_data: 'spin' },
          { text: 'Balance', callback_data: 'balance' },
          { text: 'Deposit', callback_data: 'deposit' },
          { text: 'Wallet', callback_data: 'wallet' }
        ]
      ]
    }
  };
}

async function handleStart(ctx) {
  const telegramId = String(ctx.from.id);
  const username = ctx.from.username || `user${telegramId}`;
  const user = await findOrCreateUser(telegramId, username);
  // Send welcome image and message
  await ctx.replyWithPhoto({ source: 'assets/welcome.png' }, {
    caption: `👋 Bun venit la Roata lui Miau!

ID-ul tău: ${username}

🎰 Pacanele si droguri? De cand asteptai asta. Hai sa bagi o gheara!  🐈‍⬛
💸 Adaugă LTC în portofelul tău iar fiecare rotire iti poate aduce ceva in farfurie! 🍽

🛍 Toate produsele Miau aici @restauranterobot
🛒 Pentru comenzi bulk @mrykane1`,
    parse_mode: 'HTML'
  });
  await ctx.reply('Folosește butoanele de mai jos pentru a naviga.', mainMenuKeyboard());
}

async function handleWallet(ctx) {
  const telegramId = String(ctx.from.id);
  const username = ctx.from.username || `user${telegramId}`;
  const user = await findOrCreateUser(telegramId, username);
  const wallet = await findOrCreateWallet(user.id);
  const qrBuffer = await QRCode.toBuffer(wallet.address);
  await ctx.replyWithPhoto({ source: qrBuffer }, {
    caption: `Adresa ta LTC pentru depuneri:\n${wallet.address}`
  });
  await ctx.reply('Folosește această adresă pentru a depune LTC și a primi SPINS!', mainMenuKeyboard());
}

async function handleDeposit(ctx) {
  const telegramId = String(ctx.from.id);
  const username = ctx.from.username || `user${telegramId}`;
  const user = await findOrCreateUser(telegramId, username);
  const wallet = await findOrCreateWallet(user.id);
  const qrBuffer = await QRCode.toBuffer(wallet.address);
  await ctx.replyWithPhoto({ source: qrBuffer }, {
    caption: `Adresa ta LTC pentru depuneri:\n${wallet.address}`
  });
  await ctx.reply(`Pentru a depune LTC, trimite suma dorită la adresa ta unică:\n${wallet.address}\n\nDupă 1 confirmare vei vedea suma ca "pending". După 2 confirmări, suma va fi convertită în SPINS!`, mainMenuKeyboard());
}

async function handleBalance(ctx) {
  const telegramId = String(ctx.from.id);
  const username = ctx.from.username || `user${telegramId}`;
  const user = await findOrCreateUser(telegramId, username);
  const wallet = await findOrCreateWallet(user.id);
  let spins = 0;
  let error = false;
  try {
    await checkAndUpdateDeposits(user.id, wallet.address, config.spinPriceLTC);
    spins = await getUserSpinsBalance(user.id);
  } catch (e) {
    error = true;
    spins = 0;
  }
  let msg = `SPINS disponibile: ${spins}\nFiecare spin costă ${config.spinPriceLTC} LTC. Depune LTC pentru a primi mai multe SPINS!`;
  if (error) {
    msg = `Nu am putut verifica depozitele (API indisponibil).\nSPINS disponibile: 0\nFiecare spin costă ${config.spinPriceLTC} LTC. Depune LTC pentru a primi mai multe SPINS!`;
  }
  await ctx.reply(msg, mainMenuKeyboard());
}

const WEBAPP_BASE_URL = process.env.WEBAPP_BASE_URL || 'http://localhost:3000/webapp/index.html';

async function handleSpin(ctx) {
  const telegramId = String(ctx.from.id);
  const username = ctx.from.username || `user${telegramId}`;
  const user = await findOrCreateUser(telegramId, username);
  try {
    const result = await spinWheelWithToken(user.id);
    const webappUrl = `${WEBAPP_BASE_URL}?token=${result.token}`;
    await ctx.reply(
      `Apasă pe link pentru a vedea roata și rezultatul tău animat:\n${webappUrl}`,
      {
        ...mainMenuKeyboard(),
        reply_markup: {
          ...mainMenuKeyboard().reply_markup,
          inline_keyboard: [
            [
              { text: 'Deschide Roata (WebApp)', web_app: { url: webappUrl } }
            ],
            ...mainMenuKeyboard().reply_markup.inline_keyboard
          ]
        }
      }
    );
  } catch (e) {
    await ctx.reply(e.message || 'Eroare la spin. Încearcă din nou.', mainMenuKeyboard());
  }
}

// Admin command to add spins: /addspins <username|user_id> <amount>
bot.command('addspins', async (ctx) => {
  const telegramId = String(ctx.from.id);
  if (!adminIds.includes(telegramId) && !adminIds.includes(Number(telegramId))) {
    await ctx.reply('Nu ai permisiunea să folosești această comandă.', mainMenuKeyboard());
    return;
  }
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 2) {
    await ctx.reply('Folosește: /addspins <username|user_id> <amount>', mainMenuKeyboard());
    return;
  }
  const [userRef, amountStr] = args;
  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('Cantitate invalidă.', mainMenuKeyboard());
    return;
  }
  // Find user by username or user_id
  let user = null;
  if (/^\d+$/.test(userRef)) {
    user = await prisma.user.findUnique({ where: { id: Number(userRef) } });
  } else {
    user = await prisma.user.findFirst({ where: { username: userRef.replace(/^@/, '') } });
  }
  if (!user) {
    await ctx.reply('Utilizatorul nu a fost găsit.', mainMenuKeyboard());
    return;
  }
  // Credit spins
  await prisma.transaction.create({
    data: {
      userId: user.id,
      amount,
      type: 'BONUS',
      prizeName: 'SPINS',
      prizeValue: `${amount} SPINS`,
    },
  });
  await ctx.reply(`Am adăugat ${amount} SPINS pentru utilizatorul ${user.username || user.id}.`, mainMenuKeyboard());
  try {
    await ctx.telegram.sendMessage(user.telegramId, `Adminul ți-a adăugat ${amount} SPINS!`);
  } catch (e) {}
});

bot.start(handleStart);
bot.command('wallet', handleWallet);
bot.command('deposit', handleDeposit);
bot.command('balance', handleBalance);
bot.command('spin', handleSpin);

// Inline keyboard handlers
bot.action('spin', async (ctx) => { ctx.answerCbQuery(); await handleSpin(ctx); });
bot.action('balance', async (ctx) => { ctx.answerCbQuery(); await handleBalance(ctx); });
bot.action('deposit', async (ctx) => { ctx.answerCbQuery(); await handleDeposit(ctx); });
bot.action('wallet', async (ctx) => { ctx.answerCbQuery(); await handleWallet(ctx); });

// Start polling
bot.launch();

console.log('La Roata lu\' Miau! bot started...'); 