# Discord setup

DashHack receives signed HTTP interactions in the existing Bun process. No Gateway connection, message scraper, bot daemon or extra package is needed. One Discord application/server is bound to one event; each configured team channel maps to one team.

## Organizer setup

1. Create **DashHack** at https://discord.com/developers/applications. General Information contains **Application ID** and **Public Key**.
2. In Discord enable Settings → Advanced → Developer Mode. Right-click the server and each team channel to copy their IDs. Keep team channels restricted to the appropriate students/organizers; channel access determines which team's commands they can use.
3. Log into the event in DashHack, open Settings → Discord, enter the app/key/server IDs and expand **Kanály týmů** to map channel IDs. Save. Commands may remain disabled during setup.
4. Set the app's **Interactions Endpoint URL** in Discord Developer Portal to `https://dashhack-production.up.railway.app/api/discord/interactions`. DashHack verifies Discord's signed PING even while commands are disabled. Do not enable privileged message/member intents or Administrator permissions.
5. Click **Nainstalovat příkazy do serveru** in DashHack and select the server. The install link requests only `applications.commands` with Guild Install context. If Discord's Installation settings restrict contexts, enable Guild Install. No mentor role is required.
6. In the application's **Bot** tab obtain/reset the bot token. Paste it only into the password field in authenticated DashHack Settings, then click **Registrovat /mentor a /matice**. The token goes over HTTPS to Discord for two guild-command upserts, is never stored/logged, and is cleared from the field after the attempt. Do not put it in chat or Git. Existing unrelated commands are retained. Rotating the token afterward does not stop signed HTTP interactions; use the new token for later command registration.
7. Enable **Povolit příkazy a formuláře**, save, and test `/mentor` and `/matice` in a mapped team channel. Discord may take a short time to expose guild commands. Unknown channels/servers and bot senders are rejected privately.

## Commands

- `/mentor` opens a short text modal. Submission creates a team-colored `help_request`, tracked in Kanban, To Do, medium priority. Optional `urgent: true` chooses high priority. Students cannot set Critical or attribute themselves as an event mentor. Verified Discord display name is appended; the numeric Discord user ID is stored in the event's private audit.
- `/matice` responds only to the requesting user with a link to their team's ten rich-text answers. The page supports partial answers, bold/italic/bullets, revision-checked saves and retained conflict drafts. Existing mentor attribution and other team data remain intact. Students do not receive the event password or an organizer session. The existing organizer XLSX exports include these saved answers.

The same channel maps all teammates to the same team. This does not verify roster membership beyond access to that Discord channel. Organizers must configure channel permissions; a student who can run commands in another team's configured channel can submit for that team.

## Security and limits

- Verify Ed25519 over the exact timestamp/raw body before handling PING or commands; reject timestamps more than five minutes away. The interaction body is bounded at 256 KiB with a ten-second read deadline. Invalid signatures use HTTP 401.
- Duplicate interaction IDs return the original result without creating another note or spending another submission allowance. Mentions are disabled in replies. No interaction payloads/tokens or bot token are logged/persisted.
- Matrix links carry a random flow ID plus HMAC in the URL fragment. The page removes it from browser history before fetching. A link must be claimed within ten minutes, once per browser; a separate HttpOnly/Secure/SameSite=Strict cookie grants only that team's matrix access until two hours after issuance. Links are bearer capabilities until claimed: forwarding an unused link permits the recipient to claim it. They are ephemeral Discord replies, not public team URLs.
- Every matrix read/write rechecks flow expiry, enabled settings, team existence and channel mapping. Saving settings rotates the link key and deletes all outstanding flows, including active student sessions. Disabling commands therefore stops existing forms too. Students can reopen `/matice` after setup changes.
- Rate windows are ten minutes: help submissions **5/user, 10/team**; form links **10/user, 20/team**; matrix saves **30/user, 100/team**. Discord delivery retries do not count again. The event is capped at 5,000 audit actions and 500 live form flows, with 1,000 notes per team. Expired flows and audit rows older than seven days are pruned when handling new actions. Latest 50 actions are visible to event organizers in Settings. These limits are SQLite-enforced and survive restarts; no IP identity is used.
- Form saves require the scoped cookie before buffering up to 6 MiB of rich-text JSON, enforce same origin, and reuse the matrix's ten keys/50,000-character per-answer limits. No names or answers are rendered as raw HTML. Stale team revisions reject the entire patch and retain the browser draft.
- Private configuration/audit endpoints require the ordinary matching event session. The public event API/export does not expose settings, flow secrets or Discord audit tables. Existing public read behavior is unchanged.

Schema 9 adds `discord_settings`, `discord_actions` and `discord_matrix_flows` transactionally without changing existing content. Full private SQLite backups include these records; public event JSON does not. Back up on the volume before deployment. One web replica remains required.

## Validation

`bun test tests/unit` includes migration preservation, owner/event/channel scope, signatures and replay windows, idempotency, rate limits, claim expiry/revocation, cookie separation, partial patches, revision conflicts and safe command registration. `tests/e2e/discord.spec.ts` exercises the actual signed HTTP endpoint, mentor creation/retry, organizer settings, mobile student forms, history stripping, conflict drafts, reused-link rejection and organizer-write denial. Tests use synthetic local events and generated signing keys; they never call real Discord with test tokens.

## Oversized Excel example

Run `bun scripts/example-startup-matrix-export.js` to generate `.data/examples/startupova-matice-dlouhy-text.xlsx`. All content is synthetic Czech text. A 50,000-character bold answer continues on a separate worksheet in safe-sized cells; a 2,200-character italic answer remains in the original colored box. The template's fixed row heights are preserved, so long in-box text can require a row-height adjustment for reading/printing. No text is discarded.

Implementation validation on 2026-11-10: **92 unit tests / 631 assertions**, three Chromium integration scenarios and the same three Safari/WebKit scenarios pass. Phone-width matrix/settings layout, private cookie, actual signed HTTP PING/mentor requests, duplicate suppression, partial saves and preserved conflict drafts were exercised. Production build passes. The synthetic XLSX independently opens in openpyxl without warnings, retains its logo/template colors and all long-answer text, and has valid ZIP CRCs. Actual Discord application registration/installation remains pending user setup; these tests do not claim a live Discord command has run.
