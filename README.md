# UndefinedType v1.6 — clean cursor label

UndefinedType combines the existing solo typing tests with multiplayer. Two signed-in people can race through **the same text** in real time. There are **open rooms**, **private invite rooms**, and **ranked 1v1 matchmaking** with Elo.

## New: Click-to-join room invitations

1. Create a **private** or **open** room in multiplayer and click **copy invite link**.
2. Send the copied URL (`https://YOUR-SITE.onrender.com/?room=XXXXXXXX`) to another person.
3. Opening that link takes them **straight to multiplayer**. If they are already signed in, UndefinedType automatically joins the room, without typing a code or pressing Join.
4. If the visitor isn't signed in, the welcome/login screen explains the invite. After logging in or registering, they **automatically join** the room. Guests cannot join multiplayer.
5. When the second player arrives, the **automatic five-second countdown** starts. No Ready button.

Invites are valid only while the host's room is waiting for a second player. If the host leaves, the room fills, or the race has started, the guest will see an error and can request a fresh link. A visitor can also cancel an invite to choose another mode. The room code is removed from the address bar after a successful join; the host can always use **copy invite link** to invite someone again.

## What's improved

- First visit: choose **continue as guest** (solo typing), **log in**, or **create account**. No separate nickname is requested. Multiplayer needs an account.
- An automatic **five-second countdown** begins when two players join; there is no Ready button. No typing is accepted before the server starts the match.
- Two synchronized text lanes use the solo test's letter colors and caret style: **yellow for you**, **purple for the opponent**, with a divider between them.
- Both players see their WPM, accuracy, progress, and the result. Mistakes reduce accuracy even if corrected later.
- **Open rooms** appear in a live public-room list. **Private rooms** are invite-only via code/link.
- **Ranked matches** start with 1000 Elo. The search continuously checks for opponents, beginning with similar Elo ratings and gradually widening the acceptable range. A match win changes Elo; quitting mid-race counts as a forfeit. Unranked rooms do not change Elo.
- Improved guest/login handling, stable signed login tokens, room cleanup, more secure static file serving, and server-side limits on clearly impossible typing jumps.

## Run locally

1. Install Node.js 20 or newer.
2. Open a terminal inside this directory.
3. Run `npm install`.
4. Run `npm start`.
5. Visit `http://localhost:3000`. Open a second browser or private window, register a different account, and test a race.

Check code: `npm run check`

Backend tests: `npm test`

Note: The automated backend tests use an in-memory WebSocket simulation. The optional `tests/browser_smoke.py` requires Python + Playwright + Chromium and uses a simulated server to test the UI. These tests are not a substitute for testing two browsers on your deployed Render service.

## Update your existing Render website

**Do not create a new Render service.**

1. Extract the ZIP. The files `render.yaml`, `package.json`, `server/index.js`, `multiplayer.js`, `index.html`, and `style.css` should be **at the same repository paths** as before.
2. Go to your existing GitHub `UndefinedType` repository and **upload/replace the files and folders inside this ZIP**, not the ZIP itself. Make sure `render.yaml` stays at repository root.
3. Click **Commit changes**. Render normally redeploys when a commit reaches your connected `main` branch.
4. In Render, check the Web Service → Events/Logs until deployment succeeds. Visit your existing `.onrender.com` link.
5. Test with **two different accounts** on two browsers/devices: open room, private room, ranked match, countdown, typing, and results.

## Keeping user accounts and Elo permanently

By default this app stores accounts in `server/users.json`. **Render Free has an ephemeral filesystem, so accounts and Elo may disappear after a restart or deployment.** The file is excluded from Git by `.gitignore`.

For real long-term accounts, use a managed PostgreSQL database. In your existing Render service, go to **Environment** and add `DATABASE_URL` with your database's PostgreSQL connection string. Do **not** put database passwords or `.env` files on public GitHub. The server creates its users table on first connection.

Set a long random **`SESSION_SECRET`** in Render Environment so users can remain logged in across restarts. This release's `render.yaml` requests that Render generate one for Blueprint-created services. If you're updating an existing service, check that it is actually present.

Accounts don't yet support email verification, password reset, moderation, or multi-server scaling. Elo and matches are designed for one Node.js server instance. This is a better-tested beta, not a complete production anti-cheat or authentication platform.

## Files

- `index.html`, `style.css`: website and UI
- `app.js`: solo typing modes and settings
- `multiplayer.js`: account and multiplayer UI
- `server/index.js`: HTTP authentication, room matchmaking, game engine, leaderboard, database integration
- `render.yaml`: existing Render Blueprint service configuration
- `logo.png`: the existing UndefinedType logo
- `.gitignore`: protects private data and secrets from being committed


## v1.4 line-following multiplayer

- One shared paragraph with **no highlighted progress text** for either player. Both players type the same underlying passage.
- A full-opacity yellow vertical caret labelled `You` follows your character position.
- A softer ~74%-opacity purple vertical caret labelled with the **opponent's username** follows their character position.
- The viewport displays your **current row and the row immediately ahead**. When you reach a new visual row, that row moves up to become the first visible row. You can use Space or Enter where a space is expected to advance normally.
- Opponent one row ahead: purple caret appears on the second visible row. When you reach that row, both markers appear on the first visible row. Opponent two or more rows ahead/behind: their caret is hidden in the text view (progress panel still shows their WPM and progress).
- Invite links, accounts, Elo ranked matchmaking and open/private rooms are unchanged.

### Changing your main link

The free Render URL comes from the service name (`something.onrender.com`). In Render, open the web service, then **Settings → General → Name**. If managed by Blueprint, also update `name:` in `render.yaml`. For `yourname.com`, you need a purchased custom domain and Render → **Settings → Custom Domains**; you cannot remove `.onrender.com` for free.

## v1.5 minimal multiplayer display

- Removed the “one text. live positions.” heading and the entire color legend to the right.
- The opponent's **name appears only next to their moving cursor**; the name automatically reflects the account of the other player.
- Player name labels are now plain **yellow** and **purple** text without colored backgrounds, gradients, pills or shadows.
- The multiplayer text area uses a solid dark background instead of a gradient.
- Kept shared text, two-line following, transparent opponent caret, auto-start countdown, invite links, accounts, open/private rooms, and ranked Elo behavior unchanged.

## v1.6 cursor label

- The yellow multiplayer cursor now displays **You**, instead of **your text**. All other visuals and multiplayer behavior remain unchanged.
