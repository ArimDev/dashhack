# GitHub App and event organization

Organization: [AT&T Hackathon Junior 2026](https://github.com/AT-T-Hackathon-Junior-2026), handle `AT-T-Hackathon-Junior-2026`, organization ID `354027972`. Its existence and display name were verified through GitHub's public API on 2026-11-08. App registration is still pending; no live GitHub credentials have been configured or verified yet.

## 1. Student repository creation

Created and verified 15 team repositories on 2026-11-08: `team-01` through `team-15`, private, initialized with a README, with Czech team descriptions. Students can be invited as outside collaborators to their team's repository without organization membership. Repository names can later change, for example `team-15` → `team-15-phoenix`; update the team's saved DashHack URL after renaming to use the current repository address. Students should update their Git remotes too. Do not reuse the old name, which would replace GitHub's redirect.

Give team representatives this [repository creation link](https://github.com/new?owner=AT-T-Hackathon-Junior-2026). They must first accept an organization invitation, and organization member privileges must permit repository creation. Keep the organizer account as an owner. Create one repository per actual student team; grant students access to their own team repository. The existing demo repository URLs point to unrelated public reference projects and are not transferred automatically. A mentor links the resulting repository to its team in DashHack; a student self-registration page is not implemented.

## 2. Register a GitHub App

In the new organization's Settings → Developer settings → GitHub Apps, create an App. Give it a unique name, for example `Hackathon Junior 2026 DashHack`.

Use this [prefilled registration form](https://github.com/organizations/AT-T-Hackathon-Junior-2026/settings/apps/new?name=Hackathon%20Junior%202026%20DashHack&description=Read-only%20repository%20activity%20for%20AT%26T%20Hackathon%20Junior%202026.&url=https%3A%2F%2Fdashhack-production.up.railway.app&request_oauth_on_install=false&public=false&webhook_active=false&contents=read&metadata=read&members=read&callback_urls%5B%5D=https%3A%2F%2Fdashhack-production.up.railway.app%2Fgithub%2Fcallback&callback_urls%5B%5D=http%3A%2F%2Flocalhost%3A5002%2Fgithub%2Fcallback) and review the settings below before submitting. This uses GitHub's supported registration URL parameters; it does not create the App automatically.

| Setting | Value |
| --- | --- |
| Homepage URL | `https://dashhack-production.up.railway.app` |
| User authorization callback URL | `https://dashhack-production.up.railway.app/github/callback` |
| Additional local callback URL | `http://localhost:5002/github/callback` |
| Request user authorization during installation | **Off** — DashHack starts its own state/PKCE-bound authorization |
| Webhooks | **Inactive** — no webhook endpoint or background worker is needed |
| Repository permissions | **Contents: Read-only**, **Metadata: Read-only** |
| Organization permissions | **Members: Read-only**, used to verify the connecting user is an organization owner |
| Other permissions | None |
| Installation availability | Only this account, if the App belongs to the event organization; otherwise allow organization installation |

Copy the **App ID**, **Client ID**, and actual App slug. Generate a **client secret** and a **private key**. Store secrets directly in Railway Variables and a gitignored local `.env`; do not paste secrets into chat, commit them, or include them in screenshots. The private key can contain real newlines or literal `\n` escapes.

## 3. Configure the server

Set these server-only variables on the existing DashHack web service:

```dotenv
NUXT_GITHUB_APP_ID=APP_ID
NUXT_GITHUB_APP_CLIENT_ID=CLIENT_ID
NUXT_GITHUB_APP_CLIENT_SECRET=CLIENT_SECRET
NUXT_GITHUB_APP_PRIVATE_KEY=PRIVATE_KEY_PEM
NUXT_GITHUB_APP_SLUG=ACTUAL_APP_SLUG
NUXT_GITHUB_APP_BASE_URL=https://dashhack-production.up.railway.app
```

Use `NUXT_GITHUB_APP_BASE_URL=http://localhost:5002` for local development. All six values are required to enable connection. Restart/redeploy after setting Railway variables. These values are never included in Nuxt's public configuration or event backups.

## 4. Install and connect

1. Log in to the DashHack event and open Settings → GitHub App.
2. Select **Install / configure App**, install it on the event organization, and grant the intended repositories. For automatic discovery of newly created team repositories, select all repositories in this dedicated organization. Selected-repository installations require updating GitHub's selection when a team repository is added.
3. Return to DashHack Settings and select **Connect GitHub**.
4. Authorize with an organization owner account, then explicitly choose the organization to connect to this event.
5. Add/Edit Team → **Choose GitHub repository**. Search loaded repositories, load more if necessary, and select a repository to fill its URL. Saving the team persists the link; read-only commit charts use the installation connection.

Public visitors still see team repository links and commit/line activity totals, including totals for private repositories deliberately assigned to teams. Repository discovery requires the event login. This integration does not expose repository source files, create repositories or change repository permissions. The GitHub connection does not replace the event password or create individual mentor accounts.

## Implementation and limits

- One organization/account installation per event. One organization installation can supply all 15 teams. Reconnect to switch organizations. Existing personal-token settings remain a fallback only when no App connection exists.
- Native RS256 signing uses Bun/Node crypto; there is no added SDK, service or dependency. Installation tokens are limited to Contents/Metadata read, cached in memory (at most 16 installations), and refreshed before their one-hour expiry. Failed token requests are retryable; concurrent requests share a pending mint.
- OAuth uses PKCE, random HttpOnly browser state, session/event binding, ten-minute single-use SQLite flow records, and explicit installation selection. User tokens exist only during verification and are discarded; no refresh token is stored. A collaborator cannot share an organization's whole installation: the server verifies active owner membership, or ownership of a personal account.
- The callback page removes authorization parameters from its address bar and uses no-referrer/no-store headers. It POSTs completion from the same-origin page, preserving the existing Strict event-session cookie policy. Only the temporary correlation cookie uses SameSite=Lax.
- Schema 6 adds `github_connections` and `github_oauth_flows`; existing data is retained. Public event reads expose only a connection boolean. Full SQLite snapshots include installation identifiers and temporary state; public per-event exports do not transfer a GitHub connection.
- Activity requests accept only HTTPS github.com repository roots already assigned to a team in that event. This applies to both App and legacy-token authentication. Revoked or suspended installation access fails closed; disconnecting an event does not uninstall the App from GitHub or affect other events.
- The existing activity series still has its original commit-list pagination limitations. User tokens and private keys must not be copied into browser state, logs or public backups.

Initial integration validation: 29 unit tests (149 assertions), 24 browser scenarios, and the production build passed. Provider calls are mocked in the automated tests; real organization/App registration and OAuth authorization remain pending.

Official references: [create an organization](https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/creating-a-new-organization-from-scratch), [GitHub App user authorization](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user), [installation tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app), [installation repository API](https://docs.github.com/en/rest/apps/installations), [organization membership verification](https://docs.github.com/en/rest/orgs/members#get-an-organization-membership-for-the-authenticated-user).


## Guided setup — 2026-11-09

Authenticated event Settings → GitHub App now shows a Set up the GitHub App section until server configuration is complete. Its registration link prefills the organization above, the current app origin/callback and optional localhost callback, read-only Contents/Metadata/Members grants, a private App, and inactive webhooks/user authorization during installation. The callback and base URL are selectable read-only fields. A six-variable checklist reports only Set/Missing, never stored values; Refresh setup status reloads the authenticated status endpoint. Public visitors do not receive configuration diagnostics.

The production base URL `NUXT_GITHUB_APP_BASE_URL=https://dashhack-production.up.railway.app` has been set on the existing DashHack service. The remaining five variables need the actual App registration: ID, Client ID, Client Secret, Private Key PEM and slug. Enter them directly in Railway Variables, apply/redeploy, then refresh setup status. Install on `AT-T-Hackathon-Junior-2026`, grant all intended team repositories, and use Connect GitHub as an organization owner. Registration alone does not connect the event; the explicit account selection completes that step. Real OAuth/installation access can only be verified after these credentials and the owner's authorization are supplied. Do not send private keys or client secrets in chat.

The shared registration helper validates the origin and grants; no SDK, schema change, extra service, write permission, repository creation flow or polling is introduced. Setup diagnostics accept only matching event sessions. Existing native RS256/PKCE/owner-verification/repository-selection behavior remains. GitHub's current registration-URL parameters and PKCE/membership endpoints were checked against the official linked documentation.

Guided setup deployed as source `0eb62a8`, Railway `7febb235-c528-406a-96d1-4dc8e317e49e` (SUCCESS). Validation: 56 unit tests / 370 assertions, three Chromium and five WebKit/Safari/iPhone checks, production build and live setup/guest-denial/mobile checks pass. Live status confirms the base URL is set and only the five registration-derived values are missing. The GitHub account creation/authorization steps are not automated and real App access remains unverified until configured.
