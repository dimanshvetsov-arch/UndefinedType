# UndefinedType v1.8 — multiplayer update

## What's improved

- Ranked 1v1 (Elo changes), unranked 1v1 (no Elo changes), open/public rooms and private/invite rooms (no Elo changes).
- Automatic five-second start countdown; **no race time limit**. Match results appear when **both players finish**. Forfeits are handled separately.
- One text for both players. Your cursor is yellow and labeled **You**; your opponent has a purple, partly transparent cursor with their username. Their typed letters are never highlighted.
- Your correct characters appear yellow. Mistyped characters appear red, and the entire mistyped word gets a subtle underline until corrected.
- More comfortable mode cards and click-to-select private/open room and text length choices (30/60/80/100/150 words).
- Live elapsed clock, WPM and accuracy; scoreboard shows WPM, raw WPM, accuracy, errors, completion time, and Elo change for ranked matches.
- Multiplayer passage cannot be selected or pasted; the browser plays subtle typing sounds when audio is permitted. No audio-off setting in the website.
- Room links with `?room=ROOMCODE` automatically join users once signed in.

## Deploy an update without changing your link

1. Extract the ZIP.
2. Upload the **contents** (not the ZIP or enclosing folder) into the root of the same GitHub repository.
3. Commit, and allow your existing Render web service to redeploy.
4. Refresh the website with Ctrl+Shift+R. The web address stays the same.

## Test locally

Run `npm install`, `npm test`, `npm run check`, then `npm start`.

## Account persistence

For permanent accounts and Elo, configure `DATABASE_URL` (PostgreSQL) and a stable `SESSION_SECRET` on Render. Without database storage, a server restart or redeployment may reset accounts.

## Known limitations

Actual multiplayer requires a running Node.js server and WebSockets; opening `index.html` alone only allows solo typing. Browser sound effects may be blocked or muted by device/browser settings. This is a beta: test with two devices on your Render URL after deployment.
