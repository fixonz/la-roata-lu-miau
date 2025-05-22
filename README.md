# La Roata lu' Miau! Telegram Bot

Un bot Telegram pentru gestionarea portofelelor LTC, depuneri, roata cu premii și administrare pentru restaurantele Miau.

## Structură proiect
- `bot/` – Logica botului Telegram
- `config/` – Fișiere de configurare (premii, admin, rate)
- `services/` – Servicii pentru portofel, depuneri, roată, admin
- `webapp/` – Webapp pentru roata cu premii (dinamic per spin)
- `utils/` – Utilitare (i18n, QR code, etc.)

## Setup rapid
1. Instalează dependențele:
   ```bash
   npm install --prefix la-roata-lu-miau-bot
   ```
2. Configurează `config/settings.json` cu ID-ul adminului și premiile dorite.
3. Rulează botul:
   ```bash
   npm start --prefix la-roata-lu-miau-bot
   ```

## Funcționalități principale
- Creare portofel unic LTC per utilizator
- Comanda /wallet: afișează adresa LTC și codul QR
- Comanda /deposit: instrucțiuni de depunere și adresă
- Comanda /balance: afișează SPINS disponibile, actualizate automat după depuneri
- Depuneri monitorizate prin Blockchair API
- Conversie LTC în SPINS după confirmări
- Roată cu premii configurabilă
- Istoric câștiguri și depuneri
- Notificări admin

## Securitate
- Mnemonic-ul portofelului este trimis doar adminului și stocat securizat

## Localizare
- Toate mesajele și butoanele sunt în limba română # la-roata-lu-miau
