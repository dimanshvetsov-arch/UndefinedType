# UndefinedType v2.4 — Reliable correction + keyboard shortcuts

**Update your existing Render site:** Upload the extracted project files to the root of the same GitHub repository, replace older versions, click **Commit changes**, and let Render redeploy. Your existing URL does **not** change.

## Changes

- **Header:** The top-left wordmark now reads **UndefinedType**, with no space: white **Undefined** and accent-yellow **Type**. Both U and T are capitalized.
- **Regular Backspace:** Correct mistakes in the active word. The correction remains open until you erase as much of that word as necessary, even if the remaining prefix looks correct.
- **Ctrl+Backspace / Cmd+Backspace / Option+Backspace:** Delete the **current editable word** at once. This works in both solo and multiplayer.
- **Delete key:** Also works as a backward correction at the end of the typing test.
- **Phone/IME:** Supports `deleteContentBackward` and `deleteWordBackward`, including a fallback for keyboards sending only an input event.
- **Word-locking rules:** A correctly completed word stays locked. A wrong word can be corrected until you begin typing the next word; earlier words remain protected.
- **Multiplayer backend:** Accepts an atomic whole-word correction, rather than rejecting it because it removed more than one letter. Server rules still prevent changing locked words.
- **Copy/paste protection:** Preserved from v2.3. The Custom Text *setup* still allows pasting, but typing-test inputs don't.

## Install/update

1. Extract the ZIP.
2. In your existing UndefinedType GitHub repository, replace the old files with those from inside this project folder.
3. Commit changes.
4. In Render, use your existing service; wait for it to show **Live**.
5. Hard-refresh with **Ctrl+Shift+R** on PC or reload the page on phone.

For local tests, install dependencies with `npm install`, then run `npm run check` and `npm test`. Browser checks are in the `tests` folder.

**Note:** Accounts and global Elo need persistent PostgreSQL configured on Render. Without a database, data may disappear after redeployments.
