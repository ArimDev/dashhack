# GitHub App and event organization

Organization: [AT&T Hackathon Junior 2026](https://github.com/AT-T-Hackathon-Junior-2026), handle `AT-T-Hackathon-Junior-2026`, organization ID `354027972`. Its existence and display name were verified through GitHub's public API on 2026-11-08. App registration is still pending; no live GitHub credentials have been configured or verified yet.

## 1. Student repository creation

Created and verified 15 private placeholder repositories on 2026-11-08. On 2026-11-09, all were confirmed to contain only their initial README and were renamed for the real teams (505, AYA, BugBusters, …, YoGurts), preserving IDs and access; see [the current roster and invitation links](EVENT_TEAMS_2026.md). Production now links those repositories to the actual teams. Table numbers were applied from the user-confirmed seating plan on 2026-11-10; team names and repository paths now carry their prefixes, and existing invitation capabilities were preserved. Students can be invited as outside collaborators to their team's repository without organization membership. Repository names can later change; update the team's saved DashHack URL after renaming to use the current repository address. Students should update their Git remotes too. Do not reuse the old name, which would replace GitHub's redirect.

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


## Reusable student links with GitHub sign-in (current)

**One reusable private link per team.** Students open `/join#TOKEN`, select their own account on GitHub, and explicitly confirm the verified account before DashHack requests Write access. There is no username input and the server ignores any forged username. The same team link supports every teammate. A student still accepts the resulting repository invitation through email or [their profile invitations](https://github.com/settings/organizations); the UI never directs them to the inaccessible private repository `/invitations` page.

The user made App `hackathon-junior-2026-dashhack` public on 2026-11-09 to allow outside students to authorize it. Public App registration does not grant access to private repositories. The event's existing installation remains restricted to its permitted repositories. Administration Read/write must remain approved; Contents and Members stay read-only. Normal activity/discovery installation tokens remain read-only. The invitation path mints/revokes an uncached administration token scoped to the exact repository and grants only `push`, preserving existing higher privileges. Before granting, it checks the username's numeric GitHub ID still matches the OAuth identity.

The existing exact callback URL `/github/callback` handles both organizer and student flows, using separate API routes, state namespaces and cookies. Student OAuth state/PKCE verifiers are random, browser-bound, ten-minute, one-use values. A Secure HttpOnly SameSite=Lax cookie binds the return to the initiating browser. GitHub `/user` supplies the account ID/login; typed usernames are never trusted. Temporary user tokens are not stored or returned and are explicitly revoked after identification. Failed revocation is recorded. Confirmation requires the same browser and verified flow; repeated successful confirmations reuse the result. OAuth authorization itself never creates a repository invitation.

Schema 8 adds small SQLite tables for revocable links, temporary OAuth flows and a bounded audit trail. Existing events, teams, notes, connections and wall data are untouched. Tokens are random-ID + HMAC capabilities under server-only `NUXT_GITHUB_TEAM_INVITE_SECRET`; SQLite stores their hashes and bindings. Links bind the team, event, repository and installation, expire after seven days and remain stable when Get team links is clicked again. Team name/number changes preserve the link; repository/installation changes invalidate it. Revoking/reissuing a link creates a new capability. Clearing the server key pauses all use; rotating it invalidates all previous links and browser flows. Legacy stateless links are rejected outright.

Authenticated Settings → GitHub App → Student team invitations & audit has **Get team links**, Copy all, per-link revoke, revoke all, and the latest 200 audit entries. It records timestamps, team/link IDs, verified GitHub login/numeric ID, outcome, request ID, validated client IP and bounded user agent. Organizer actions identify a hashed event session; this shared login cannot identify a particular mentor. Up to 5,000 entries per event are retained; expired OAuth flows are cleaned on new sign-ins and capped at 2,000 globally. Neither audit nor console logs contain raw capability links, cookies, access tokens, client secrets, authorization codes or request bodies. Unknown-link denials are kept separately with request IDs for service investigation. Public event data/backups contain no invitation/audit records; full private SQLite snapshots do.

Claims use same-origin JSON, a 4 KiB/ten-second body bound and bounded in-process admission before token validation (four concurrent requests, 600 total / 300 per network per ten minutes for each route). These limits allow students sharing school Wi-Fi. Failed requests count, Retry-After is supplied, and GitHub has its own quotas. The gate resets at restart; audit and link revocation persist. No SDK, extra service or polling is added.

A shared team link is intentionally transferable: anyone given or forwarded it can sign in as **their own** GitHub account. OAuth prevents accidentally inviting somebody else's typed username; it does not prove team membership or prevent forwarding. Revoke a leaked link and retrieve a replacement. Revoking DashHack links does not remove existing GitHub collaborators or invitations already issued; cancel those separately in GitHub if necessary.

All original 30-day username-entry links were disabled before this upgrade. The unexpected `jirik` request was confirmed by the user to be a friend's typo, not evidence of a leak; proxy logs correlated both test submissions with the same IP/browser, not a verified human. During containment all 16 organization repositories were checked and no pending App invitations remained; the test repository had only the owner's admin access. No collaborators were removed.

Temporary team **TEST - Zkouška pozvánky** and private repository `AT-T-Hackathon-Junior-2026/test-team-invitation` remain for a real test. Cleanup IDs/current link are kept only in the ignored 0600 `.data/test-team-invitation.json`. Remove them after the user finishes; never commit actual links or put them in public roster docs/CSV.

Official references: [GitHub App visibility and outside-user authorization](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/making-a-github-app-public-or-private), [GitHub App user tokens and PKCE](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), [account picker](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps), [revoke a temporary user token](https://docs.github.com/en/rest/apps/oauth-applications#delete-an-app-token), [repository invitations](https://docs.github.com/en/rest/collaborators/collaborators).

Previous releases `e3c5299` (username claim) and `b74f9e8` (email/notifications instructions) are historical; they are superseded by this OAuth flow.

The user requested the profile invitation page as the primary acceptance destination: `https://github.com/settings/organizations`. The join button and public roster references now use this exact URL, with email acceptance retained. This changes navigation only; students still receive repository collaborator invitations, not organization membership.
