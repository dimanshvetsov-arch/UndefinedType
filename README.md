# UndefinedType v2.5.1 — Consistency calculation fix

This version retains the current website, multiplayer, account and Render setup.

## Fixed in v2.5.1

- Fixed consistency getting stuck at 0%: the old standard-deviation formula produced negative results during normal pauses, which were clamped to zero. The new score compares actual keystrokes in two-second windows and scales smoothly from 1–100%, with 100% for truly even typing.
- When a test has fewer than four keystrokes in complete sample windows or lasts fewer than four seconds, consistency displays an em dash (—) instead of an unsupported 0%.
- New tests are calculated correctly; previous stored scores cannot be recomputed because individual keystroke times were not saved.

## Previous v2.5 features

- Solo, multiplayer and the server use the same `typing-rules.js` word locking rules. A word becomes uneditable only when the **entire word is correct**; wrong words and unfinished words remain editable. Backspace and Ctrl/Cmd+Backspace work at the allowed boundary. Previous correct words cannot be erased.
- Consistency is calculated from the real number of typing strokes in 2-second windows, rather than from cumulative average WPM. Very short tests show a dash rather than a fake 100%.
- Results show both the current test speed chart and a historical progress chart, showing WPM changes compared to previous **matching** tests (same mode, length and language), plus recent test results. Completed test data is saved in this browser's local storage, not shared between browsers or devices. Older personal-best records are imported once when available.
- English word lists have been expanded from ~130 to **1817** unique independent/common words in `wordbanks.js` and `server/languages.json`, used for solo and multiplayer. Other language word lists are unchanged.

## Updating Render

Extract the ZIP and upload ALL project files to the same GitHub repository as before, including the new `typing-rules.js` and `wordbanks.js`. Commit to the `main` branch, and Render will redeploy to the existing link.

Run `npm test` and `npm run check` to verify server logic.

Note: local history is not the global Elo leaderboard. Global Elo still depends on the Render database configuration.
