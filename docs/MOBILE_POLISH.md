# Mobile polish

This pass adapts the existing dashboard and public pages without adding packages, services or database schema changes. The existing Bluey palette, Public Sans, event authorization and demo data remain in place.

## Navigation and layout

- Below 1024px, the persistent desktop sidebar becomes a menu dialog, with Teams, Kanban, Social Wall and Mentors available directly in a five-item bottom navigation bar. More exposes every page, theme, event exit and home. The menu closes on navigation; the desktop sidebar remains collapsible. The editing indicator requires both the current event's server-provided permission hint and the session cookie, so signing into event A does not prevent logging into event B.
- The compact header keeps the current page, event name and login/editing state readable. Long event names truncate in the header but are available in full in the menu. Core navigation/action icons are explicitly included in the existing icon bundle, avoiding requests to load essential mobile navigation icons.
- Dynamic viewport heights, safe-area padding and restrained spacing keep content above the bottom bar and phone notches. The add-team action and notifications sit above navigation. Focusing an editable dashboard field hides bottom navigation to give the keyboard more room.
- Inputs, selects and rich-text editors use at least 16px text on mobile; controls have 44px touch targets. Fields, grids and text wrap instead of making the page wider. Focus outlines, reduced-motion styling, skip navigation and dark body colors cover standalone pages too.

## Editing

`DialogShell.vue` owns a teleported dialog with a fixed header/footer and an independently scrolling body. Add Team, Edit Team, Login, confirmations and mobile navigation share it. It traps keyboard focus, supports Escape/backdrop/close, makes the background inert and restores focus/scroll state on unmount. **Mount it conditionally with `v-if`; do not keep it alive with `v-show`.** That lifecycle controls background locking. Dialogs fit short landscape viewports and keep submit/cancel reachable while the form scrolls.

Team headers wrap, actions have accessible names and usable targets, and guest edit/delete/add controls stay hidden. Notes use full-width creator/type fields and bounded scrolling textareas. Rich-text formatting is touch-friendly. Existing team abstracts, matrices, creator attribution, revision checks and serialized note writes are retained.

On phones below 768px, Kanban exposes three column tabs rather than requiring scrolling past every note in one status to reach the next. Use the existing status dropdown to move a note on touch devices; desktop drag-and-drop remains available. Filtering and edits still target the same underlying notes.

Settings form a single column on narrow phones, then progressively use more columns. Cards no longer have fixed maximum heights; password fields stack and feedback flows below fields. The password form now has an explicit **Save password** action, a pending state, inline success/error and the existing server-side password/session rotation. Other settings retain their autosave behavior. The unfinished backup upload is clearly disabled; JSON download remains available. The Log page has a truthful empty state and working links to Teams/Kanban, and empty legal footer links have been removed rather than presented as working pages.

## Social wall

The public wall starts in manual-scroll mode on narrow/touch devices and for reduced-motion preferences. Attendees can expand the full post. Its upload link is in normal layout flow, so it does not cover cards; phones say “Tap to add a photo, video or message.” QR images are requested only on desktop-sized displays. Full-screen, theme and optional auto-scroll remain available.

No animation frame loop runs when auto-scroll is disabled, the feed is empty or the tab is hidden. Hidden tabs also stop polling; returning refreshes the feed. Duplicate scrolling feed copies are inert for keyboard/screen-reader interaction. Upload pages add a return-to-wall link and comfortable form/preview/submit controls.

Moderation settings collapse behind a button on narrower screens, keeping posts and moderation actions near the top. Tabs scroll within their own region, sorting and links wrap, post attribution wraps and pending approve/reject controls remain accessible. The GitHub callback and repository picker also fit narrow widths and long repository/account names.

## Validation

The browser suite covers every route at **320×740, 390×844, 768×1024, 812×375 landscape and 1024×768**, with long Czech event/team/project content and assertions on document/main overflow. Touch workflows cover mobile navigation, repository picking, team create/edit/cancel, note text/status edits, mentor registration, rich-text matrix/abstract saves, confirmations, public wall expansion/upload/moderation, anonymous login, explicit password saves and continued authenticated writes. Keyboard tests cover focus containment, Escape and focus restoration; dark mode is verified across navigation/reload and standalone callback pages. Existing desktop regressions remain part of the same suite.

Representative light/dark mobile screenshots were inspected locally at `/tmp/dashhack-mobile-{teams,add-team,menu,settings-dark,wall-dark,upload-dark}.png`. Local review uses the isolated `.data/mobile-review.sqlite`, not the production database. Tests use `.data/playwright.sqlite` as before.

These are Chrome touch/viewport emulations, including a short viewport to check dialog actions; they are not a physical iOS Safari/Android keyboard or notch certification. The app uses native controls, standard safe-area/dynamic-viewport CSS and no device-specific SDK. The pre-existing Log/backup-upload functionality remains unfinished and is displayed honestly; this pass does not implement those separate backend features.

Verified **39 unit tests (241 assertions)**, **34 desktop/mobile browser scenarios**, a final hydration-aware 50-route/viewport overflow sweep and the production build. Production server build remains approximately **2.06 MB / 527 kB gzip**; no dependency or schema changes were introduced. Logs: `/tmp/dashhack-mobile-unit.log`, `/tmp/dashhack-mobile-e2e-complete.log`, `/tmp/dashhack-mobile-overflow-final.log`, `/tmp/dashhack-mobile-build.log`.
