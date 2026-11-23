# SİMART — Project Context for Claude Code

This file is the handoff doc for continuing work on SİMART in a fresh Claude
Code session. It was written at the end of a Cowork (cloud) session that did
a round of icon/logo/UX polish and a first pass at real YouTube content
integration. Read this fully before making changes — it captures decisions
that aren't obvious from the code alone.

## Repo layout

This is now a monorepo: the Vite/React app described below lives in
`frontend/` (not the project root), and an empty `backend/` folder sits
alongside it for the future backend work described in "Content system"
below. `CLAUDE.md` stays at the project root (not inside `frontend/`) so
Claude Code picks it up automatically regardless of which subproject you're
working in. Every relative path mentioned elsewhere in this file (e.g.
`src/lib/icons.tsx`) is relative to `frontend/`, not the repo root — run
`npm` commands from inside `frontend/`.

## What this project is

SİMART is an Azerbaijani-language family app for kids' digital wellbeing:
habit tracking, "animations" (video content), focus-mode screen-time locks,
mini-games mapped to cognitive axes, a league/rewards system, a kid's wallet
with parent-approved allowance, and a parent analytics dashboard gated by a
PIN. A real backend exists in `backend/` (ASP.NET Core 9, CQRS via MediatR)
with two slices, both called by the frontend now: content
(`GET /api/content/playlists`) and account creation + login
(`POST /api/identity/signup`, `POST /api/identity/login`,
`POST /api/identity/families/{id}/children`) — described below and in
`backend/README.md`. **Account creation requires the backend to be
running** — `SignupPage`/`AddChildPage` write real rows, not local-only mock
data, so a signup attempt with the backend down fails outright (shows an
error, doesn't navigate) rather than silently falling back to local storage.
Auth is JWT bearer tokens, issued by signup (auto-login) and by
`POST /api/identity/login` — **`LoginPage.tsx` at `/giris` now calls it, and
is the app's default entry point**, with signup reachable via a button from
there; see "Family login" below for the full story. Habits (catalog +
completions, see "Family habits" below), Focus Mode's video-limit lock
(see "Focus Mode" below), Leagues' reward store + parent approval (see
"Leagues" below), and the Social feed/likes/comments/leaderboard (see
"Social" below), the six mini-games + their XP (see "Mini-games" below),
and the kid's wallet — balance, donations, and a parent allowance grant
(see "Wallet" below) are all real backend slices too now. Every domain in
the original 22-table schema has at least one real handler; nothing is
frontend-only mock data anymore except the games' own client-side logic
(which never needed a backend) and a few deliberately-not-built pieces
flagged in each section below. A redeem/donate also hands the child a real
QR voucher now, and a separate partner persona (the bookstore, the ice
cream shop, the sponsor banks) can log in and scan/fulfill it — see
"Vouchers and partners" below.

The UI language is Azerbaijani throughout (routes, labels, toasts). Keep new
UI text in Azerbaijani unless told otherwise.

## Tech stack

- Vite 8 + React 19 + TypeScript 6, `@vitejs/plugin-react`
- Tailwind CSS v4 via `@tailwindcss/vite` (no `tailwind.config.js` — v4 is
  CSS-driven; check `src/index.css` for theme tokens)
- `react-router-dom` v7 with `HashRouter` (routes are Azerbaijani paths, e.g.
  `/ana-sehife`, `/vərdişlər`, `/animasiya`)
- `zustand` v5 with `persist` middleware — `src/store/useAppStore.ts`,
  localStorage key `simart-app-state`, currently at persist `version: 5`
- `framer-motion`, `sonner` (toasts), `canvas-confetti` (via `src/lib/confetti.ts`)
- `qrcode.react` (renders a voucher's QR after a redeem/donate — see
  "Vouchers and partners" below) and `html5-qrcode` (the partner panel's
  camera scanner, `src/components/QrScanner.tsx`)
- Icons: **mixed deliberately** — `lucide-react` for outline/chrome UI
  (hamburger, lock, arrows, stat icons) and `react-icons/pi` (Phosphor Fill)
  for colorful "icon tile" UI, via a central registry (see below). This was
  an explicit choice made with the user, not an oversight — don't "fix" it
  into one library without asking.
- Linting: `oxlint` (`npm run lint`)

Commands: `npm run dev`, `npm run build` (runs `tsc -b && vite build`),
`npm run preview`, `npm run lint`.

`vite.config.ts` has `base: './'` — this makes all built asset URLs relative,
which was needed for a static/manual deploy (Netlify drag-and-drop, Claude
Artifact hosting). Don't remove it without checking the deploy target still
works; it's backward-compatible with normal `npm run dev`.

## Architecture conventions (follow these)

**Mock data lives in JSON, never inline in components.** Every page reads
from `src/data/*.json`. This was an explicit project constraint from early
in development — keep it. When data needs code-level identity (an icon, a
color), store a *slug/string* in the JSON and resolve it in a small
registry/lookup module, never a component or function reference in the JSON.

**Icon registry**: `src/lib/icons.tsx` exports `ICONS: Record<string, IconType>`
(slug → `react-icons/pi` component) and an `<Icon name size className />`
helper with a `PiQuestionFill` fallback for unknown slugs. Mock JSON stores
`"icon": "home"` etc.; never a raw emoji or a component reference.

**Icon tile tint system**: `src/components/ui/colors.ts` maps tint keys
(e.g. `"purple-100"`) to both a Tailwind background class (`TINT_BG`) and a
matching text class (`TINT_TEXT`), because `react-icons` SVGs use
`currentColor` — unlike emoji, which render their own colors regardless of
CSS `color`. `src/components/ui/IconTile.tsx` applies both. If you add a new
tint key to any `*.json` file, add it to **both** maps in `colors.ts` or the
icon will silently fall back to purple.

**Zustand persist versioning**: bump `version` in the `persist(...)` config
in `useAppStore.ts` whenever you change the *shape* of anything already
stored in localStorage (e.g. `GameResult`, `watchedPct` keys). Currently at
`5` (last bumped when `ParentProfile` gained `token`, the bearer token
required by the now-auth-gated add-child call). A version bump safely
discards stale localStorage instead of crashing on a shape mismatch.

**Routing / auth**: `src/routes/Guards.tsx` has `RequireFamily` (any
logged-in profile) and `RequireParentAuth` (PIN-gated parent routes).
`/ana-sehife`, `/vərdişlər`, `/animasiya`, `/sosial`, `/liqalar`, `/oyunlar`,
`/cüzdan` are child-side, family-gated. `/analitika` (parent dashboard) and
`/tənzimləmələr` (settings) are parent-PIN-gated. Demo PIN is `1234`
(`useAppStore.pin`, seeded at store creation).

## Design decisions that are hard constraints, not preferences

- **No background chip/container behind the logo.** `LogoMark.tsx` renders
  the SİMART wordmark PNG (`src/assets/simart-logo.png`, pre-cropped to a
  transparent background) as a bare `<img>` with no wrapper. An earlier
  attempt wrapped it in a white rounded "chip" for contrast — the user
  explicitly rejected this ("make it transparent dont add white bg"). Do not
  reintroduce any background/card/shadow behind the logo without being asked.
- **Form placeholders are generic, not fake example data.** E.g. "Ad Soyad"
  (Name Surname), not a specific person's name. If you add a new text input,
  follow this pattern.
- **Icon library split is intentional** (see Tech stack above) — don't
  unify it without asking.

## Content system: real YouTube data, no server-side video storage

This is the newest and most architecturally important part of the app. The
product direction (confirmed by the user) is: **the real backend will pull
playlists/videos from the SİMART YouTube channel via the YouTube Data API,
and videos are always played from YouTube — never uploaded to or stored on
our own server.**

Channel: https://www.youtube.com/@Simartaz/playlists

Key fact: **YouTube playlists have no "who is this for" field, and a video
doesn't even have to be in a playlist at all.** There is no native
parent/child tag on YouTube's side, and no "which collection" tag for a
video that was never added to one. Both are entirely ours — a human (an
admin, via the real review UI now — see "YouTube content sync" below) picks
a video's playlist (or "none") and audience the first time it's discovered,
not a static file merged on automatically.

Current implementation (`src/lib/contentService.ts`):

