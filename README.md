# UndefinedType v2.5 — Word correction, consistency & history

This version retains the current website, multiplayer, account and Render setup.

## Fixes

- Solo, multiplayer and the server use the same `typing-rules.js` word locking rules. A word becomes uneditable only when the **entire word is correct**; wrong words and unfinished words remain editable. Backspace and Ctrl/Cmd+Backspace work at the allowed boundary. Previous correct words cannot be erased.
- Consistency is calculated from the real number of typing strokes in 2-second windows, rather than from cumulative average WPM. Very short tests show a dash rather than a fake 100%.
- Results show both the current test speed chart and a historical progress chart, showing WPM changes compared to previous **matching** tests (same mode, length and language), plus recent test results. Completed test data is saved in this browser's local storage, not shared between browsers or devices. Older personal-best records are imported once when available.
- English word lists have been expanded from ~130 to **1817** unique independent/common words in `wordbanks.js` and `server/languages.json`, used for solo and multiplayer. Other language word lists are unchanged.

## Updating Render

Extract the ZIP and upload ALL project files to the same GitHub repository as before, including the new `typing-rules.js` and `wordbanks.js`. Commit to the `main` branch, and Render will redeploy to the existing link.

Run `npm test` and `npm run check` to verify server logic.

Note: local history is not the global Elo leaderboard. Global Elo still depends on the Render database configuration.
