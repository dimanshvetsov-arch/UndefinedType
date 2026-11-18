# UndefinedType v2.3 — no copy/paste in typing tests

This is an update to the **existing** UndefinedType Node.js multiplayer website. Upload the **contents** of this ZIP to the root of the **same** GitHub repository and let the **same** Render Blueprint sync. The website URL does not need to change.

## v2.2: Backspace fix

- Fixed Backspace getting stuck in a misspelled word after erasing one wrong letter. The active word stays editable during correction, even when part of the word temporarily matches the reference.
- **Correct completed words remain locked**, and entering the next word locks the earlier word, as before.
- Fixed multiplayer input caret placement so an invisible textarea cannot accidentally delete letters in the middle while the player is typing at the end.
- Hardware Backspace and phone keyboard deletion now use the same guarded correction rule. This allows correcting mistakes on phones too (an update to v2.1's phone restriction), while still blocking changes to locked words.
- Backend enforcement uses the same correction state as the browser, preventing the server from rejecting valid corrections.

## Previous v2.1 changes

- **Elo:** Ranked wins increase Elo and ranked losses decrease it. The Elo K-factor shrinks as rating rises: below 1100 = 34; 1100–1399 = 28; 1400–1799 = 22; 1800–2199 = 16; 2200+ = 12. The opponent's rating and expected win chance also affect the amount. Unranked and private/open rooms never change Elo.
- **Global leaderboard:** The Leaderboards tab now displays online account Elo rankings from the server/database, not solo records stored in one browser. Refreshes when opened and periodically while viewing.
- **Login and sign-up in Settings:** Accounts can be created, logged into and logged out of on the Settings tab (and from the existing welcome screen). Login messages distinguish wrong password from an account that cannot be found. Login uses passwords hashed with scrypt, signed sessions, and PostgreSQL when configured.
- **Storage status:** The website clearly warns when a database is not connected. Without PostgreSQL, accounts and Elo on Render can disappear after a deployment or restart. With the database, they survive web deployments (subject to the database service itself remaining available).
- **Settings:** Removed Require Corrections and Typing Sounds controls. Kept color and reset controls; the accent and background color selectors appear as white circles around the selected color.
- **Mobile (v2.1):** Previously blocked all corrections on touch phones. **Superseded by v2.2**: mistakes can now be erased, but correctly completed words stay locked. The restart button generates a new text. The restart icon spins once and returns to its original angle automatically. Desktop retains word-correction behavior.
- **Race results:** The first player to finish sees a preliminary leaderboard **immediately**, while the other player continues typing. Final Elo is awarded when the match ends. Time is always a number (including a player who leaves), never “DNF”. A finish-order counter prevents tied timestamps from unfairly changing who finished first.
- Existing languages, room invites, ranked/unranked modes and 5-second countdown remain.

## Update your existing Render website

1. Download the ZIP and **extract** it.
2. Open your existing GitHub UndefinedType repository, upload the **files inside** the extracted directory to the root, replace old files, and **Commit changes**.
3. Go to Render → **Blueprints** → **UndefinedType** → **Syncs**. The updated `render.yaml` adds a **Free PostgreSQL database** named `undefinedtype-db` and connects it to the existing web service. Review and approve the Blueprint sync if Render asks. **Do not create another web service.**
4. Check Render → Resources and verify `undefinedtype` is **Live** and its `undefinedtype-db` is available. Then open the *same* website address, refresh, and create a new account if necessary.
5. You can visit `https://YOUR-EXISTING-SITE.onrender.com/api/status` to check whether `persistent` is `true`. If it says `false`, the database connection is not configured and login data is **not** safe across restarts. Check the web service's `DATABASE_URL` environment variable in Render (never share the actual URL/password).

### Important database warning

**Free Render PostgreSQL databases expire after 30 days**, with a limited grace period. To keep accounts and Elo long-term, use a supported persistent PostgreSQL provider/plan before expiry and back up or migrate your data. Render may show a cost when you choose a paid plan. Do not approve costs you don't intend to pay.

If your older website was running without a database, **previous accounts lost after a restart cannot automatically be recovered**. You may need to register them again once PostgreSQL is connected. The new code cannot recreate old lost passwords or Elo.

Docs: https://render.com/docs/free and https://render.com/docs/configure-environment-variables

## Local checks

```bash
npm install
npm run check
npm test
npm start
```

Server runs on `http://localhost:3000`. The unit/integration tests mock WebSockets, so they do not require a full real-world network connection.

## Known limitations

- Real multiplayer and Render integration must still be tested with **two real devices**. Browser screenshots were not verified in this build environment.
- Phone Backspace detection uses a coarse-pointer + small-screen check; some hybrid devices with both mouse and touch may be treated as a phone when narrow.
- Website sound effects depend on browser permissions, mute and device sound settings; websites cannot override browser/system mute.
- A single Node.js server instance handles matchmaking. Multiple application replicas would need shared matchmaking infrastructure; a common PostgreSQL database alone does not synchronize running rooms.


## v2.3 — Copy/paste protection in typing tests

- Solo generated typing tests, Zen free-typing sessions, and online races reject clipboard paste (keyboard shortcuts, right-click Paste, and phone/IME `insertFromPaste`), plus dragging text into the typing area.
- The displayed generated text cannot be selected/copied or dragged.
- Direct input event fallbacks ignore paste-origin insertions even if the browser did not fire a cancelable paste event.
- **Custom text setup still allows paste** to create a practice passage. Room invite links, login, and other normal fields also keep clipboard support.
- Browser-side blocking is not proof against a modified client or bots; the server still validates race progress, and stronger anti-cheat would require additional server-side checks.
