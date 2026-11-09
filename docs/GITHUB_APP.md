# GitHub App and event organization

Organization: [AT&T Hackathon Junior 2026](https://github.com/AT-T-Hackathon-Junior-2026), handle `AT-T-Hackathon-Junior-2026`, organization ID `354027972`. Its existence and display name were verified through GitHub's public API on 2026-11-08. App registration is still pending; no live GitHub credentials have been configured or verified yet.

## 1. Student repository creation

Created and verified 15 private placeholder repositories on 2026-11-08. On 2026-11-09, all were confirmed to contain only their initial README and were renamed for the real teams (505, AYA, BugBusters, …, YoGurts), preserving IDs and access; see [the current roster and invitation links](EVENT_TEAMS_2026.md). Production now links those repositories to the actual teams. Team numbers remain unassigned. Students can be invited as outside collaborators to their team's repository without organization membership. Repository names can later change; update the team's saved DashHack URL after renaming to use the current repository address. Students should update their Git remotes too. Do not reuse the old name, which would replace GitHub's redirect.

Give team representatives this [repository creation link](https://github.com/new?owner=AT-T-Hackathon-Junior-2026). They must first accept an organization invitation, and organization member privileges must permit repository creation. Keep the organizer account as an owner. Create one repository per actual student team; grant students access to their own team repository. The earlier unrelated public reference repository URLs have been removed from the production team roster. A mentor links the resulting repository to its team in DashHack; a student self-registration page is not implemented.

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

Public visitors still see team repository links and commit/line activity totals, including totals for private repositories deliberately assigned to teams. Repository discovery requires the event login. This integration does not expose repository source files or create repositories. Activity and discovery stay read-only; the optional reusable student-link feature below can invite collaborators with Write access. The GitHub connection does not replace the event password or create individual mentor accounts.

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


## Reusable student links

Generic GitHub invitation acceptance URLs require a named invitation first. DashHack now supplies private, reusable per-team claim links: students open `/join#SIGNED_TOKEN`, enter their own GitHub username and receive an automatic **Write** repository invitation. They accept it on GitHub; no event login or organization membership/organizer action is needed. The GitHub App stays private; student OAuth is not required. Existing writers/admins are recognized without modifying their permissions. Existing readers upgraded by GitHub receive a direct repository link.

One-time setup: Repository Administration **Read and write** must be enabled on the App and approved on its organization installation. The user completed this for App 5686160 / installation 180287370; read-back confirmed it. Contents and Members stay read-only. Normal activity/discovery tokens remain read-only. Only invitation submission mints a separate uncached administration token scoped with `repository_ids` to the one linked repository, grants `push` to the supplied personal account and attempts immediate token revocation. Tokens and provider credentials never reach the browser or SQLite.

`NUXT_GITHUB_TEAM_INVITE_SECRET` is a new server-only random signing key, configured directly on Railway. Clear it to disable all claim links; rotate it to permanently invalidate existing links without rotating the App key. Signed claims bind event ID, stable team ID, exact repository and installation ID, expiring after 30 days. Team renames/number additions retain a valid link if the repository is unchanged. Deleting a team, changing its repository or disconnecting the event invalidates its link. Regenerating links alone does not revoke older unexpired ones. No database migration, worker or SDK.

Authenticated Settings → GitHub App → Student team invitation links → Get team links returns the links, with Copy all team links and selectable individual fields. Public event data/backups never include them. They are bearer capabilities: anyone holding a team link can request Write access to that team. Share each only with its intended team. Link tokens use URL fragments so HTTP route logs/referrers do not contain the capability; the join page/API use no-referrer/no-store, and the page is noindex. Never commit actual links into this public repository or the public roster CSV.

Public requests accept at most 4 KiB JSON with a ten-second read deadline. Origins are checked, and a bounded in-process gate permits four concurrent submissions, 120 attempts globally / 60 per network / 12 per team / 2 per team+username per ten minutes. Railway's validated X-Real-IP is used only behind Railway. All limits include failed attempts; responses provide Retry-After. GitHub also applies its own invitation limits. The gate resets on process restart; signed links remain valid. No student usernames, invitation tokens or elevated credentials are persisted by DashHack.

Official references: [add collaborators and required Administration permission](https://docs.github.com/en/rest/collaborators/collaborators), [installation tokens scoped to repository IDs](https://docs.github.com/en/rest/apps/apps#create-an-installation-access-token-for-an-app).


Reusable links deployed as source `e3c5299`, Railway `25b09c51-dac8-44ac-86bb-b5e0b5091b4c` (SUCCESS). Actual App and installation Administration write were read back. A real single-repository privileged token was minted/revoked successfully without inviting anyone. Organization policy allows outside collaborators and does not require 2FA. All 15 private links were generated and anonymously preview-verified against their exact team/repository. Organizer Get/Copy UI and 390px join layout pass. A live submission with the existing organization owner correctly returned alreadyHasAccess without modifying permissions or sending an invitation. Fresh-recipient grants were tested against a mocked provider through the production server, not sent to an unrelated test recipient.

Validation: 64 unit tests / 403 assertions, five Chromium and four Safari/iPhone WebKit checks, production build and isolated production API smoke checks pass (owner-only generation, anonymous preview/grant, repository binding, tamper/origin/oversize rejection, throttling/Retry-After, privileged token revocation). An older X test's moving clock was frozen relative to its fixture to prevent unrelated 24-hour expiry failures. No live X/Instagram request.

### Invitation acceptance and GitHub 404

After submitting a username, students see explicit Czech steps: check the GitHub account's email (including spam), verify that the browser is signed into the exact invited username, then use View invitation and accept. GitHub notifications provide an alternative. Private repository access starts after acceptance; the repository link is labelled accordingly. A 404 help box explains checking the account and contacting the organizer if it persists, without encouraging duplicate invitation requests.

On 2026-11-09 the temporary test repository had non-expired pending invitations, and GitHub itself returned the same `/invitations` URL reported as 404. This confirms invitation creation, not the recipient's browser session or successful acceptance. The service now uses GitHub's returned `html_url` when it matches the expected HTTPS GitHub repository invitation route, retaining any provider query; unexpected destinations fall back to the known route. The email route and notifications are documented by [GitHub's collaborator API](https://docs.github.com/en/rest/collaborators/collaborators#add-a-repository-collaborator). No OAuth, account sign-in, or automatic acceptance is performed on the student's behalf.

Temporary team **TEST - Zkouška pozvánky** and private repository `AT-T-Hackathon-Junior-2026/test-team-invitation` were requested for a real student test. Cleanup IDs/link are in the ignored 0600 `.data/test-team-invitation.json`; do not delete until the user finishes testing. Removing the team invalidates its DashHack link; remove the temporary repository separately. Real roster remains intact.
