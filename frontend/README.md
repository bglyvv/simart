# SİMART — Ailə Hesabı

React implementation of all 11 SİMART screens, built from the finalized Figma design.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (CSS-first theme in `src/index.css`, ported 1:1 from the Figma design tokens)
- React Router (`BrowserRouter`, clean URLs) for client-side navigation between screens

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL. The app opens on a gallery/index page (`/`) that links to all 11 screens; each screen also has its own route (see `src/App.tsx`).

To build for production:

```bash
npm run build
npm run preview
```

## Backend dependency

The real backend (`../backend`) is required for two things, both configured
via `VITE_API_BASE_URL` in `.env.development` (defaults to
`http://localhost:5025`). Run `dotnet run --project
../backend/src/SimartBackend.Api` alongside `npm run dev`, or:

- **Content**: the Animasiya page (`/animasiya`) and the parent dashboard's
  content card fetch playlists via `GET /api/content/playlists` — without
  the backend running, those two spots show a "yüklənmədi" (failed to load)
  message instead of hanging.
- **Account creation + login**: `LoginPage`/`SignupPage`/`AddChildPage`
  write/read real rows via `POST /api/identity/login`,
  `POST /api/identity/signup`, `POST /api/identity/families/{id}/children`,
  and `GET /api/identity/families/{id}/children`
  (`src/lib/identityService.ts`) — without the backend running, both signup
  and login fail outright (show an error, don't navigate to the next step).
  There's no local-only fallback for this one; account creation and login
  aren't optional. **`/giris` (`LoginPage`) is the app's default entry
  point** — `RootRedirect` sends any visitor with no local parent profile
  there first; signup (`/qeydiyyat`) is reached via a button from the login
  page, not the reverse. Both signup and login return a JWT
  (`ParentProfile.token`) that `AddChildPage` sends as `Authorization:
  Bearer`; login also calls `fetchFamilyChildren` right after, to restore
  whichever child profile(s) belong to that family on a device that doesn't
  already have one cached — see "Family login" in root `CLAUDE.md` for the
  full design, including the one thing login does *not* restore (the local
  PIN).

- **Habits**: `HabitsPage.tsx` (child-facing, `/vərdişlər`) now reads the
  real catalog and real per-child completions
  (`fetchHabitCategories`/`fetchHabitCompletions`/`completeHabitTask`/
  `uncompleteHabitTask` in `habitsService.ts`) whenever the signed-in family
  has a real backend child (`parent.familyId` and `child.childId` both
  set — see `useAppStore.ts`'s `ChildProfile.childId`, persist `version: 6`).
  A child added via the standalone "davam edə bilərsən" path has no
  `childId` and keeps the old `src/data/habits.json` + local Zustand
  (`habitDone`/`toggleHabit`) behavior unchanged. `SettingsPage.tsx`
  (parent-PIN-gated, `/tənzimləmələr`) has a "Fərdi Vərdişlər" card where a
  parent creates custom tasks for their family (`createFamilyHabitTask`),
  capped client-side (and really, server-side) at `MAX_FAMILY_TASKS` (5)
  and `MAX_TASK_XP` (10) — see "Family habits" in root `CLAUDE.md` for the
  full design.

Everything else in the family-facing app (wallet, leagues, games, social,
focus mode) is still local-only (Zustand + localStorage).

- **Landing page books**: `/` (`LandingPage.tsx`) reads its book arch from
  `GET /api/books` (`src/lib/bookService.ts`), managed at `/admin/books`
  (`AdminBooksPage.tsx`). If the backend is down or slower than 5 s, it falls
  back to the bundled `src/data/landingBooks.json` books, so `/` is never
  empty. See "Landing-page books" in root `CLAUDE.md`.

- **Admin panel** (`/admin/login`, `/admin`,
  `/admin/habits`, `/admin/accounts`, `/admin/proposals`,
  `/admin/books` — not linked from anywhere
  in the family-facing UI, own sidebar via `AdminShell`/`AdminSidebar`):
  every page's data is real, verified live — `fetchPlaylists()`/
  `discoverNewContent(token)`/`assignVideo(input, token)` (content — a real
  YouTube Data API v3 discover-and-review flow now, not a seed-file sync;
  see "YouTube content sync" in root `CLAUDE.md`), `src/lib/habitsService.ts`
  (`fetchHabitCategories`/`createHabitCategory(input, token)`/
  `addHabitTask(input, token)` — the shared admin catalog; this same file
  also backs the family-facing habits work described above), and
  `src/lib/adminService.ts`
  (`fetchFamilies(token)` — a read-only account directory). **Login is now
  real backend auth** — `loginAdmin()` in `adminService.ts` calls
  `POST /api/admin/login`, and `useAdminStore.admin.token` is the real
  bearer token every write above now sends as `Authorization: Bearer`.
  There's still no admin signup (by design — see root `CLAUDE.md`'s "Admin
  panel"); `admin@simart.az` is a real seeded account (backend `Program.cs`,
  re-seeded on every startup so it survives a database reset), not a
  client-side-only check anymore, and its password isn't a casual demo value
  — `AdminLoginPage.tsx` no longer prints it on the page. See "Admin panel"
  in root `CLAUDE.md` for the full design before extending this.

## Project structure

- `src/pages/` — one component per screen (login, signup, add child, family gate, habits, animations, focus mode, social, leagues, games, parent dashboard, wallet, admin login, admin content dashboard, admin habits, admin accounts)
- `src/components/` — shared UI (sidebar, topbar, app shell, buttons, cards, badges, logo, radar chart, and their admin-panel counterparts `AdminSidebar`/`AdminShell`)
- `src/lib/dob.ts` — shared date-of-birth helpers (`MONTHS_AZ`, `toIsoDate`, `fromIsoDate`, `ageFromYear`, `todayIso`) used by `AddChildPage`/`LoginPage` (date-of-birth conversion) and `HabitsPage` (today's date as the habit-completion `logDate`)
- `src/data/` — **all mock data**, as JSON files, one per domain (habits, social, leagues, wallet, etc.). Pages import their data from here rather than hardcoding it inline, so content can be edited or swapped for a real API without touching component code.
- `src/assets/` — the real SİMART logo mark

## Notes

- Screens are built as fixed 1920×1080 "artboards" matching the Figma frames; the gallery page lets you preview all of them.
- All brand colors, gradients, typography, radii, and shadows are defined as Tailwind v4 theme tokens in `src/index.css`, so utility classes like `bg-purple-600`, `bg-grad-primary`, `text-h2`, and `shadow-purple` map directly to the design system.
