# La Roata lu' Miau! Webapp

## Ce face?

- Animă roata cu premii și afișează rezultatul unui spin, pe baza unui token unic generat de bot.
- Afișează un spinner.gif rotund și semi-transparent în centru în timpul animației.
- Redă sunetul de spin și (opțional) sunete unice pentru fiecare categorie de premiu.

## Cum adaugi fișiere?

- Pune `spinner.gif` în folderul `assets/`.
- Pune fișierele audio (ex: `spin.mp3`, `win.mp3`, `lose.mp3`, etc.) tot în `assets/`.
- Actualizează codul din `index.html` pentru a folosi fișierele noi dacă vrei sunete personalizate pentru fiecare categorie.

## Cum funcționează token-ul?

- Botul generează un token unic pentru fiecare spin și trimite utilizatorului un link cu acel token.
- Webapp-ul citește token-ul din URL și cere rezultatul de la backend (`/api/spin-result?token=...`).
- Tokenul este valabil doar câteva minute și nu poate fi refolosit. 