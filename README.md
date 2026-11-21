# UndefinedType v2.5.3 — Easier typing words + interactive WPM graphs

## Updates
- Beginner-friendly **English** typing words: short, familiar, easy-to-type words such as *water*, *some*, *home*, *school*, and *happy*. More common words appear more often, but the larger everyday-word list keeps tests varied.
- English vocabulary and word-selection rules match between solo and multiplayer: players receive identical text in a race.
- **Hover a dot** on either WPM graph to see the precise WPM and, where relevant, the test number/date or time into the test.
- **Tap graph dots on phone** or focus a graph and use left/right arrow keys to explore WPM values.
- Existing features, other 69 languages, accounts, Elo, and Render settings are unchanged.

## Deploy to your existing website
Extract this ZIP. Upload and replace the files in your original GitHub repository. Make sure `typing-rules.js`, `wordbanks.js`, `server/languages.json`, `app.js`, `index.html`, and `style.css` are updated together. Commit. Your existing Render service should redeploy at the same URL.

## Tests
Run `npm test` and `npm run check` (Node.js 20+). The browser hover test is `python tests/browser_graph_hover.py` (requires Playwright and Chromium).