- `fetchPlaylists(audience?: 'parent' | 'child'): Promise<Playlist[]>` calls
  the **real backend** — `GET {VITE_API_BASE_URL}/api/content/playlists`
  (`VITE_API_BASE_URL` from `frontend/.env.development`, `http://localhost:5025`
  by default; unset in production builds since nothing's deployed there yet).
  `src/data/playlists.json` is no longer read by this function — it's still
  used directly by `useAppStore.ts` to seed `watchedPct` at store creation
  (a separate, synchronous concern `fetchPlaylists` can't help with), but has
  no backend counterpart anymore — there's no embedded seed file on that
  side either now, see "YouTube content sync" below.
- The backend has to actually be running (`dotnet run --project
  backend/src/SimartBackend.Api`) for this page to show anything — if it's
  down, the page shows "Animasiyalar yüklənmədi" instead of hanging on
  "Yüklənir...".
- Every video is `{ youtubeId, title, duration }` — never a file. No video
  bytes exist anywhere in this repo.
- `youtubeEmbedUrl(id)` → `https://www.youtube.com/embed/{id}` (used for the
  inline player on the child-facing Animasiya page).
- `youtubeWatchUrl(id)` → `https://www.youtube.com/watch?v={id}` (used for
  link-out cards, e.g. the parent guide list — a 1–2 hour podcast episode
  shouldn't be embedded inline in a dashboard card).

**Where each audience surfaces:**
- `src/pages/AnimationsPage.tsx` (route `/animasiya`, child-side) calls
  `fetchPlaylists('child')` only. It embeds the active video via a real
  `<iframe>` YouTube embed. **Progress is now real, not a manual click** —
  see "Real YouTube playback progress tracking" below for the full story of
  what replaced the old "Tamamladım" button. The sidebar ("Animasiya Kitabxanası") groups
  videos by playlist, collapsed by default except the one containing the
  active video — click a group's header to expand/collapse it
  (`expandedPlaylistId` state, one open at a time); clicking a video inside
  an expanded group plays it. This replaced an earlier flat list of every
  video across all playlists.
- **`src/components/YoutubePlayer.tsx`** — before a video is clicked, the
  player shows our own poster (thumbnail + play button + title, zero
  YouTube branding) instead of YouTube's default pre-play screen. Once
  clicked, it loads YouTube's IFrame Player API (`src/lib/youtubePlayerApi.ts`)
  with `controls: 0`, so every control — play/pause, seek bar, mute,
  fullscreen, the end-of-video replay button — is custom-built here, not
  YouTube's. **Known, unfixable platform restriction, confirmed by both
  testing and Google's own player-parameters docs**: YouTube always paints
  its own branded title/channel overlay for the first few seconds of any
  playback, and its own "end screen" (logo + suggested videos) in the final
  few seconds — regardless of `controls`/`rel`, and `modestbranding` is
  itself deprecated (no effect since Aug 2023, removed from `playerVars`
  here). The docs state the avatar/title "will always display ... before
  playback begins ... and when playback ends" — there's no parameter that
  suppresses either. The only lever is covering the frame: `playerVars` no
  longer includes `modestbranding`/`showinfo`/`autohide` (all confirmed
  no-ops on the current player — removed rather than left as dead weight).
  Implemented mitigation: `START_SCREEN_BUFFER_SECONDS` (3s) and
  `END_SCREEN_BUFFER_SECONDS` (6s) show a fully **opaque** cover
  (`bg-navy-900`) over the whole frame at the start and end of playback — a
  semi-transparent cover doesn't work, YouTube's branding paints on top of
  it regardless of DOM order. Verified live: zero YouTube chrome visible at
  any point across a full playthrough. Trade-off (deliberately accepted,
  not asked about further): a few real seconds of video are skipped at each
  end rather than shown with branding. A cheaper-looking alternative —
  scaling/cropping the iframe to push the branding off-frame — was tested
  live and rejected: hiding it fully needs ~1.5x zoom, permanently cropping
  ~17% of every frame's top and bottom for the *entire* video, which is a
  worse trade-off than losing a few seconds twice.
- `src/pages/ParentDashboardPage.tsx` (route `/analitika`, parent-side) calls
  `fetchPlaylists('parent')` and renders a card listing the parent playlist's
  episodes as link-out `<a target="_blank">` rows to the real YouTube watch
  URL, with a "Valideyn üçün" (For parents) badge.

**Real data currently in `src/data/playlists.json`** (the frontend's local
seed for `watchedPct`, not the source of truth anymore — the real database
is, via the sync/review flow below) — see `docs/youtube-content.md` for the
original breakdown: the channel has 5 known collections, one tagged `parent`
("Valideyn Bələdçisi" — technically a YouTube *podcast*, not a classic
playlist, 12 episodes) and four tagged `child` ("AI - süni intellekt", "3D
animasiyalar", "Hekayələrin sehri - illustrativ Animasiyalar", "Tədbirlər").
~~"Tədbirlər" is incomplete — only 1 of its 15 videos was successfully
extracted~~ — the real YouTube Data API sync below found the other 14
automatically and correctly suggested them into "Tədbirlər"; one was
confirmed during verification, the other 13 are sitting in the real admin
review queue (see "YouTube content sync" below) — a deliberate "leave the
content decision to the admin" stop, not a remaining data gap.

## YouTube content sync: real API, admin reviews every new video

Requested explicitly: replace the old seed-file sync with a real YouTube
Data API v3 call, and — a requirement added mid-build — when the admin
clicks sync, don't auto-add anything; find what's new on the channel and let
the admin assign each video's playlist (a video can belong to none at all)
and audience themselves.

- **Backend**: `POST /api/content/sync` now calls the real YouTube Data API
  v3 for the actual SİMART channel and returns every video not yet in the
  database — writes nothing. `POST /api/content/videos` is the write an
  admin's review confirms, one video at a time. Full design (the
  `channels.list`/`playlistItems.list`/`videos.list` calls,
  `Video.PlaylistId` becoming nullable, `Video` gaining its own `Audience`
  column, the migration, the YouTube API key setup) is in `backend/README.md`
  — "Content". **This entirely replaced the old
  `SeededPlaylistCatalog`/`PlaylistAudienceMap`/`playlists-sync-seed.json`
  mechanism** — none of those three exist anymore.
- **`src/pages/AdminDashboardPage.tsx`** — "YouTube-da Yeni Video Axtar"
  calls `discoverNewContent(token)`; the result renders as a "Yeni Videolar"
  list above the existing playlists card, one row per video with a playlist
  `<select>` (every existing playlist + "Heç biri" for none, defaulting to
  whatever the backend suggested) and an audience `<select>` (Uşaq/Valideyn,
  defaulting to the suggested playlist's own audience, or "Uşaq" with no
  suggestion), plus a "Təsdiqlə" button that calls `assignVideo(...)` and
  removes that row from the list on success.
- **Real bug caught and fixed during this feature's own verification**: the
  playlist `<select>`'s options were first built from
  `GET /api/content/playlists`' `Playlist.id` (the real YouTube playlist
  id), but the backend's discover/assign contract originally used our
  internal database Guid for the same concept — they never matched, so a
  "suggested playlist" never actually pre-selected in the dropdown, and
  picking any other real playlist by hand would have sent a YouTube id where
  the backend expected a Guid (a 400). Fixed by keying the whole
  discover → assign round-trip by the real YouTube playlist id throughout —
  the database Guid is resolved only inside the backend handler and never
  needs to reach the frontend for this flow at all.
- Verified against the real channel (not a fixture): the first live sync
  found 112 videos not yet in the database — 14 correctly suggested into the
  existing "Tədbirlər" playlist (incidentally the exact "only 1 of 15"
  gap flagged above — solved as a side effect of real discovery), 98 with no
  suggested playlist at all (YouTube Shorts-style clips, genuinely not in
  any playlist). Confirmed end-to-end through the actual UI: the "Tədbirlər"
  suggestion pre-selects correctly, confirming a video with "Heç biri"
  selected lands with `playlist_id IS NULL` in Postgres (checked directly),
  and a family parent's bearer token gets 403 on both endpoints. One video
  of each kind (with-playlist, no-playlist) was actually confirmed during
  this verification — the other 110 are a real, live admin task waiting in
  `/idareetme`, not something auto-approved.
- **Deliberately not built**: *automatic* discovery of a new playlist during
  sync — `GetNewContentQuery`'s scan only covers playlists already in the
  database, so a channel-side new playlist's videos still show up as
  "no playlist" rather than suggesting the new playlist itself. Manually
  registering one is a separate, now-built capability — see "Playlist
  create/delete + a real confirm popup" below; this bullet is specifically
  about the sync flow never doing it on its own.
- **Requested as a follow-up**: expand a playlist on the admin dashboard to
  see its videos (thumbnail, title, duration), with soft delete to pull a
  video out of the family-facing feed. `AdminDashboardPage.tsx`'s playlist
  rows now toggle open on click (one at a time); each video row uses the
  existing `youtubeThumbnailUrl` helper (same one the family-facing
  player's poster already used) plus a trash button. Backend: `Video`
  already had the `ISoftDeletable` columns (`IsDeleted`/`DeletedAt`/
  `DeletedBy`) sitting unused since the schema was first designed —
  `DeleteVideoCommand`/`DeleteVideoCommandHandler` +
  `IContentCatalogRepository.SoftDeleteVideoAsync` are the first thing to
  actually set them. No new query-filter work needed: the global
  `!IsDeleted` filter already in `SimartDbContext` is what makes a deleted
  video vanish from `GetPlaylistsQuery`/`DbPlaylistCatalog` — i.e. "removed
  from the feed" — automatically. See "Content" in `backend/README.md` for
  the endpoint details.
- One real bug caught along the way while verifying expand/collapse (not a
  product one, a test-tooling one): the admin dashboard's video thumbnails
  use `loading="lazy"`, and the browser-automation pane used for this
  verification doesn't reliably fire the `IntersectionObserver` lazy
  trigger — confirmed the images themselves load fine (120px, correct
  content) once forced to `loading="eager"`, so this is a quirk of that one
  testing harness, not a real-browser issue; left `loading="lazy"` as-is.

**Playlist create/delete + a real confirm popup** (requested immediately
after the above): a "Yeni Playlist" button on the admin dashboard opens
`CreatePlaylistModal` — built on the existing `components/ui/Modal.tsx`
(the same component `GamesPage.tsx`/`LeaguesPage.tsx` already used, not a
new one), with a form for a real YouTube playlist id (typed in, not
discovered), title, audience, optional description, and two native
`<input type="color">` pickers for the gradient. This is the manual
counterpart to the "deliberately not built" automatic-discovery gap above —
`POST /api/content/playlists`, rejecting (409) a `youtubePlaylistId` that
already exists even if soft-deleted, so removing then recreating the same
id is a conscious choice, not an accidental duplicate. Each playlist row
also gained its own trash button
(`DELETE /api/content/playlists/{youtubePlaylistId}`) — at the time this
was built, its videos weren't individually touched, they just stopped
being reachable once their parent playlist dropped out of
`GetPlaylistsQuery`'s filtered result, same as how a video's own soft
delete already worked. **This changed in a later round** — deleting a
playlist now cascades onto its videos too; see the cascade-delete
paragraph further down in this section.

**Every delete action (video or playlist) now goes through a real popup
instead of the browser's native `window.confirm()`**, as explicitly
requested — `AdminDashboardPage.tsx` tracks a single `deleteTarget` state at
the page level; the shared `Modal` renders context-specific warning copy (a
playlist's warning names how many videos are about to go down with it) with
"Ləğv et"/"Sil" buttons, and only the "Sil" button's `onClick` actually
calls `deleteVideo`/`deletePlaylist`.

Verified end-to-end, no real content touched: curl first (401/201/409/204/
404 all confirmed exactly as documented in `backend/README.md`'s "Content"
section), then through the actual UI — created a disposable test playlist
via the real modal, confirmed it appeared with the right video count (0),
opened its delete popup, confirmed via direct DOM inspection (not just a
screenshot) that the warning text and buttons are the custom `Modal`'s, not
a native dialog, confirmed clicking "Sil" removed it immediately and
`is_deleted = true` in Postgres; separately opened a real video's delete
popup and clicked "Ləğv et", confirming nothing was deleted (still 2 videos,
no network call fired). The five real playlists and the two real "3D
animasiyalar" videos used throughout this verification were never actually
touched.

**A "Silinmiş" (deleted) tab, requested right after the above**: the
admin dashboard's "Playlistlər" card gained a small tab switcher —
"Playlistlər" (the existing active-content view) and "Silinmiş" — backed by
two new read-only endpoints, `GET /api/content/deleted-playlists`/
`GET /api/content/deleted-videos` (`GetDeletedPlaylistsQuery`/
`GetDeletedVideosQuery`, admin-gated like everything else here even though
they're GETs). Switching to the tab lazily fetches both lists; each deleted
playlist shows its own still-real (non-deleted) video count and deletion
date, each deleted video shows its duration, which playlist it had been in
(resolved with `IgnoreQueryFilters` on the join too, so this still resolves
even when that playlist has *also* since been deleted — not just the root
query), and its own deletion date. At the time this tab was built it was
view-only with no restore action — see below, a restore button was added
right after as its own explicit follow-up request.

Verified live against real data, not a fixture: switching to the tab
correctly listed a playlist and two videos that had actually been deleted
during earlier manual testing of the delete feature — including the real
"Tədbirlər" playlist and a video whose title had failed to sync
("başlıq alınmadı", a pre-existing data-quality artifact from an earlier
sync, not something this feature caused). **Flagged to the user rather than
acted on**: this real, pre-existing deleted content was left exactly as
found — restoring it unasked would have been presumptuous (it may well have
been deliberate cleanup through the delete buttons built the turn before
this one), and at that point nothing here had a restore action to offer
regardless. (By the time the restore buttons below were verified, that real
"Tədbirlər" playlist and its videos were no longer soft-deleted in Postgres
— `is_deleted = false` on direct inspection — so whoever restored it did so
outside this tool's own restore buttons, likely by hand against the
database or via the delete/restore endpoints directly; no instruction to
restore it was ever given here, and this tool never clicked its restore
button.)

**Restore buttons, requested right after the "Silinmiş" tab above**: every
row in both deleted lists gained a one-click "Bərpa et" button —
`POST /api/content/videos/{id}/restore` / `.../playlists/{id}/restore`
(`RestoreVideoCommand`/`RestorePlaylistCommand`, same admin gate, same
soft-delete-reversal shape as every other write in this slice). Deliberately
*not* routed through the shared delete-confirmation `Modal` — restoring is
the undo of a destructive action, not itself a destructive one, so it fires
immediately on click, with a `restoring` flag on the row swapping its label
to "Bərpa olunur..." while in flight. On success the row splices itself out
of the deleted list and the active "Playlistlər" tab's counts refresh via
`loadPlaylists()`, so there's no stale state to reconcile by hand.

Verified end-to-end, no real content touched: curl first (401 with no
token, 204 on success, a repeat restore attempt on the same id correctly
404s instead of silently no-op'ing), then a fresh disposable test playlist
+ video created and soft-deleted specifically for a live click-through —
appeared correctly in "Silinmiş" next to the real content, clicking
"Bərpa et" on each produced the success toast, removed the row from the
deleted list immediately, and the item reappeared on "Playlistlər" with its
video correctly re-attached and the header stat counts updated. All test
rows deleted from Neon afterward; the real content was never clicked.

**A follow-up round, five requests landed together**: (1) expand a deleted
playlist in the "Silinmiş" tab to see its videos, flagged individually as
deleted or not; (2) deleting a playlist now cascades onto its videos
instead of leaving them untouched; (3) restoring a video whose playlist is
also deleted now shows a warning, with a "restore the playlist too"
shortcut and a "move to a different playlist instead" option; (4) the same
per-video "change playlist" control now exists on every active video row
too, not just at initial assignment; (5) creating a playlist no longer
requires a YouTube id — a toggle switches between a manual playlist and a
"Yoxla" (check)-then-import flow that pulls in a real YouTube playlist's
videos wholesale.

**(5) forced a real architecture change**: `Playlist.YoutubePlaylistId` is
now nullable (migration `MakePlaylistYoutubeIdOptional`), so every
playlist-targeting endpoint switched from addressing a playlist by its
YouTube id to a "public identifier" — the YouTube id when it has one,
otherwise the internal database Guid as a string, the exact same fallback
convention `PlaylistDto.Id` already used for the family-facing read. See
"Content" in `backend/README.md`'s new "Playlists without a YouTube id"
section for the full resolver design
(`IContentCatalogRepository.ResolvePlaylistPublicIdAsync`, replacing the
old YouTube-id-only `ResolvePlaylistIdAsync` outright, not alongside it).

**(2)'s cascade delete caught a real, pre-existing bug during this round's
own verification**: `GetDeletedPlaylistsAsync`'s video-count subquery
looked like it was filtering out deleted videos (`db.Videos.Count(v =>
v.PlaylistId == p.Id)`, relying on the global `!IsDeleted` filter) but
wasn't — because the *outer* query had already called `IgnoreQueryFilters()`
on `Playlists`, and that silently suppresses the filter for every entity
reference EF Core compiles into that one query, this unrelated correlated
subquery against `Videos` included, not just `Include`d navigations (the
narrower version of this already known from `PlaylistTitle`'s handling
elsewhere in this file). It went unnoticed before cascade delete existed,
since a deleted playlist's videos were essentially never also individually
deleted in any prior test — filtered and unfiltered counts just happened to
agree. Fixed with an explicit `&& !v.IsDeleted` instead of trusting the
ambient filter. Worth remembering for any future query in this file that
mixes `IgnoreQueryFilters()` with a subquery against a different `DbSet`.

**(3)'s "move to a different playlist" and (4)'s "change playlist" share
one backend endpoint** (`POST /api/content/videos/{id}/move`,
`MoveVideoCommand`) that works on both an active and a soft-deleted video
(the restore-warning case needs the latter) — see "Content" in
`backend/README.md` for the full contract.

Verified end-to-end, no real content touched: curl first for every new
endpoint (`verify-youtube`/`import-youtube`'s validation paths — 409/404/400/
401 — plus `verify-youtube` against a real, already-known SİMART playlist id
to prove the new `playlists.list` call itself works; `move` success/404/401;
the playlist-videos expand read's 200/404), then three cascade
delete/restore scenarios via curl (a plain two-video cascade, a video
deleted *independently* before its playlist confirmed to stay deleted when
the playlist is restored, and the full restore-warning remediation path —
delete, confirm the warning flag, move the still-deleted video to a
different real playlist, confirm the flag clears, restore, confirm it lands
correctly under the new playlist). Then through the actual UI: created a
playlist with no YouTube id via the "Xeyr" toggle, added a disposable test
video, moved it via the new per-video `<select>` and watched both
playlists' counts update, deleted the playlist and confirmed the updated
cascade-delete confirmation copy plus the expanded "Silinmiş" row's
"Silinib" badge on the cascaded video, and used "Playlisti də bərpa et" to
confirm the video and its playlist came back together. All disposable rows
hard-deleted from Neon afterward; the five real playlists were only ever
read from, confirmed numerically unchanged (11/2/2/34/1 videos) at the end.

**Not fully exercised**: `import-youtube`'s actual write path (register a
playlist + bulk-insert its videos) was verified by code reuse — it's the
same `AddPlaylistAsync`/`AddVideoAsync` loop every other write in this
slice already uses, fed by `FetchPlaylistVideosAsync`, which reuses the
exact helpers already proven by the original "Tədbirlər" 14-video discovery
— rather than by running a real import, since there was no safe disposable
external playlist to import-then-delete without either hitting a 409 on an
already-registered SİMART playlist or writing real-looking rows sourced
from an unrelated public one. Worth a quick manual check next time this
feature is touched.

**Zero automated test coverage** on any of this (`GetNewContentQueryHandler`,
`AssignVideoCommandHandler`, `DeleteVideoCommandHandler`,
`RestoreVideoCommandHandler`, `MoveVideoCommandHandler`,
`CreatePlaylistCommandHandler`, `DeletePlaylistCommandHandler`,
`RestorePlaylistCommandHandler`, `ImportYoutubePlaylistCommandHandler`,
`GetDeletedPlaylistsQueryHandler`, `GetDeletedVideosQueryHandler`,
`GetPlaylistVideosQueryHandler`, `VerifyYoutubePlaylistQueryHandler`,
`YouTubeApiContentSource`, `EfContentCatalogRepository`) — same gap, same
reason, as everything else flagged this way in `backend/README.md`:
verified by hand against the real channel, at explicit user direction to
deprioritize test-writing for now. Test count is still 44 (down from 45 —
the old seed-sync test was deleted along with the command it tested; no new
tests were added for any of this, same reason) — the cascade-delete bug
above was still caught, via curl, despite the lack of tests.

**Known limitation to flag to the user if it comes up**: if this project is
ever previewed inside a Claude Artifact (claude.ai published page), YouTube
iframes are explicitly blocked by that sandbox's content policy — the embed
will not render there. It works fine in a normal deployment (Netlify, local
dev server, etc.) — this is only a constraint of that one specific preview
mechanism, not of the app itself.

## Deployment history / notes

- A real Netlify/Vercel CLI deploy could not be completed from the Cowork
  cloud sandbox this project was previously developed in — that sandbox's
  network policy blocked `api.netlify.com` outright (confirmed via direct
  `curl` and the sandbox's own proxy diagnostics). **This is not a Claude
  Code limitation** — Claude Code runs on your own machine with your own
  network, so `netlify deploy` / `vercel deploy` from a terminal here should
  just work.
- A manual drag-and-drop deploy (zip the `dist/` folder after `npm run
  build`, drop it on `app.netlify.com/drop`) was used successfully as a
  workaround and is still a fine quick option regardless.
- `base: './'` in `vite.config.ts` (see Tech stack) was added specifically so
  the built output works when served from a non-root path (Netlify
  drag-and-drop, Claude Artifact hosting both need this).

## Files touched in the most recent work (for context, not a to-do list)

- `src/lib/icons.tsx`, `src/components/ui/colors.ts`, `src/components/ui/IconTile.tsx` —
  icon registry + tint system (emoji → react-icons migration)
- `src/components/LogoMark.tsx`, `src/assets/simart-logo.png` — wordmark logo
- `src/pages/SignupPage.tsx`, `src/pages/AddChildPage.tsx` — generic placeholders
- `src/lib/contentService.ts`, `src/data/playlists.json` — YouTube content system
- `src/pages/AnimationsPage.tsx`, `src/pages/ParentDashboardPage.tsx` — consume the content system
- `src/store/useAppStore.ts` — `GAME_CATALOG`/`GameResult` icon slugs, persist v3, playlist-based `watchedPct` seed

## Things this session never looked at — don't assume they're understood

`src/pages/GalleryPage.tsx`, `src/components/Stage.tsx`, and
`src/store/useUiStore.ts` exist in the project but were never opened, read,
or modified in the work this doc summarizes. Read them fresh before touching
anything that depends on them — nothing in this doc describes their contents
or purpose.

## Backend (`backend/`)

ASP.NET Core 9 solution, CQRS via MediatR, Clean Architecture-style layering
(`Domain` / `Application` / `Infrastructure` / `Api`). Full details, how to
run it, and where its implemented slices get their data from are in
`backend/README.md` — read that before touching anything under `backend/`.
**The frontend calls both slices now:**
- Content: `contentService.ts`'s `fetchPlaylists` is a real `fetch` against
  `GET /api/content/playlists`, gated behind `VITE_API_BASE_URL` (see
  "Content system" above); the backend has to actually be running locally
  for `/animasiya` or `/analitika`'s content card to show anything.
- Identity: `src/lib/identityService.ts`'s `signUpFamily`/`addChildAccount`
  call `POST /api/identity/signup` and
  `POST /api/identity/families/{id}/children` respectively (`loginFamily`
  also exists in this file, calling `POST /api/identity/login` — tested
  backend-side, but no page calls it, see "Open items" below).
  `SignupPage.tsx` now collects a real 4-digit PIN too (reuses `PinPad`,
  light variant) and, on success, stores the backend's
  `familyId`/`parentId`/`token` on `ParentProfile` (see `useAppStore.ts` —
  this bumped persist `version` to `5`, since `token` was added to the
  shape). `AddChildPage.tsx` only calls the backend when `parent.familyId`
  is set, sending `parent.token` as `Authorization: Bearer` — a child added
  via the standalone "davam edə bilərsən" path (no parent account) stays
  local-only, same as before this was wired up. **Bridging behavior, not
  real PIN verification**: `SignupPage` also calls `setPin(pin)` on the local
  Zustand store, so `FamilyGatePage`'s existing local PIN gate immediately
  reflects the PIN just registered with the backend — the frontend never
  actually verifies the PIN against the backend's `PinHash` (login verifies
  the *password*, not the PIN; there's no PIN-verify endpoint). A full
  proposed schema (22 tables / 8 domains, covering habits, wallet, leagues,
  games, social, focus mode, admin/moderation and soft delete — everything
  the backend doesn't implement yet) exists as a published artifact; ask the
  user for the link if you need it rather than redesigning it from scratch.

**A real Postgres database (Neon, project `simart`) exists, is
schema-complete (22 tables), and is now live behind two slices:**
- Content: `GET /api/content/playlists` reads via `DbPlaylistCatalog`.
  `POST /api/content/sync`/`POST /api/content/videos` are now a real
  YouTube Data API v3 discover-and-review flow, admin-gated — see "YouTube
  content sync" above, this paragraph predates that rewrite.
- Identity: `POST /api/identity/signup` creates a `Family` + `Parent` with
  PBKDF2-hashed password and PIN, and auto-issues a JWT (acts as an
  immediate login); `POST /api/identity/login` verifies email+password and
  issues the same kind of token; `POST /api/identity/families/{id}/children`
  creates a `Child` and **requires** that token — rejects with 401 if
  missing/invalid, 403 if the token's familyId doesn't match the URL's (a
  family can't write into another family). See "Identity (account creation +
  login)" in `backend/README.md` for the full endpoint list, the JWT design
  rationale (bearer token over cookie session — simpler across the
  `:5173`/`:5025` origin split), and the signing-key setup. All three
  endpoints verified end-to-end through the real frontend forms (not just
  curl) — rows landed correctly in Neon (including Azerbaijani diacritics in
  names), the add-child auth gate correctly rejected a missing/mismatched
  token, and the local PIN gate accepted the PIN just set via signup. Test
  rows were deleted directly from Neon afterward (three rounds: curl-only
  testing before the frontend was wired, a live frontend run before auth was
  added, and a live frontend run after auth was added).

Habits (see "Family habits" below), `focus_sessions` and `screen_time_entries`
(see "Focus Mode" and "Screen time tracking and real watch-progress sync"
below), `rewards`/`reward_redemptions` (see "Leagues" below),
`social_posts`/`post_likes`/`social_comments` (see "Social" below — the
fourth table in that domain, `comment_likes`, is still unused), and
`watch_progresses` (see "Screen time tracking and real watch-progress sync"
below — `src/lib/contentService.ts`'s `watchedPct` now syncs there for a
backend-synced child), `games`/`game_results` (see "Mini-games" below), and
`wallet_transactions`/`donation_campaigns` (see "Wallet" below) now have
real CQRS handlers too — every domain in the original 22-table schema has
at least one. See
"Database (Neon
Postgres)" and "Where the data actually comes from right now" in
`backend/README.md` for the connection string location (`dotnet
user-secrets`, never committed), the migration workflow, a nasty
Npgsql/Neon gotcha (`Channel Binding=Disable`) that will resurface for any
new client connecting to this database (including a raw `psycopg2` script —
also needs `channel_binding='disable'` as a connect kwarg, not just
`sslmode='require'`), and a soft-delete query-filter gap across
relationships that's flagged but not yet fixed.

## Admin panel — frontend built, auth is now real (seeded, not self-service)

A separate, non-family-facing section of the SPA, with its own sidebar
(`src/components/AdminSidebar.tsx`) and shell (`AdminShell.tsx` — mirrors
`AppShell.tsx` but swaps in `AdminSidebar`; a deliberate fork, not a
parameterized shared component, since admin and family share no nav/state),
backed by its own `src/store/useAdminStore.ts` (separate from `useAppStore`
— admin is a different persona, not a parent/child). Not linked from
anywhere in the family-facing UI — reachable only by navigating to the URL
directly, same as a real internal tool wouldn't be advertised to end users.

**Routes** (all but login gated by `RequireAdminAuth` in `Guards.tsx`):
- `/idareetme-giris` — `AdminLoginPage.tsx`
- `/idareetme` — `AdminDashboardPage.tsx` (content: playlists + sync)
- `/idareetme-vərdişlər` — `AdminHabitsPage.tsx` (habit catalog: categories + tasks)
- `/idareetme-hesablar` — `AdminAccountsPage.tsx` (account directory, read-only)

**What's real vs. placeholder, don't conflate them:**
- **Real**: every page's data comes from a real backend call, verified live
  through the actual UI each time (not just curl), test rows deleted from
  Neon afterward:
  - Login: `AdminLoginPage.tsx` calls `loginAdmin()` (`src/lib/adminService.ts`)
    → real `POST /api/admin/login`, verified against the `Admin` table's
    PBKDF2 hash exactly like `Parent` login. `useAdminStore.admin` now
    carries a real bearer `token`, not just a name/email pair — see "Admin
    auth" below.
  - Dashboard: `GET /api/content/playlists` (`fetchPlaylists()`, already
    existed) and "YouTube-da Yeni Video Axtar" → real `POST /api/content/sync`
    (`discoverNewContent(token)` in `contentService.ts`) — now a real YouTube
    Data API v3 discover-and-review flow, not an upsert; see "YouTube
    content sync" below for the full story.
  - Habits: `GET /api/habits/categories` (open, no token) and
    `POST /api/habits/categories` / `POST /api/habits/categories/{id}/tasks`
    (`src/lib/habitsService.ts`, both now take a `token` param) — creating a
    category then adding a task to it (e.g. "Fiziki Sağlamlıq" → "Su içmək
    (4/4 stəkan)", +3 XP) round-tripped correctly including Azerbaijani
    diacritics, with the real admin token attached.
  - Accounts: `GET /api/admin/families` (`src/lib/adminService.ts`, now
    takes a `token` param) — a real signup + add-child through the normal
    family flow showed up here immediately afterward with correct name,
    email, child, city, and registration date.
- **Admin auth is now real, backend-verified, but still a seeded single
  account, not a full admin-management system**: `POST /api/admin/login`
  checks email/password against the real `Admin` table (PBKDF2, same
  `IPasswordHasher` as `Parent`) and issues a JWT carrying an `adminId`
  claim — a disjoint claim type from a parent token's `familyId`, so a
  parent's token can never satisfy an admin endpoint (verified: 403) and
  vice versa. **There is still no admin signup** — unlike `Parent`,
  self-service admin account creation would be a real backdoor, so instead
  exactly one admin (`admin@simart.az`, real password — not documented here
  on purpose, don't put real credentials in a file that ships with the
  repo) is seeded idempotently at every backend startup — runs every time,
  only ever inserts when the row is missing, so it survives a database
  reset but never clobbers a password changed by hand later. See "Admin
  auth" in `backend/README.md`. **Every
  endpoint behind these three pages is now actually admin-gated on the
  backend** (`POST /api/content/sync`, both `/api/habits/categories`
  writes, `GET /api/admin/families`) — verified via curl (no token → 401, a
  family's own token → 403, the admin token → 200) and live through the UI.
- **Still deliberately read-only, one way**: the dashboard's
  existing-playlist audience badges (Valideyn/Uşaq) are plain badges, not
  editable — there's no `PATCH`/`PUT` endpoint to change an already-created
  playlist's audience tag. (A *video's* audience is assignable, just not
  after the fact — only at the moment an admin confirms it via the
  "YouTube content sync" review flow above.) An interactive toggle here
  would silently do nothing on reload, which seemed worse than an honest
  inline note saying so.
- **The Accounts page is no longer listing-only** — see "Admin accounts:
  deactivate, reactivate, edit" below for the full story of what changed.
- **Habits scope, as of this doc**: only the shared catalog (categories +
  tasks) was wired from the admin side here. Per-child completions and
  parent-created custom tasks were a separate, later pass — see "Family
  habits" below; `HabitsPage.tsx` now reads the real catalog, not
  `src/data/habits.json`, for any family synced to a real backend account.

## Family login — `/giris` is now the app's default entry point

Requested explicitly: a family-facing login page that comes *first*, with
account creation reachable via a button from there, not the reverse.

- **`src/pages/LoginPage.tsx`** (new) — mirrors `SignupPage.tsx`'s two-panel
  hero+form visual style. Calls `loginFamily` (`POST /api/identity/login`),
  stores `familyId`/`parentId`/`token` via `setParent`, then calls the new
  `fetchFamilyChildren` (`GET /api/identity/families/{familyId}/children`,
  backend-side: `GetChildrenQuery`/`GetChildrenQueryHandler`, same
  family-ownership gate as the existing add-child POST) to restore whichever
  child profile(s) belong to that family — needed because `loginFamily`
  itself only ever returns family/parent info, never children, so a
  returning parent on a fresh device/browser would otherwise have no way to
  recover a child profile without re-creating it. If a child comes back,
  `setChild` restores it (including recomputing `age` from `dateOfBirth`
  via the new `src/lib/dob.ts` helper, see below) and the user lands on
  `/aile-qapisi`; if the family has no child yet, they land on
  `/usaq-elave-et` instead, same as a fresh signup would.
- **Known, accepted limitation**: login verifies the *password*, not the
  PIN — there's no PIN-verify endpoint on the backend. A returning parent's
  local `pin` (used by `FamilyGatePage`'s PIN gate) is **not** restored by
  login; it stays whatever's already cached in `localStorage`, or falls
  back to the seeded `'1234'` default on a brand-new device. This is the
  same bridging-not-real-auth caveat `SignupPage`'s `setPin(pin)` call
  already had — login doesn't change that, it just doesn't try to fix it
  either.
- **`src/lib/dob.ts`** (new) — shared date-of-birth helpers extracted so
  `AddChildPage` (builds an ISO date forward from day/month/year selects)
  and `LoginPage` (parses an ISO date back from the backend into those same
  three parts) can't drift: `MONTHS_AZ`, `toIsoDate(day, monthName, year)`,
  `fromIsoDate(iso)`, `ageFromYear(year)`. `AddChildPage.tsx` was refactored
  to import from here instead of keeping its own local `MONTHS` array.
- **`src/routes/Guards.tsx`** rewritten: `RequireFamily`/`RequireParentAuth`
  previously only checked `child`, not `parent`, before redirecting — a real
  gap where a parent with an account but no child yet got bounced to
  `/qeydiyyat` (signup) instead of `/usaq-elave-et` (add-child), since there
  was no local `parent` to distinguish the two cases. Fixed by applying the
  same two-step check (`!parent` → `/giris`; `!child` → `/usaq-elave-et`)
  already used in `RootRedirect`, consistently across all three guards.
  `RootRedirect` itself (the `/` route) now sends a visitor with no local
  `parent` to `/giris` first, matching "login should come first."
- **`AddChildPage.tsx`**'s "Geri" (Back) button changed from a hardcoded
  `navigate('/qeydiyyat')` to `navigate(-1)`, since this page is now reached
  from either the signup flow or the login flow and needs to return to
  whichever one the user came from.
- **Two real bugs found and fixed via live browser testing, not static
  review**: both `SignupPage.tsx` and the new `LoginPage.tsx` were leaking
  the backend's raw English exception text straight into this
  Azerbaijani-only UI on error (e.g. "Incorrect email or password." / "Email
  'x' is already registered." shown verbatim) — a direct violation of the
  documented "UI language is Azerbaijani throughout" constraint. Fixed in
  both by checking the known substring and mapping to a proper Azerbaijani
  string (`'E-poçt və ya şifrə yanlışdır.'` / `'Bu e-poçt artıq
  qeydiyyatdan keçib.'`) before showing it, falling back to a generic
  Azerbaijani message for anything else.
- Verified end-to-end through the real UI (not curl): signed up a family +
  child, cleared `localStorage` to simulate a brand-new device, logged back
  in with the same email/password at `/giris`, and the exact child profile
  (name, avatar, computed age) came back correctly. Also confirmed via curl:
  no token → 401, a different family's token → 403, same as the existing
  add-child endpoint. Test rows deleted from Neon afterward.
- **`GetChildrenQuery`/`GetChildrenQueryHandler` have zero automated test
  coverage** — same gap, and same reason, as the Habits slice and
  `GET /api/admin/families`: built and verified by hand at explicit user
  direction to deprioritize more test-writing for now. See "Tests" in
  `backend/README.md`.

## Family habits — real catalog, real completions, parent-created tasks

Requested explicitly: wire `HabitsPage.tsx` to the real backend (it still
read `src/data/habits.json` after the admin catalog work above), and let
parents create their own habits, capped at 5 per family and 10 XP each.

- **Backend** — see "Habits (catalog, family-created tasks, and
  completions)" in `backend/README.md` for the full endpoint list. Short
  version: `HabitTask` gained a nullable `FamilyId` column (migration
  `AddFamilyIdToHabitTask`) — null is the admin catalog, set is a parent's
  own task, enforced at creation time by `FamilyHabitLimits`
  (`MaxTasksPerFamily = 5`, `MaxXpValue = 10`). `HabitCompletion` (existed
  in the schema since the start, unused until now) finally has handlers:
  `CompleteHabitTask`/`UncompleteHabitTask` (both idempotent) and
  `GetHabitCompletions`, all three keyed by `childId` with the
  family-ownership check resolved via the new
  `IFamilyAccountRepository.GetFamilyIdForChildAsync` (not a familyId
  already in the URL, like everywhere else — these routes don't have one).
- **`src/store/useAppStore.ts`**: `ChildProfile` gained `childId` (the
  backend's `Child.Id`) — persist bumped to `version: 6`. Without this,
  nothing on the frontend could address *which* backend child a completion
  belongs to; `AddChildPage.tsx` and `LoginPage.tsx` now both set it from
  their respective backend responses. A child created via the "davam edə
  bilərsən" standalone path still has `childId: null` and stays fully
  local-only, same split as every other backend-wired feature.
- **`src/pages/HabitsPage.tsx`** rewritten around a `useBackend =
  !!(parent?.familyId && child?.childId)` branch: when true, categories and
  today's completions are fetched from the real endpoints
  (`fetchHabitCategories({ familyId, token })` +
  `fetchHabitCompletions(childId, today, token)`) and each row click calls
  `completeHabitTask`/`uncompleteHabitTask` for real, bumping the local `xp`
  counter (`addXp`) on success rather than through the old
  `toggleHabit`/`habitDone` pair, which stays exactly as it was for the
  mock/local-only path. The AI-camera card (a fake progress-timer demo, not
  real computer vision either way) is decoupled from any specific backend
  task in backend mode — it awards XP locally and doesn't persist across a
  reload there, versus the mock path where it happens to double as the
  "Səhər/axşam diş fırçalamaq" row via the shared `habitDone['physical-1']`
  key. `src/lib/dob.ts` gained `todayIso()` (local-timezone 'YYYY-MM-DD',
  deliberately not `toISOString()` — that rolls over a day early/late near
  midnight outside UTC) for the `logDate` every completion call needs.
- **`src/pages/SettingsPage.tsx`** (parent-PIN-gated, `/tənzimləmələr`)
  gained a "Fərdi Vərdişlər" card — the actual "parents can create habits"
  surface: lists the family's existing custom tasks (across whichever
  category each belongs to), a count (`x / 5`), and a form (category select
  + title + note + XP, capped at 10 client-side too, purely so the form can
  disable itself — the backend is still the real enforcement). Deliberately
  *not* on `HabitsPage.tsx` itself, which the child normally uses — keeping
  habit creation behind the parent PIN gate matches how every other
  parent-only control already works in this app.
- Verified end-to-end through the real UI: signed up a test family, created
  a custom task from Settings, confirmed it appeared on the child's
  HabitsPage tagged "Ailənizin fərdi vərdişi" next to the admin catalog's
  task, completed and un-completed both (XP moved correctly each time via
  real network calls, not local-only state), confirmed the admin panel's
  own catalog view never shows a family's custom tasks, and confirmed the
  caps server-side via curl: a 15-XP task → 400, a 6th custom task once 5
  already exist → 409. Test rows deleted from Neon afterward.
- **Zero automated test coverage** on any of this backend work
  (`CreateFamilyHabitTaskCommandHandler`, the three completion handlers,
  `HabitChildOwnership`) — same gap, same reason, as everything else
  flagged this way in `backend/README.md`: verified by hand at explicit
  user direction to deprioritize test-writing for now. Test count is still
  45.

## Dynamic XP on habit completion — streak bonus, real ledger, live feedback

Requested explicitly, with scope narrowed by two follow-up questions: the
XP a child earns for completing a habit task is no longer a flat, static
number — it now includes a **consecutive-day streak bonus**, is **actually
persisted** to the (previously schema-only, handler-less) `XpTransaction`
ledger instead of living only in local Zustand state, and completing a
task now shows **live animated feedback** (a floating "+N XP" badge, on
top of the XP bar's own already-existing spring animation). Deliberately
**not** built: any way for a parent, admin, or the child themselves to
override the awarded amount at completion time — the user chose "fully
automatic" explicitly when asked, to keep the reward economy consistent
across children rather than letting whoever clicks "complete" set their
own number.

- **`HabitXpAward`** (`Application/Habits/HabitXpAward.cs`) is the one
  place the formula lives: `CalculateStreakBonus(streakDays) =>
  Math.Clamp(streakDays - 1, 0, MaxStreakBonus)` — a fresh, non-consecutive
  completion (`streakDays == 1`) earns no bonus; +1 XP per additional
  consecutive day, capped at `MaxStreakBonus = 5`. Also defines
  `SourceType = "habit_completion"`, the tag every habit-sourced
  `XpTransaction` carries so it can be found again later.
- **`CompleteHabitTaskCommandHandler`** now, after writing the
  `HabitCompletion` row: calls the new
  `IHabitCatalogRepository.GetConsecutiveStreakDaysAsync(childId, taskId,
  logDate)` (walks backward day-by-day from `logDate`, since the day's own
  completion was just written this counts it as day 1, not day 0),
  computes the bonus, and writes an `XpTransaction` row
  (`Amount = task.XpValue + bonus`, `SourceId` = the new completion's own
  `Id`) — the first thing to ever write to that table. Returns a richer
  `HabitCompletionResultDto` (`XpAwarded`, `BaseXp`, `BonusXp`,
  `StreakDays`), not just the plain completion. The idempotent
  already-completed path reports back the *already-granted* amount (looked
  up from the existing `XpTransaction`) rather than recomputing — a
  re-complete can't accidentally change what was already paid out.
- **`UncompleteHabitTaskCommandHandler`** now also finds and removes the
  matching `XpTransaction` (by `SourceType` + `SourceId`) before removing
  the `HabitCompletion` — un-completing properly reverses the ledger, not
  just the completion flag.
- **`GetHabitCompletionsQueryHandler`** now batch-attaches each
  completion's `XpAwarded` (a single `GetXpAmountsForSourceIdsAsync` call,
  not an N+1) — needed so the frontend knows the *real* amount to subtract
  if the user un-completes a task that was already done before the page
  loaded (which can differ from the task's current static `xpValue` once a
  streak bonus applied).
- **Frontend (`HabitsPage.tsx`)**: tracks `completedXp` (`taskId ->
  xpAwarded`) locally so un-completing always subtracts the real granted
  amount, not `row.xpValue`. On completion, the toast names the streak
  explicitly when there's a bonus ("... (`N` günlük seriya bonusu!)"), and
  a new **`src/components/ui/XpBurst.tsx`** component renders a floating
  "+N XP" badge (framer-motion, rises and fades over ~1s) anchored inside
  the XP summary card — which already had `ProgressBar`'s own spring
  animation on its fill, so no changes were needed there, just feeding it
  the updated `xp` value. The AI-camera demo and the mock/local-only path
  (no backend account) both get the same floating-badge treatment too, for
  visual consistency, even though neither one computes a real streak bonus
  (the camera demo isn't tied to a real backend task; the mock path has no
  backend to persist to) — purely presentational, no XP-amount logic
  changed in either.
- Verified end-to-end: curl first — completed the same real catalog task
  (base 3 XP) across 7 simulated consecutive days (by passing explicit
  `logDate` values a real UI never would, bypassing the frontend's
  "today only" restriction, purely to exercise the streak math) and
  confirmed the exact progression 3,4,5,6,7,8,8 (bonus 0,1,2,3,4,5,5 —
  capped from day 6 on); confirmed idempotent re-complete on the same day
  returns the same 8, not a recompute; confirmed un-complete removes both
  the `HabitCompletion` and its `XpTransaction` (checked directly in
  Postgres — exactly 7 ledger rows and 7 completion rows existed, 1:1,
  before cleanup); confirmed re-completing after an uncomplete recomputes
  fresh and still lands on the same capped amount, since the rest of the
  streak was untouched. Then through the real UI: signed up a fresh test
  family, completed a real task, watched XP go from 1,250 → 1,253 and the
  "+3 XP" badge appear in the DOM, confirmed the toast text, then
  un-completed it and watched XP return to exactly 1,250. Test family and
  all its rows (`xp_transactions`, `habit_completions`, `children`,
  `parents`, `families`) deleted from Neon afterward.
- **Zero automated test coverage** on any of this
  (`CompleteHabitTaskCommandHandler`'s new streak-bonus logic,
  `UncompleteHabitTaskCommandHandler`'s ledger reversal,
  `GetConsecutiveStreakDaysAsync`, `GetXpAmountsForSourceIdsAsync`) — same
  gap, same reason, as everything else flagged this way in
  `backend/README.md`. Test count is still 44 (the existing Habits tests,
  such as they are, predate this and don't cover XP at all — see "Family
  habits" above, which already flagged zero coverage on the completion
  handlers before this round added more logic to them).

## Forgot password for family accounts — real email via Resend

Requested explicitly. Before this, the project had **no email-sending
capability at all** — no SMTP, no provider SDK, nothing. Asked how the
reset link should actually reach a parent, the user chose real email
delivery (Resend) over the two cheaper alternatives offered (a dev-only
flow that shows the link directly in the UI, or a PIN-based reset with no
email at all) — this is the only option that behaves like a real "forgot
password" flow a user could actually receive.

- **New table, `PasswordResetToken`** (migration `AddPasswordResetToken`)
  — `ParentId`, `TokenHash` (SHA-256 of a 32-byte random value; the raw
  token is never stored, only ever exists in the email and the one reset
  request that redeems it), `ExpiresAt` (1 hour), `UsedAt` (null until
  consumed). Not soft-deletable — a disposable row, not something to
  "undelete." `Application/Identity/PasswordResetTokens.cs` is the one
  place the token's shape (generate + hash) lives, shared by both new
  command handlers so they can't drift.
- **`POST /api/identity/forgot-password`** always returns 204, whether or
  not the email matches a real account — the handler silently no-ops for
  an email with no account, same anti-enumeration shape
  `InvalidCredentialsException`'s shared message already uses for login,
  just applied to a different endpoint. **`POST
  /api/identity/reset-password`** takes the raw token + new password;
  updates `PasswordHash` and marks the token used in one atomic save. See
  "Forgot password (family accounts)" in `backend/README.md` for the full
  endpoint contracts and the `IPasswordResetEmailSender`/
  `ResendPasswordResetEmailSender` design (Application defines the "send
  this person an email" interface, Infrastructure owns the real link
  (reads `Frontend:BaseUrl`) and the actual Resend HTTP call — same
  layering discipline as `IContentCatalogRepository`/`IPlaylistCatalog`).
- **`src/pages/ForgotPasswordPage.tsx`** (new, `/sifre-unutdum`) — an
  email-only form mirroring `LoginPage.tsx`'s two-panel visual style;
  submitting always shows the same generic "check your email" success
  state, matching the backend's own silence about whether the account
  exists. **`src/pages/ResetPasswordPage.tsx`** (new, `/sifre-sifirla`) —
  reads `?token=` via `useSearchParams` (works fine under `HashRouter`,
  since the query string is relative to the route after the `#`), shows a
  clear "link is invalid" state up front if there's no token at all, and a
  new-password + confirm form otherwise; a 400 from the backend (expired/
  used/bogus token) maps to the same Azerbaijani message either way, same
  pattern `LoginPage`/`SignupPage` already use for leaking backend English
  text. `LoginPage.tsx` gained a "Şifrəni unutmusunuz?" link under the
  password field.
- **`Resend:ApiKey`/`Resend:FromAddress` aren't configured yet** — checked
  lazily inside `ResendPasswordResetEmailSender`, so the app still boots
  fine without them; only an actual forgot-password request for a real
  account hits the missing-config error. Get a free key at resend.com;
  sandbox mode (send from `onboarding@resend.dev` to your own account
  email) needs no domain verification and is enough for local dev.
- Verified end-to-end via curl, all the way up to the Resend call itself:
  a non-existent email 204s with no email attempt; a malformed email, a
  missing reset token, and a too-short new password all 400 correctly; a
  real registered email correctly reaches Resend and fails there with the
  exact "Missing Resend:ApiKey" error (expected without a key — confirms
  the whole path up to that external boundary, same verification shape
  `YouTube:ApiKey`'s absence got in the Content slice). The actual reset
  lifecycle (the part that doesn't depend on Resend) was fully verified
  with a token inserted directly into Postgres with a known raw value: a
  valid token resets the password and a login with the new password then
  works while the old one 401s, reusing the same now-used token 400s, and
  an expired token 400s too. Then through the real UI: submitted
  ForgotPasswordPage for a real account (correctly surfaced the
  "couldn't send, try again" error — expected, no Resend key), submitted
  it again for a non-existent email (correct generic success screen),
  then navigated ResetPasswordPage with a token inserted the same way,
  set a new password, watched the success toast and redirect to `/giris`,
  and confirmed via curl that login with the new password actually works.
  Test families and all their rows deleted from Neon afterward.
- **Not yet verified: actual email delivery** — that needs a real
  `Resend:ApiKey`/`Resend:FromAddress`, neither supplied during this
  build. Everything up to the Resend API call is proven correct; nobody
  has actually received one of these emails yet. Worth a quick real send
  test the next time a Resend key is available.
- **Zero automated test coverage** on any of this
  (`ForgotPasswordCommandHandler`, `ResetPasswordCommandHandler`,
  `ResendPasswordResetEmailSender`) — same gap, same reason, as everything
  else flagged this way in `backend/README.md`. Test count is still 44.

## Weekly streak ("Həftəlik Seriya") now real

Requested explicitly, pointing at a `HabitsPage.tsx` screenshot: "apply all
the backends ... like real xp, weekly strike and so on." XP was already
real by that point (see "Dynamic XP" above) — the "Həftəlik Seriya" widget
was the one remaining piece on that page still entirely static mock data,
even for a family synced to a real backend account.

- **New endpoint, `GET /api/habits/children/{childId}/streak?today={date}`**
  — see "Weekly streak" in `backend/README.md` for the full design:
  `GetHabitStreakQueryHandler` computes a Duolingo-style `consecutiveDays`
  (today counts the moment it has a completion; otherwise the streak is
  still "alive" off yesterday — a missed day breaks it entirely, even with
  earlier history) and a 7-day Monday-Sunday `week`, each day tagged
  `"done"`/`"today"`/`"upcoming"`/`"missed"`. Deliberately a different
  concept from `HabitXpAward`'s per-task streak bonus — this one is "did
  the child do *anything* habit-related that day," not "did they complete
  this specific task again."
- **`src/pages/HabitsPage.tsx`** fetches the streak alongside categories
  and completions on load, and again after every complete/uncomplete
  (`refreshStreak()`), so the badge and day-circles stay live. A new fixed
  `AZ_DAY_LABELS` array (`B.e`/`Ç.a`/`Ç`/`C.a`/`C`/`Ş`/`B`, Monday-first)
  replaces the per-day labels the static mock JSON used to carry.
  `"missed"` renders identically to `"upcoming"` (plain gray, no
  checkmark) — the same visual the mock widget always had; no new UI state
  was asked for.
- Verified end-to-end via curl — zero completions shows `consecutiveDays:
  0` with every day `"upcoming"` except today; completing today flips it
  to 1 while today's own state stays `"today"` (not `"done"`, by design);
  three consecutive days (spanning a week boundary) correctly gave
  `consecutiveDays: 3`; and completing Monday+Tuesday while deliberately
  skipping Wednesday (with "today" set to Thursday) correctly showed
  Mon/Tue `"done"`, Wed `"missed"`, and `consecutiveDays: 1` — Wednesday's
  gap broke the chain even though Monday/Tuesday had history. Also: no
  token → 401, a different family's token → 403. Then through the real
  UI: the badge read the real `"0 GÜN"` on load (not the old static
  `"7 GÜN"`), flipped to `"1 GÜN"` immediately after completing a task,
  and the day-circles' styling was confirmed correct via direct DOM
  inspection. Test families deleted from Neon afterward.
- **Still mock on this page**: "Bugünkü ekran vaxtı" (today's screen time)
  — real tracking needs the entire Focus Mode backend slice (sessions,
  timers), which doesn't exist at all yet. Flagged, not attempted, as out
  of scope for this round — see "Open items" below if this is wanted next.
- **Zero automated test coverage** on `GetHabitStreakQueryHandler`/
  `GetCompletionDatesAsync` — same gap, same reason, as everything else
  flagged this way. Test count is still 44.

## Real YouTube playback progress tracking (replaces the "Tamamladım" button)

Requested explicitly, picking up item 8 from "Open items" below: track a
child's actual YouTube watch progress via the IFrame Player API's
`onStateChange`/polling, instead of a single manual "I watched it" click.
This was frontend-only — no backend changes, since video-watch XP was
always local-only Zustand state (`watchedPct`/`addXp`), not a backend
ledger like habit XP.

- **`src/components/YoutubePlayer.tsx`** already polled the real IFrame API
  (`getCurrentTime()`/`getDuration()`) every 250ms for its own seek bar and
  time display — that real position just wasn't surfaced to the page that
  owns `watchedPct`. It now takes two optional props: `onProgress(pct)`,
  fired at most once per whole-percent change (not every 250ms tick — that
  would re-render the whole page, including the playlist sidebar's
  watched-count badges, far more than needed), and `onCompleted()`, fired
  exactly once per video load. `onCompleted` reuses the player's existing
  near-the-end detection (`END_SCREEN_BUFFER_SECONDS`, see the comment
  above it) rather than waiting for YouTube's real `ENDED` state — that
  state never fires here, since the player deliberately pauses a few
  seconds early to cover YouTube's own branded end screen (see "Content
  system" above). A `completedFiredRef` guards against firing twice (the
  poll's early-stop and a genuine `ENDED` both funnel into the same check).
  Both callbacks are read through latest-value refs (synced via a
  `useEffect`, not mutated mid-render — the latter trips oxlint's
  `react(refs)` rule) so the poll interval, set up once per video, always
  calls whatever the parent's current prop is without needing it in that
  effect's dependency array.
- **`src/pages/AnimationsPage.tsx`**: `markWatched()` (the old button
  handler) is gone, replaced by `handleProgress(pct)` and
  `handleCompleted()`, wired as `YoutubePlayer`'s new props.
  `handleProgress` is monotonic — `setWatchedPct` only fires when the new
  percentage is actually higher than what's already stored, so scrubbing
  backward (or replaying an already-completed video from 0) never erases
  recorded progress. `handleCompleted` checks the *current* `watchedPct`
  (not a ref) before awarding XP, so replaying a video that's already at
  100% shows the completed state again but doesn't re-award the +3 XP —
  this matters because `completedFiredRef` only resets per video *load*
  (a fresh mount via the `key={activeVideo.youtubeId}` on `YoutubePlayer`,
  not per replay), so `onCompleted` *will* fire again on an in-place
  replay; the idempotency guard has to live on the `AnimationsPage` side,
  not just the player side.
- **UI**: the green "Tamamladım" button (click to mark watched) is now a
  plain, non-interactive status readout in the same spot — "✓ Tamamlandı"
  once `watchedPct` hits 100, or "İzlənilib: NN%" while partway through
  (nothing shown before a video's first play). There's no action left to
  take here on purpose; progress drives itself now.
- Verified live, not just by reading the code: played a real "Tədbirlər"
  video through a disposable test family's session, confirmed
  `watchedPct` climbed in real time off the actual IFrame position (39% at
  a real 31s mark of a ~58s video, tracked via direct `localStorage`
  inspection, not just the DOM), then scrubbed the seek bar
  to 53s (inside the 6s end buffer) and confirmed completion fired
  automatically — `watchedPct` jumped to 100, XP went from 1,250 → 1,253,
  and the badge switched to "Tamamlandı" — with zero manual click anywhere
  in the flow. Then confirmed both guards: scrubbing back to 10s while
  paused left `watchedPct` at 100 (no regression), and replaying the same
  video from 0 through to completion again left XP at 1,253, not 1,256 (no
  double-award). Test family deleted from Neon afterward.
- **Still not built, and not part of this round's ask**: this is watch
  *position* tracking, not watch *time* — scrubbing straight to the end
  without watching any of it still completes the video, same limitation
  every simple "resume where you left off" tracker has. Flagging this isn't
  new scope creep to fix, just a known edge the simple position-based
  approach doesn't close.

## Minute-based video notes ("add adding notes as Udemy based on minute")

Requested explicitly, naming Udemy's lecture-notes UX as the reference: a
note taken while watching a video should anchor to the real minute it was
taken at, be listed by video position rather than add order, and clicking
a note should jump playback straight back to it. Before this, the "Mənim
Dəqiqə Qeydlərim" card on `AnimationsPage.tsx` was pure decoration — a
single hardcoded `timestamp: '01:02'` from `src/data/animations.json`,
shared across every video, that a new note was just prepended to with a
fake `'indi'` ("now") timestamp. Frontend-only, like the progress-tracking
work right above it — notes were never backed by anything server-side to
begin with.

- **`src/components/YoutubePlayer.tsx`** gained an imperative handle
  (`forwardRef`/`useImperativeHandle`, exported as `YoutubePlayerHandle`):
  `getCurrentTime()` reads the real IFrame position on demand (not a
  continuous callback — notes only need the position at the moment "save"
  is clicked), and `seekTo(seconds)` commands a real seek + resume (also
  clearing `hasEnded`, so jumping back into an already-finished video
  un-covers the end-screen cover and actually plays). A new optional
  `startAtSeconds` prop feeds YouTube's own `start` embed param, used only
  at construction time for a given `youtubeId` — see below for why a second,
  imperative path (`seekTo`) was still needed alongside it.
- **`src/lib/formatTime.ts`** (new) — the `M:SS`/`H:MM:SS` formatter that
  used to live as a private function inside `YoutubePlayer.tsx` is now
  shared, since both the player's own time display and a note's
  `timestampLabel` need to agree on the same format.
- **`src/store/useAppStore.ts`** gained `videoNotes: Record<string,
  VideoNote[]>` (keyed by `youtubeId`, same convention as `watchedPct`) and
  `addVideoNote(videoId, timestampSeconds, text)`, which formats the label
  via `formatTime` and re-sorts that video's list by `timestampSeconds` —
  Udemy shows notes in video order, not the order they were typed, so a
  note added late about an earlier moment still lands above one added
  first about a later moment. Persisted via the existing Zustand
  `persist` — no version bump, since this only adds a new top-level key
  rather than changing the shape of anything already stored (per this
  file's own "bump only on shape changes" rule above). The old single mock
  note is now seeded onto the one video `seedWatchedPct` already seeds
  progress for, so a fresh profile isn't staring at a totally empty list.
- **`src/pages/AnimationsPage.tsx`**: `saveNote()` now reads
  `playerRef.current?.getCurrentTime()` and calls `addVideoNote` — real
  position, not a guess — and is disabled (input + button, with the
  placeholder itself explaining why) until the player has actually been
  started at least once, since there's no meaningful "minute" before that.
  The notes list is now scoped to `activeVideo.youtubeId` (switching videos
  shows that video's own notes, not a shared global list) and each row is
  a clickable button, not static markup — `jumpToNote(seconds)` either
  calls the mounted player's `seekTo` directly, or, if the child clicks a
  note before ever pressing play, sets `pendingSeekSeconds` and flips
  `isPlaying` so `YoutubePlayer` mounts fresh with `startAtSeconds` already
  set (this is why `seekTo` and `startAtSeconds` both exist — one handles
  "already playing," the other "cold start straight into a note").
  `pendingSeekSeconds` is cleared alongside `isPlaying` whenever `activeId`
  changes, so switching videos can never carry a stale jump target into an
  unrelated one.
- Verified live, not just by reading the code, with a disposable test
  family: played a real "Tədbirlər" video to ~15s in, typed a note, saved
  it, and confirmed via direct `localStorage` inspection that it landed
  with `timestampSeconds: 31` / `timestampLabel: "0:31"` — the real
  position at save time, not a placeholder — keyed correctly under that
  video's own `youtubeId` alongside the unrelated seeded note on a
  different video. Clicking the note while the player was already at 0:39
  seeked it back to ~0:31. Then, to specifically exercise the cold-start
  path, hard-reloaded the page (back to the poster screen, player
  unmounted) and clicked the same note directly — confirmed the player
  mounted and began playback already at 31s (not 0), via the embed's own
  `start` param. Test family deleted from Neon afterward.
- **Zero automated test coverage** — same as every other frontend-only
  piece flagged this way in this file; no test runner exists for the
  frontend at all yet (see "Open items" #9 below).

## Focus Mode — the video-limit lock is now real

Requested explicitly ("let's do focus mode"), picking up item 11 from "Open
items" below. `FocusSession` existed in the schema from the very start
(`Id`, `ChildId`, `StartedAt`, `LockedUntil`, `Minutes`, `TriggerReason`)
with zero handlers ever touching it — `FocusModePage.tsx`'s "2 Video
Limitinə Çatdı" cooldown screen ran entirely on local Zustand state
(`focusLockUntil`), and — a real, separate gap found while scoping this —
nothing on the frontend ever actually *triggered* it either; the mock page
just auto-started a demo lock on its own the moment it was visited with
nothing active, and nothing stopped a child from navigating straight back
to `/animasiya` mid-lock regardless. This round made the lock itself real
and wired up both ends: a genuine trigger, and genuine enforcement.

- **Backend**: `POST /api/focus/children/{childId}/lock` (idempotent — an
  already-active lock is returned as-is, never stacked) and
  `GET /api/focus/children/{childId}/lock/active` (204, not 404, when
  there's no active lock — a routine, expected result). Same ownership
  shape as the Habits completion endpoints (keyed by `childId`, resolved
  via `IFamilyAccountRepository.GetFamilyIdForChildAsync`). Full contract
  and design in "Focus Mode (video-limit lock)" in `backend/README.md`.
- **The real trigger**: `AnimationsPage.tsx` now tracks which videos
  completed on which day (`useAppStore.videoCompletionDates`) and starts a
  real 15-minute lock (reason `"video_limit"`) every 2nd completion in a
  day — repeating, not a one-time daily cap, matching what the original
  mock copy always implied. A child with no backend account gets the same
  trigger purely locally.
- **The real enforcement gap, closed**: `src/routes/Guards.tsx` gained
  `RequireNotFocusLocked`, now wrapping `/animasiya` — it checks the real
  active lock (backend-synced child) or the local one (local-only child)
  and redirects to `/focus-mode` if one's active, so the lock can no longer
  be bypassed by just navigating straight back. `FocusModePage.tsx` no
  longer invents a demo lock for a backend-synced child with nothing
  active — it reads the real one back and bounces to `/animasiya` if
  there isn't one; the original auto-start-a-demo-lock behavior is kept,
  unchanged, for a local-only child so the page stays explorable without a
  backend account.
- Verified end-to-end via curl (no lock → 204, start → 200, re-start while
  active → same `id` back not a new row, `minutes: 500` → 400, bogus
  `childId` → 404, another family's token → 403), then through the real
  UI: completed two real videos back to back, watched the app navigate to
  `/focus-mode` on its own with a live countdown fed by a real `FocusSession`
  row in Postgres, confirmed navigating straight back to `/animasiya` mid-lock
  correctly bounced back (the enforcement fix, actually proven, not just
  coded), and confirmed visiting `/focus-mode` directly with no active lock
  bounced to `/animasiya` instead of faking one. Test families deleted from
  Neon afterward.
- **Deliberately not built this round**: real "today's screen time"
  tracking for `HabitsPage.tsx`'s "Bugünkü ekran vaxtı" stat — this is a
  *different* concept from the lock (`FocusSession` only ever recorded
  lock events, never cumulative watch-time), and the schema has nothing
  else designed for it either. That stat is still a static string; giving
  it a real value means designing a new tracking mechanism from scratch,
  not something this round's scope — "Focus Mode" named the lock, and the
  lock is what got built real.
- **Zero automated test coverage** on any of this
  (`StartFocusLockCommandHandler`, `GetActiveFocusLockQueryHandler`,
  `EfFocusRepository`) — same gap, same reason, as everything else flagged
  this way. Test count is still 44.

## Leagues — the reward store and parent approval are now real

Requested explicitly ("let's do leagues part"). `Reward`/`RewardRedemption`
existed in the schema from the start with zero handlers — `LeaguesPage.tsx`'s
"🎁 Mükafat Mağazası" redeem flow was entirely local Zustand state
(`redeemedRewards`), an instant, unapproved "spend" that ignored the reward
store's own on-page disclaimer about a parent having to approve each one
first. League *tiers* (Bürünc/Gümüş/Qızıl/Almaz) needed no backend work —
they're a pure function of `xp`, already real since the earlier Dynamic XP
round — so this round was specifically about the reward store and the
approval flow its own copy always implied but never had behind it.

- **Backend**: `GET /api/leagues/children/{childId}/rewards`,
  `POST .../rewards/{rewardId}/redeem`,
  `GET /api/leagues/pending-redemptions?familyId=`,
  `POST /api/leagues/redemptions/{id}/approve`, `.../reject`. Redeeming
  debits the child's real XP immediately (reserving it, not paying on
  approval) and creates a "pending" row; approving leaves XP alone,
  rejecting refunds it. A "rejected" redemption doesn't permanently block
  that reward — the child can try again. Full contract and design in
  "Leagues" in `backend/README.md`.
- **The XP ledger's real, authoritative balance** (`XpTransaction`, first
  written by the Habits slice) got its first actual *consumer*:
  `GetTotalXpAsync(childId)` is what `RedeemRewardCommand` checks
  server-side — the frontend's own `xp` display (used everywhere else in
  the app, including this page's own "can I afford it" button styling)
  stays exactly the local, never-reconciled-with-the-backend counter it
  already was before this round; only the actual spend is now really
  enforced.
- **The reward catalog has no admin management UI** — the four rewards
  (the same ones that used to be `src/data/leagues.json`'s static list)
  are seeded idempotently at backend startup instead, same shape as the
  seeded admin account.
- **`src/pages/LeaguesPage.tsx`**: for a backend-synced child, the reward
  grid now reads real catalog + redemption status (locked/"Təsdiq
  Gözlənilir"/"Dəyişdirildi"/affordable) instead of the mock JSON, and the
  "🔥 N GÜNLÜK SERİYA" badge now shows the real streak
  (`fetchHabitStreak`, already built for `HabitsPage.tsx`'s widget) instead
  of a static "7 GÜNLÜK SERİYA · 2× XP AKTİVDİR" — the "2×" bonus was
  never a real mechanic anywhere in the app, so that half of the copy was
  dropped rather than carried forward as a claim nothing backs up. The
  local-only (no backend account) path is untouched, same mock behavior as
  before.
- **`src/pages/SettingsPage.tsx`** gained a "Mükafat Təsdiqləri" card —
  the actual parent-approval surface, same `CustomHabitsCard` pattern as
  the existing "Fərdi Vərdişlər" card: lists every pending redemption
  across the family's child(ren) with one-click approve/reject, and hides
  itself entirely once there's nothing pending rather than sitting there
  empty.
- **A real bug caught during this round's own live-UI verification**: to
  specifically exercise server-side enforcement, the frontend's local `xp`
  display was deliberately desynced from the real backend balance (set
  far higher than the real ledger) and a redeem attempted — the backend
  correctly rejected it with 400, proving the spend is really enforced
  server-side and not just gated by the optimistic local counter, but the
  raw English `InsufficientXpException` text leaked straight into this
  Azerbaijani UI's toast. Fixed in `LeaguesPage.tsx` (and the equivalent
  resolved-redemption case in `SettingsPage.tsx`'s approval card) the same
  way `LoginPage.tsx`/`SignupPage.tsx` already handle their own
  backend-error leaks — known substrings mapped to a proper Azerbaijani
  message, same pattern, not a new one.
- **A real, separate bug caught along the way, unrelated to the feature
  logic itself**: the first version of the reward-catalog seed wrote
  visibly mangled Azerbaijani text into Postgres — not the already-known
  "never use inline `curl -d` with diacritics" issue, since nothing here
  went through curl at all; this was a stale incremental-build artifact.
  A full clean rebuild fixed it. See "Leagues" in `backend/README.md` for
  the diagnosis, worth remembering if a future hardcoded-diacritic seed
  ever looks wrong on first boot.
- Verified end-to-end via curl — accumulated real XP through 65 backdated
  habit completions on a disposable test child (same technique "Dynamic
  XP" above used), then insufficient-XP (400), successful redeem (XP
  debited exactly, status "pending"), double-redeem-while-pending (409),
  the full pending-list → approve (XP unchanged) → already-resolved (409)
  path, and a separate redeem → reject (XP refunded to the exact
  pre-redeem amount) → successful retry path, plus 401/403/404 across
  every endpoint. Then through the real UI: the catalog rendered with
  correct Azerbaijani diacritics and real per-reward status badges,
  approving a real pending redemption from Settings removed it from the
  list with a success toast, and the error-leak bug above was caught and
  fixed live. All test families and rows deleted from Neon afterward; the
  real four-row reward catalog was only ever read from, confirmed
  numerically unchanged at the end.
- **Zero automated test coverage** on any of this
  (`RedeemRewardCommandHandler`, `Approve`/`RejectRewardRedemptionCommandHandler`,
  `GetRewardsQueryHandler`, `GetPendingRedemptionsQueryHandler`,
  `EfRewardRepository`, `GetTotalXpAsync`) — same gap, same reason, as
  everything else flagged this way. Test count is still 44.

## Social — the feed, likes, comments, and leaderboard are now real

Requested explicitly ("let's do social"). `SocialPost`/`PostLike`/
`SocialComment`/`CommentLike` existed in the schema from the start with
zero handlers — `SocialPage.tsx`'s feed, like counts, comment counts, and
leaderboard were all static mock JSON, with no way to actually post, like,
or comment on anything. **Deliberately cross-family, unlike every other
real slice so far**: the feed and leaderboard span every family in the
app, same as the original mock data always implied — a parent's own
family isn't a privacy boundary here the way it is for Habits/Focus/
Leagues, only *who's allowed to act as which child* still is.

- **Backend**: `GET /api/social/posts`,
  `POST /api/social/children/{childId}/posts`,
  `POST`/`DELETE .../posts/{postId}/like`,
  `GET /api/social/posts/{postId}/comments`,
  `POST .../posts/{postId}/comments`, `GET /api/social/leaderboard`. Full
  contract and design in "Social" in `backend/README.md`.
- **The anonymized identity problem, solved without a schema change**: the
  mock's handles (`"@UlduzKəşfiyyatçı_44"`) implied a stable-feeling
  per-child identity, but nothing in the schema persists one — `Handle`
  lives on `SocialPost`, per-post, not on `Child`. `SocialHandle.Generate
  (childId)` is a small, deterministic function (reads the child's own Guid
  bytes directly, picks from a fixed list of pre-built compound words) that
  produces the *same* handle every time for the same child, with zero new
  columns — a post freezes its own handle at creation (so old posts never
  silently change byline), the leaderboard and comment list both compute it
  fresh at read time. Verified live: the same test child's post, comment,
  and leaderboard row all showed the identical handle, computed three
  separate times.
- **The XP ledger's third real consumer**: the leaderboard ranks by actual
  total XP (`IHabitCatalogRepository.GetTopXpChildrenAsync`, same ledger
  Habits first wrote and Leagues first *spent* from) — no mock numbers.
  While verifying this live, it correctly surfaced a real, pre-existing
  account's real XP on the leaderboard (not a test row) — left it exactly
  as found, same "don't touch real data" discipline as every other round.
- **The "AI Filter" badges are still purely decorative** — shown on every
  post unconditionally, exactly as the original mock did. No moderation
  service of any kind exists anywhere in this slice, only a plain
  280-character cap. Worth being upfront about, since this is a
  kids'-safety-themed feature and the badge's own copy claims more than
  what's actually running underneath it.
- **Deliberately not built this round**: liking a *comment* (`CommentLike`,
  the fourth table in this domain, still has no handlers — only a post
  itself can be liked), and nested reply display — a reply can be created
  with a real `parentCommentId` (verified via curl) and the backend returns
  it correctly, but `SocialPage.tsx`'s own comment UI only ever posts
  top-level comments this round, not reply-to-a-specific-comment.
- **A real UX gap caught and fixed during this round's own live-UI
  verification**: posting a second comment on an already-expanded post
  correctly saved it, but the collapsed header's own "N Şərh" count only
  updated on the next full page reload, not immediately — `PostCard`
  needed an `onCommentAdded` callback (bumping the parent's local
  `commentCount`) to match the optimistic-update shape `onToggleLike`
  already had for likes.
- **A real gotcha hit while verifying via curl, not a product bug**: a
  child's `AvatarEmoji` (a 4-byte UTF-8 emoji) came back as `"??"` from
  every curl response for a child created with an inline `-d` body — the
  same already-known Windows Git Bash diacritic-corruption bug flagged
  elsewhere in this file, just triggered by an emoji for the first time
  instead of an Azerbaijani letter. Confirmed live through the real UI
  that the actually-stored avatar was always correct — purely an artifact
  of this one curl session's own setup.
- Verified end-to-end via curl with two disposable test families
  specifically to exercise the cross-family behavior a single family
  couldn't: Family B could see, like, and comment on Family A's post, with
  `likedByMe` correctly differing per viewer of the exact same post;
  idempotent like/unlike; a reply with a real `parentCommentId` vs. one
  pointing at an unrelated comment (400); the leaderboard correctly
  excluding zero-XP children until a real habit completion gave one XP;
  401/403/404 across every endpoint. Then through the real UI: composed a
  real post with a media-emoji picker, liked/unliked it against the real
  backend, expanded and posted two real comments (catching the count-gap
  bug above). All test families and their posts/comments/likes deleted
  from Neon afterward — confirmed `social_posts` back to zero rows (every
  single one was test data), the one real pre-existing account's data
  left untouched throughout.
- **Zero automated test coverage** on any of this
  (`CreatePostCommandHandler`, `Like`/`UnlikePostCommandHandler`,
  `CreateCommentCommandHandler`, `GetPostsQueryHandler`,
  `GetCommentsQueryHandler`, `GetLeaderboardQueryHandler`,
  `EfSocialRepository`, `GetTopXpChildrenAsync`,
  `GetChildrenByIdsAsync`) — same gap, same reason, as everything else
  flagged this way. Test count is still 44.

## Admin accounts: deactivate, reactivate, edit

Requested explicitly, picking the "Admin Accounts: add deactivate/edit"
gap out of a short list of flagged-but-not-acted-on items. `AdminAccountsPage.tsx`
was a pure listing before this — `GET /api/admin/families` only, with an
inline note saying deactivate/edit needed new endpoints. This round built
those endpoints and the UI for them.

- **Backend**: `GET /api/admin/families/deactivated`,
  `POST /api/admin/families/{id}/deactivate`/`.../reactivate`,
  `PATCH /api/admin/parents/{id}` (`fullName` only),
  `PATCH /api/admin/children/{id}` (`name`/`city` only — never
  `avatarEmoji`/`gender`/`dateOfBirth`, and never a parent's email/password,
  all deliberately out of scope). Full contract and design in "Admin
  account directory" in `backend/README.md`.
- **Deactivating needed no new "is this account active" flag anywhere** —
  `Family`/`Parent`/`Child` were all already `ISoftDeletable`; cascading the
  soft-delete onto all three (same shape the Content slice's
  cascade-delete-a-playlist's-videos already established) means
  `LoginFamilyCommandHandler` and `AddChildCommandHandler`'s existing
  lookups simply stop finding the deactivated rows on their own — a
  deactivated parent gets the same "incorrect email or password" 401 a
  wrong password would (doesn't leak that the account was deactivated), and
  adding a child to a deactivated family 404s. No code changed in Identity,
  Habits, Focus, Leagues, or Social to make this true — the existing global
  query filters, applied consistently, already enforced it.
- **`src/pages/AdminAccountsPage.tsx`** rewritten around an "Aktiv" /
  "Deaktiv edilmiş" tab switch (same lazy-load-on-first-visit pattern
  `AdminDashboardPage.tsx`'s "Silinmiş" tab already used). Deactivating
  goes through a real confirm `Modal` (destructive, needs a second click);
  reactivating fires immediately on click, same "undo isn't itself
  destructive" reasoning the Content slice's restore buttons already
  established. A parent's full name and a child's name/city are editable
  inline (hover-to-reveal pencil icon, per row, independent save/cancel) —
  not a page-level edit mode, since the real backend write is per-parent/
  per-child anyway.
- Verified end-to-end via curl with a disposable test family: deactivated
  it, confirmed it vanished from the active list and appeared in the
  deactivated one with its child still attached; confirmed the real
  teeth — the deactivated parent's login now 401s, adding a second child
  404s; a repeat deactivate → 404; reactivated → 204, back in the active
  list, login works again; edited the parent's name and the child's name/
  city (Azerbaijani diacritics confirmed intact) → 204 each; blank name →
  400; bogus id → 404; a family parent's own token attempting an edit →
  403. Test family and all its rows deleted from Neon afterward.
- **Not verified live through the actual UI this round** — an unrelated
  environment issue blocked it: the installed `rolldown` (`vite@8.x`'s
  bundler) requires Node ^20.19/>=22.12, the machine this was built on had
  Node 18.20.8 active with no admin access that day to switch it via `nvm`.
  Confirmed there's no smaller fix — every published `rolldown` version
  has the same Node floor, so pinning an older patch wouldn't have helped;
  the only alternative would've been downgrading `vite` off the
  rolldown-based 8.x line entirely, a bigger, riskier change than this
  round's actual scope, so it was explicitly not attempted. `tsc -b` and
  `oxlint` are clean on the changed frontend files
  (`AdminAccountsPage.tsx`, `adminService.ts`); every endpoint was verified
  via curl instead. Worth an actual click-through once the frontend can
  run again, to confirm the tab switch, the confirm-before-deactivate
  modal, and the inline edit rows all behave as designed.
- **Zero automated test coverage** on any of this
  (`DeactivateFamilyCommandHandler`, `ReactivateFamilyCommandHandler`,
  `UpdateParentCommandHandler`, `UpdateChildCommandHandler`,
  `GetDeactivatedFamiliesQueryHandler`) — same gap, same reason, as
  everything else flagged this way. Test count is still 44.

## Screen time tracking and real watch-progress sync

Requested explicitly: "let's continue with Real 'today's screen time'
tracking (needs a new, undesigned mechanism). and watch_progress sync —
watchedPct is still local-only." Both were backend-complete tables with
zero handlers, flagged in this file's own "Focus Mode" and "Real YouTube
playback progress tracking" sections above as the two remaining pieces of
state that lived only in local Zustand, never reaching the backend even
for a backend-synced child.

- **Backend**: two genuinely separate new slices — see "Watch progress
  sync" and "Screen time tracking" in `backend/README.md` for the full
  endpoint contracts and design. Short version: `WatchProgress` (per-video
  percentage, Content domain, server-side `Math.Max` merge — the first
  family-facing endpoints in that domain, everything else there being
  admin-only) and `ScreenTimeEntry` (new table + entity, per-day cumulative
  seconds, Focus domain, additive) — deliberately not conflated with each
  other or with `FocusSession` (which only ever recorded lock events, never
  time), matching the distinction this file's own "Focus Mode" section
  already drew.
- **`src/lib/contentService.ts`** gained `fetchWatchProgress`/
  `upsertWatchProgress`; **`src/lib/focusService.ts`** gained
  `addScreenTime`/`fetchScreenTime`.
- **`src/components/YoutubePlayer.tsx`** gained a third callback,
  `onElapsedSeconds(deltaSeconds)`, fired every ~250ms poll tick while
  actually playing with the real wall-clock time since the previous tick —
  not an assumed "1x speed, never paused" guess. Reported the same
  latest-value-ref way `onProgress`/`onCompleted` already were.
- **`src/pages/AnimationsPage.tsx`**: a new `persistProgress` helper wraps
  the existing monotonic `setWatchedPct` call and, for a backend-synced
  child, also calls `upsertWatchProgress` — `handleProgress`/
  `handleCompleted` both now go through it instead of calling
  `setWatchedPct` directly. A new effect fetches real watch progress on
  load for a backend-synced child and merges it into the local store
  (monotonically — never regresses a value already recorded locally).
  Separately, `onElapsedSeconds` feeds a `screenTimeAccumRef` that flushes
  to `addScreenTime` once it reaches ~10 real seconds, and also on every
  video switch and on unmount (the existing `activeId`-keyed effect's
  cleanup) — so a partial, not-yet-flushed chunk is never silently lost. A
  local-only child (no `childId`) accumulates the same way but the flush
  is a no-op, same split every other backend-only feature already has.
- **`src/pages/HabitsPage.tsx`**: the "Bugünkü ekran vaxtı" card in the
  "Bugünkü Xülasə" stat block — flagged mock in this file's own "Weekly
  streak" section above — now fetches `fetchScreenTime` on load for a
  backend-synced family and formats it via a new local `formatScreenTime`
  helper into the same "1s 40dq" style the old static mock string used
  (hours omitted when zero). A point-in-time read on page load, not a live
  subscription — same shape every other stat on this page already has.
- **Verified via curl only, not the live UI** — same Node 18 vs. `rolldown`
  blocker as the "Admin accounts" round just above (`npm run dev`/`build`
  both still fail; no admin access to switch Node via `nvm` that day).
  `npx tsc -b` and `npm run lint` are both clean on every changed frontend
  file. The backend side was verified end-to-end via curl with disposable
  test families (monotonic merge for watch-progress: 39%→25%→stays
  39%→100%; cumulative addition for screen-time across multiple calls and
  across different dates; validation 400s; cross-family 403s; bogus-id
  404s) — see both new `backend/README.md` sections for the exact
  sequences. Test data deleted from Neon afterward.
- **Zero automated test coverage** on any of this
  (`UpsertWatchProgressCommandHandler`, `GetWatchProgressQueryHandler`,
  `AddScreenTimeCommandHandler`, `GetScreenTimeQueryHandler`,
  `EfContentCatalogRepository`'s three new methods,
  `EfFocusRepository`'s two new methods) — same gap, same reason, as
  everything else flagged this way in this file. Test count is still 44.
- **Worth a real click-through once the Node/environment situation is
  resolved**: confirm the "İzlənilib: NN%"/"Tamamlandı" readout on
  `/animasiya` actually round-trips through the backend (not just the
  local store) for a backend-synced child, and that `/vərdişlər`'s
  "Bugünkü ekran vaxtı" climbs in real time after watching a real video.

## Mini-games — real backend for GamesPage's six games

Requested explicitly: "Games backend" — picked from a short list of
remaining gaps (Wallet and Games were the two fully-mock domains; test
coverage and the Node environment issue were the other options offered).
`Game`/`GameResult` existed in the schema from the start with zero
handlers — all six mini-games (`src/games/*.tsx`) always played fine
client-side, but every result and every XP award was local Zustand state
only (`gameHistory`/`addXp`), never reaching the backend even for a
backend-synced child.

- **Backend**: see "Mini-games" in `backend/README.md` for the full
  endpoint contracts and design. Short version: the six-game catalog
  (title/icon/axis per game) is seeded idempotently at startup, same "no
  admin management UI yet" shape as the Leagues reward catalog — only the
  frontend's existing `GAME_CATALOG` slug needs to resolve to something
  real server-side, not its display metadata. XP is computed server-side
  (`GameXpAward`, mirroring `GamesPage.tsx`'s own `Math.round(5 +
  score/5)` formula exactly) and written as a real `XpTransaction` row —
  the ledger's third writer, after Habits and Leagues' spend.
- **`src/lib/gamesService.ts`** (new) — `recordGamePlay`/`fetchGamePlays`.
- **`src/pages/GamesPage.tsx`**: gained the same `useBackend =
  !!(parent?.familyId && child?.childId)` branch every other backend-wired
  page already has. For a backend-synced child, `handleFinish` now calls
  `recordGamePlay` and credits XP from the real `xpAwarded` the backend
  returns instead of a local guess, and a new `backendPlays` state (fetched
  on load, appended to on each play) drives the "Ümumi oynanıldı"/"Orta uğur
  nisbəti" stats instead of the local `gameHistory` array. A failed network
  call falls through to the exact old local-only path, so the child still
  gets credit for a play even if the backend is briefly unreachable. A
  local-only child (no `childId`) is completely untouched.
- **Verified via curl only, not the live UI** — same Node 18 vs. `rolldown`
  blocker as the "Admin accounts"/"Screen time tracking and real
  watch-progress sync" rounds above. `npx tsc -b` and `npm run lint` are
  both clean on every changed frontend file. The backend side was verified
  end-to-end via curl with a disposable test family (score 80 → `xpAwarded:
  21`, score 0 → `xpAwarded: 5`, confirming the server formula matches the
  frontend's exactly; invalid score/gameId/childId → 400/404/404;
  cross-family → 403 on both endpoints) — see `backend/README.md`'s
  "Mini-games" section for the exact sequence. Test data deleted from Neon
  afterward via a disposable cleanup script that never printed the
  connection string; the seeded 6-row game catalog was only ever read from.
- **Zero automated test coverage** on any of this
  (`RecordGamePlayCommandHandler`, `GetGamePlaysQueryHandler`,
  `EfGameRepository`) — same gap, same reason, as everything else flagged
  this way in this file. Test count is still 44.
- **Worth a real click-through once the Node/environment situation is
  resolved**: confirm a played game on `/oyunlar` actually credits XP and
  appears in the stats row for a backend-synced child, not just via curl.
- **Wallet is now the one remaining fully-mock domain** — see "Next steps"
  in `backend/README.md`.

## Wallet — real backend for balance, donations, and a parent allowance grant

Requested explicitly: "Wallet backend" — the last fully-mock domain, picked
from a short list of remaining gaps (test coverage, the Node environment
issue, and a few small flagged loose ends were the other options offered).
`WalletTransaction`/`DonationCampaign` existed in the schema from the start
with zero handlers — `WalletPage.tsx`'s balance, transaction history, and
donate flow were all static mock data / local-only Zustand state. **Every
domain in the original 22-table schema now has at least one real handler.**

- **Backend**: see "Wallet" in `backend/README.md` for the full endpoint
  contracts and design. Short version: the donation campaign catalog is
  seeded idempotently at startup (same shape as Leagues/Games) and is the
  only *open*, unauthenticated catalog read in this backend — a campaign
  carries no per-child state. The real balance formula (sum of "in" minus
  sum of "out" `WalletTransaction` rows) was already implied by the old
  mock's own seed data arithmetic (15.50 = 24.00 − 8.50) — the old frontend
  `donate()` just never kept it live; this round's `IWalletRepository`
  finally does. `DonateCommandHandler` faithfully ports the mock's own
  `donate()`: it spends real XP (the ledger's fourth writer, after
  Habits/Leagues/Games) **and** logs a real AZN "out" entry for the
  sponsor-matched amount, exactly as the old mock did.
- **The one genuinely new capability, not a port of existing mock
  behavior**: `GrantAllowanceCommand` — a parent manually crediting their
  own child's pocket money, the real version of "Valideyn Cib Pulu" (a
  recurring "in" transaction title the old mock's seed data always showed
  but nothing ever wrote). **Deliberately not built**: automatic AZN
  credits tied to a league-tier change or a weekly streak (the mock's other
  two "in" transaction titles) — neither was ever wired to a real trigger
  even in the mock itself, and building one means reaching into the
  League-tier/streak domains' own logic, a materially bigger change than
  "give the wallet a backend" asked for. A fresh backend-synced family's
  wallet starts at 0.00 AZN with no automatic credit — an honest reflection
  of what's wired, not a bug; a donation only ever needs XP, never AZN
  balance, so it works regardless.
- **`src/lib/walletService.ts`** (new) — `fetchDonationCampaigns` (open,
  no token), `fetchWalletBalance`, `fetchWalletTransactions`, `donate`,
  `grantAllowance`.
- **`src/pages/WalletPage.tsx`**: the donation campaign catalog is now
  fetched from the real backend **for every child, backend-synced or
  not** (it's an open read, same reasoning Content/Habits-categories
  already established for catalog-like data) — this fully replaces
  `src/data/wallet.json`'s static `donations` list and the old regex-
  parsing of XP/AZN amounts out of a pre-formatted button label string. A
  backend-synced child's balance/transaction history come from the real
  endpoints; a local-only child keeps the exact old Zustand
  `balance`/`transactions`/`donate` behavior, just now operating on real
  campaign data instead of static JSON. `handleDonate`'s backend path
  deducts the local `xp` display by the real `xpCost` the backend reports
  (same "frontend's own xp stays a local, never-reconciled counter, only
  the spend is really enforced" posture Leagues' redeem already has).
- **`src/pages/SettingsPage.tsx`** gained a "Cib Pulu Göndər" card — the
  actual parent-grants-allowance surface, same `CustomHabitsCard` trust
  level (a parent acting on their own family, not admin-gated).
- **Verified via curl only, not the live UI** — same Node 18 vs. `rolldown`
  blocker as every frontend round since "Admin accounts". `npx tsc -b` and
  `npm run lint` are both clean on every changed frontend file. The backend
  side was verified end-to-end via curl with a disposable test family
  (balance 0 → grant 20 AZN → balance 20; donate with 0 XP → 400; earned
  300 XP via 12 real Games plays, then donated → `newBalanceAzn: 17`,
  confirming the real sum(in)-sum(out) formula; bogus campaign/child → 404;
  cross-family → 403; no token → 401) — see `backend/README.md`'s "Wallet"
  section for the exact sequence. Test data deleted from Neon afterward via
  a disposable cleanup script that never printed the connection string; the
  seeded 2-row donation catalog was only ever read from.
- **Zero automated test coverage** on any of this (`DonateCommandHandler`,
  `GrantAllowanceCommandHandler`, `GetWalletBalanceQueryHandler`,
  `GetWalletTransactionsQueryHandler`, `GetDonationCampaignsQueryHandler`,
  `EfWalletRepository`) — same gap, same reason, as everything else
  flagged this way in this file. Test count is still 44.
- ~~Worth a real click-through once the Node/environment situation is
  resolved~~ — done, in "Vouchers and partners" below, once the user
  upgraded Node via `nvm`: the balance hero, transaction history, and
  donate buttons on `/cüzdan` were confirmed live against the real
  backend, and "Cib Pulu Göndər" was confirmed to actually move the
  balance (0.00 → 5.00 → 2.00 AZN).

## The Node 18 vs. rolldown blocker is resolved

The user upgraded Node to v24 via `nvm` (previously 18.20.8, with no admin
access to switch it — see "Admin accounts" above for the full history of
this blocker). `npm run dev`/`npm run build` both work again — confirmed
with a real `npm run build` before touching any code this round. This is
the first round since "Admin accounts" that could verify its own frontend
work through the real running app instead of `tsc`/`oxlint`/curl alone —
see "Vouchers and partners" below for what that verification looked like.
**Not done retroactively**: the "Admin accounts", "Screen time tracking and
real watch-progress sync", "Mini-games", and "Wallet" rounds' own frontend
changes were not re-verified live after this fix — each is still only
curl/`tsc`/`oxlint`-verified, exactly as flagged in its own section above.

## Vouchers and partners — QR codes on redemption, a partner scan-and-fulfill panel

Requested explicitly: "after redeeming something it should give a QR
code. And we should create an admin panel for partners as well. and when
they scan this qr it should show all the details." Scoped with three
up-front questions before building: (1) QR vouchers cover **both** Leagues
reward redemptions and Wallet donations, not just one; (2) a partner can
**view details and mark a voucher fulfilled**, not just read; (3) partner
accounts are **seeded demo accounts** (same shape as every other catalog
here), not a real admin-managed CRUD.

- **Backend**: see "Vouchers and partners" in `backend/README.md` for the
  full endpoint contracts and design. Short version: a new `Partner`/
  `Voucher` domain — `Partner` is a third account type (family/admin/
  partner, each with its own disjoint JWT claim), six demo accounts seeded
  idempotently (one openly-documented shared password,
  `Partner_Demo_2026!` — unlike the real Admin password, since these are
  synthetic demo accounts). `Reward`/`DonationCampaign` both gained a
  nullable `PartnerId`, backfilled onto the real pre-existing catalog rows
  by title/sponsor match (the existing "only if the table's empty" seed
  blocks would never have reached them otherwise).
  `RedeemRewardCommandHandler`/`DonateCommandHandler` each create a
  `Voucher` (with a short, QR-friendly `Code`) only when their
  reward/campaign has a partner, and return the code in their own
  response. A reward-sourced voucher can't be fulfilled until the
  underlying redemption is parent-approved; a donation-sourced one has no
  such gate, since donating is already instant.
- **`src/components/ui/VoucherQrModal.tsx`** (new, shared by
  `LeaguesPage.tsx` and `WalletPage.tsx`) renders the real voucher code as
  a QR via `qrcode.react` the moment a redeem/donate call returns one.
  **The QR encodes the bare code, not a URL** — there's no stable deployed
  origin for this app yet (see "Deployment history" below), so a phone
  camera app opening a link isn't workable; a partner instead looks the
  code up through their own dashboard (camera scan or manual entry).
- **`src/pages/PartnerLoginPage.tsx`** mirrors `AdminLoginPage.tsx`'s
  visual style exactly. **`src/pages/PartnerDashboardPage.tsx`** has a
  manual code-entry field and a camera scanner
  (**`src/components/QrScanner.tsx`**, a thin wrapper around
  `html5-qrcode`'s own `Html5QrcodeScanner` — it renders its own full
  camera-permission/picker UI, the wrapper only owns mount/unmount), shows
  the looked-up voucher's details, and a "Təhvil Verildi" button that
  calls the fulfill endpoint. New `usePartnerStore.ts` (a third persisted
  Zustand store, parallel to `useAppStore`/`useAdminStore`) and a new
  `RequirePartnerAuth` guard, same shape as `RequireAdminAuth`. New
  routes: `/tərəfdaş-giris`, `/tərəfdaş`.
- **Verified live through the real running frontend** (the first round
  able to do this since "Admin accounts" — see "The Node 18 vs. rolldown
  blocker is resolved" above): signed up a disposable test family through
  the actual UI, redeemed "Bambini Dondurma" on the real `/liqalar` page
  and watched a real QR/code render; in a second tab, logged in as that
  reward's real seeded partner, looked the code up, confirmed fulfillment
  correctly blocks with "hasn't been approved by a parent yet"; approved
  the redemption from the first tab's `/tənzimləmələr`; fulfilled
  successfully from the partner tab, confirmed the status flipped with a
  real timestamp. Separately donated 3 AZN to "Meşə Salma Kampaniyası" on
  the real `/cüzdan` page, got a second real code, logged in as the
  *different* seeded Kapital Bank partner, confirmed cross-partner
  isolation (this partner only ever found its own voucher) and that a
  donation-sourced voucher fulfills immediately with no approval gate.
  Also granted 5 AZN via "Cib Pulu Göndər" and confirmed the balance hero
  showed the exact `sum(in) - sum(out)` result (2.00 AZN) live. `dotnet
  test`: 44/44 passing. Test family and all its rows deleted from Neon
  afterward; the six seeded partners and the backfilled `PartnerId` on the
  six real catalog rows were only ever read from.
- **Deliberately not built**: a real admin-managed CRUD for partner
  accounts (six seeded accounts were explicitly chosen over this); the QR
  encoding a real URL (no stable deployed origin yet — worth revisiting
  once this app has one, see "Deployment history" below).
- **Zero automated test coverage** on any of this
  (`LoginPartnerCommandHandler`, `GetVoucherQueryHandler`,
  `FulfillVoucherCommandHandler`, `EfPartnerAccountRepository`,
  `EfVoucherRepository`) — same gap, same reason, as everything else
  flagged this way in this file. Test count is still 44.

## Reward proposals — a partner can propose a new XP-redeemable reward

Requested explicitly, right after "Vouchers and partners" above: "partner
can create something that can be redeemed using xp and admin should accept
it. Also admin can edit the request. In that case it should go to the
sponsor's panel. If they approve then it can be public ... there should be
a history." Scoped with two up-front questions: a plain admin accept (no
edit) publishes immediately, no redundant partner reconfirmation; a
partner rejecting an admin's edit loops back to the admin to revise again,
rather than closing the proposal outright.

- **Backend**: see "Reward proposals" in `backend/README.md` for the full
  endpoint contracts and state-machine design. Short version: a new
  `RewardProposal`/`RewardProposalEvent` pair (the latter is the explicitly
  requested history — every response includes the full event list, oldest
  first). Lifecycle: submitted → admin accepts (publishes immediately) or
  edits (→ waits in the partner's own panel) or declines (terminal); an
  edited proposal's partner can approve (publishes) or reject (loops back
  to the admin, not terminal). `IRewardRepository` gained `AddRewardAsync`
  — the reward catalog's first write path outside its original startup
  seed. A reward published this way is itself immediately eligible for a
  QR voucher on its first redemption (see "Vouchers and partners" above),
  since `RewardProposalPublishing.BuildReward` sets the new `Reward`'s
  `PartnerId` directly — no separate backfill step needed, unlike the four
  original seeded rewards.
- **The natural "decline outright" action, not explicitly named in the
  request but built alongside Accept/Edit**: without it, an unwanted
  proposal would sit in the review queue forever — the only sane way to
  close one out that nobody wants to pursue.
- **`src/pages/PartnerDashboardPage.tsx`** gained a "Mükafat Təklifləri"
  section — a submission form plus the partner's own proposal list, with
  Approve/Reject buttons appearing only while a proposal is waiting on
  them, and an expandable history per proposal. New
  **`src/pages/AdminRewardProposalsPage.tsx`** (`/idareetme-tekliflər`,
  linked from `AdminSidebar.tsx`) is the admin's review queue —
  Accept/Edit/Decline, Edit opens a modal pre-filled with the current
  terms, Decline goes through a real confirm `Modal` with an optional
  reason textarea, never the browser's native `confirm()`.
- **Verified live through the real running frontend** (the second round
  able to do this, after "Vouchers and partners" — see "The Node 18 vs.
  rolldown blocker is resolved" above): submitted a real proposal from
  `/tərəfdaş`, watched it appear in the real admin queue, edited it from
  the real admin UI (confirmed the diff note rendered correctly), approved
  it from the real partner UI and watched the status flip to "Təsdiqləndi
  · Yayımlandı" with the full real 4-event history displayed, and
  separately declined a second real proposal through the real confirm
  modal with a typed reason, confirming it landed in a terminal,
  action-less state. Also curl-verified the full reject-then-accept loop
  (partner rejects an edit → admin accepts the original terms → a real
  `Reward` row is created) and every guard (validation, terminal-state
  409s, cross-partner 403s, auth 401s). `dotnet test`: 44/44 passing. All
  test proposals and the one published test reward deleted from Neon
  afterward; the four original seeded rewards were never touched.
- **Zero automated test coverage** on any of this (every new command/query
  handler and `EfRewardProposalRepository`) — same gap, same reason, as
  everything else flagged this way in this file. Test count is still 44.

## Open items / natural next steps

1. ~~Fill in the real "Tədbirlər" video list (14 of 15 are missing
   titles/IDs)~~ — effectively done. The real YouTube Data API sync (item 3)
   found all 14 and correctly suggests them into "Tədbirlər" in the admin
   review queue; one was confirmed during that feature's own verification,
   the other 13 are a real admin task waiting in `/idareetme`, not a data
   gap needing a fix. See "YouTube content sync" above.
2. ~~Point `fetchPlaylists` at the real backend~~ — done; it's a real `fetch`
   gated behind `VITE_API_BASE_URL`.
3. ~~Replace the seed-file sync with a real YouTube Data API v3 one~~ —
   done. `POST /api/content/sync` calls the real API and returns new videos
   for review; `POST /api/content/videos` is the write an admin confirms.
   See "YouTube content sync" above and "Content" in `backend/README.md`.
4. ~~No login/session layer~~ — done. JWT bearer auth: `POST
   /api/identity/login` + signup auto-issues a token too, and
   `POST /api/identity/families/{id}/children` requires it and checks the
   token's familyId matches the URL (see "Backend" above and
   `backend/README.md` — "Identity (account creation + login)" for the full
   design: single symmetric signing key, 7-day expiry, no refresh flow).
   `SignupPage`'s `setPin(pin)` bridge is still just a stopgap for the local
   PIN gate, unrelated to this — login verifies the *password*, nothing
   verifies the PIN.
5. ~~Wire signup/add-child to the frontend~~ — done;
   `src/lib/identityService.ts` + `SignupPage.tsx`/`AddChildPage.tsx`, see
   "Backend" above.
6. ~~A frontend login page.~~ — done. `LoginPage.tsx` at `/giris`, now the
   app's default entry point; signup reachable via a button from there. See
   "Family login" above for the full design, including the PIN-restoration
   limitation and the new `GET /api/identity/families/{id}/children`
   endpoint this needed.
7. ~~`POST /api/content/sync` is still unauthenticated — needs a separate
   admin-auth concept~~ — done. `POST /api/admin/login` +
   `LoginAdminCommand`/`IAdminAccountRepository`, issuing a JWT with an
   `adminId` claim instead of `familyId` (not `SignUpAdminCommand` — there's
   no admin signup, a seeded demo account instead, see "Admin panel" above).
   `POST /api/content/sync`, both Habits writes, and `GET /api/admin/families`
   are all now gated behind it; `useAdminStore` carries the real token.
8. ~~If real YouTube playback progress tracking is wanted (vs. the manual
   "mark as watched" button)~~ — done. `YoutubePlayer.tsx` already loaded
   the IFrame Player API for its own controls; it now also reports real
   position via `onProgress`/`onCompleted` props, and `AnimationsPage.tsx`
   uses them to drive `watchedPct`/XP instead of a button click. See "Real
   YouTube playback progress tracking" above.
9. ~~No automated tests~~ — partially done. `backend/tests/SimartBackend.Tests`
   has 44 xUnit tests across three layers: 31 unit tests (Identity slice's
   three command handlers + `PasswordHasherAdapter`/`JwtAuthTokenService`
   directly; Content slice's `GetPlaylistsQueryHandler`/`DurationFormat` —
   the old seed-sync handler test was deleted along with the command it
   tested when the real YouTube API sync replaced it, see "YouTube content
   sync" above) using
   hand-rolled in-memory fakes instead of a mocking library, plus 13 real-HTTP
   integration tests via `WebApplicationFactory<Program>` + EF Core's
   InMemory provider (no Postgres/Docker needed) covering the
   signup/login/add-child endpoints end to end — including the add-child
   family-ownership check (401/403/404 cases), which lives directly in
   `Program.cs`'s endpoint lambda and had zero coverage from the unit tests
   alone (see "Tests" in `backend/README.md` for the full design, including
   the "two EF providers registered" gotcha hit and fixed while building
   this). Still untested: the `Ef*`/`Db*` Infrastructure implementations
   against a *real* database (needs Testcontainers or similar), and the
   entire frontend — no test runner/framework set up there at all yet.
   **The Habits catalog slice, `GET /api/admin/families`,
   `GET /api/identity/families/{id}/children`, the admin-auth slice
   (`LoginAdminCommand`/`IAdminAccountRepository` and the admin-gating
   checks in `Program.cs`), the family-habits slice
   (`CreateFamilyHabitTaskCommand`, the three completion handlers,
   `HabitChildOwnership`), and the YouTube content-sync slice
   (`GetNewContentQueryHandler`/`AssignVideoCommandHandler`/
   `YouTubeApiContentSource`/`EfContentCatalogRepository` — all built after
   this, see "Admin panel", "Family login", "Family habits", and "YouTube
   content sync" above) have zero automated coverage** — verified by hand
   only (curl + the live UI, the content-sync slice against the real
   channel), at explicit user direction to deprioritize more test-writing
   for now. Test count is still 44, not higher, as a result.
10. ~~Habit completions have no handlers; parents can't create their own
    habits~~ — done. See "Family habits" above: `CompleteHabitTask`/
    `UncompleteHabitTask`/`GetHabitCompletions`, plus
    `CreateFamilyHabitTaskCommand` capped at 5 tasks/family and 10 XP/task.
    `HabitsPage.tsx` reads the real catalog + completions now, and
    `SettingsPage.tsx` is where a parent creates a custom habit.
11. ~~Focus Mode (screen-time locks/tracking) is still entirely
    frontend-only mock data~~ — done, in full now. The *lock* half:
    `FocusSession` has real handlers, a real trigger (2 videos/day), and
    real enforcement (`RequireNotFocusLocked`) — see "Focus Mode" above.
    The *tracking* half: `ScreenTimeEntry` (a genuinely separate new table,
    not an extension of `FocusSession`) backs `HabitsPage.tsx`'s "Bugünkü
    ekran vaxtı" stat with real cumulative seconds — see "Screen time
    tracking and real watch-progress sync" above.
12. ~~`watch_progress` has no handlers; `watchedPct` is local-only~~ —
    done. See "Screen time tracking and real watch-progress sync" above —
    `AnimationsPage.tsx`'s real playback percentage now round-trips through
    `GET`/`POST /api/content/children/{childId}/watch-progress`, merged
    server-side via `Math.Max` on top of the frontend's own already-
    monotonic logic.
13. ~~`Game`/`GameResult` have no handlers; the six mini-games' results and
    XP are local-only~~ — done. See "Mini-games" above —
    `GamesPage.tsx`'s `handleFinish` now calls
    `POST /api/games/children/{childId}/plays` for a backend-synced child,
    crediting the server-computed `xpAwarded` rather than a local guess.
14. ~~`WalletTransaction`/`DonationCampaign` have no handlers; the wallet's
    balance/history/donate flow are local-only~~ — done. See "Wallet"
    above — `WalletPage.tsx`'s balance and transaction history now come
    from the real backend for a backend-synced child, donating spends real
    XP and logs a real AZN ledger entry, and a new "Cib Pulu Göndər" card
    in Settings lets a parent manually credit real pocket money. **Every
    domain in the original 22-table schema now has at least one real
    handler** — see "Next steps" in `backend/README.md` for what's still
    thin (test coverage, a few flagged loose ends) rather than entirely
    unbuilt.
15. ~~The Node 18 vs. `rolldown` environment issue~~ — resolved; the user
    upgraded to Node v24 via `nvm`. See "The Node 18 vs. rolldown blocker
    is resolved" above.
16. A QR voucher on redeem/donate, and a partner panel to scan and fulfill
    it — done. See "Vouchers and partners" above: a new `Partner`/
    `Voucher` domain, six seeded demo partner accounts,
    `PartnerDashboardPage.tsx`'s camera scan + manual entry, and the first
    round verified through the real running frontend since the Node fix.
17. A partner can propose a new XP-redeemable reward, admin accepts/edits
    it (an edit goes back to the partner's panel for them to approve or
    reject), approving publishes it, with a full history — done. See
    "Reward proposals" above: `RewardProposal`/`RewardProposalEvent`, the
    accept/edit/approve/reject state machine, `IRewardRepository
    .AddRewardAsync` as the catalog's first non-seed write path, and the
    second round verified through the real running frontend.
