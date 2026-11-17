# undefinedtype — online multiplayer beta

This is the existing solo typing site with the **undefinedtype** name and a real WebSocket-based private 1v1 beta. The uploaded purple-and-white logo is preserved.

## Run locally

Install Node.js 20+ and run:

```bash
npm install
npm start
```

Open **http://localhost:3000** in two separate browser windows. Choose Multiplayer, create a room in the first window, join using the code in the second, and click Ready in both. A five-second countdown starts, both players see the same text, and the server broadcasts progress and declares a winner.

Opening `index.html` directly still works for solo typing, but multiplayer requires the Node server.

## Put it online

1. Create a GitHub repository and upload these project files (including `server/`).
2. On [Render](https://render.com), choose New → Blueprint and connect the repository. Render reads `render.yaml`.
3. After deployment, open the HTTPS URL Render gives you. The same URL hosts the site and multiplayer WebSocket endpoint.
4. Share that URL with another player and test a room.

The free service may sleep while idle, causing a delay on the first connection. Configure a paid always-on service for dependable availability. You can later use a custom domain. Vercel can host the static frontend separately, but then the WebSocket URL and CORS/origin settings must be configured for the separate backend.

## Current limitations

- Real online private 1v1 rooms with server-generated English text, a five-second countdown, progress updates, timed matches and disconnect forfeits.
- The current server accepts only correct-prefix input for matches (mistakes must be corrected locally); the server validates progress but is **not a robust anti-cheat solution**.
- Room state is in memory; a server restart clears active matches.
- No persistent accounts, ranked Elo, global matchmaking, public leaderboards, or tournaments yet.
- No public URL has been deployed by the assistant. Deployment requires your hosting account.
- Use an HTTPS host for production; don't share sensitive personal information in public usernames.
