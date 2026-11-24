# SİMART Backend

ASP.NET Core 9, CQRS via [MediatR](https://github.com/jbogard/MediatR), Clean
Architecture-style layering. Implements five concrete slices: content — a
real YouTube Data API v3-backed discover-and-review flow (`POST
/api/content/sync` finds new videos on the real SİMART channel, an admin
assigns each one's playlist/audience via `POST /api/content/videos`), not an
automatic upsert from a seed file anymore; account creation + login
(signup/login/add-child/children), writing real rows into the
already-schema-complete `Identity` tables; habits — a shared admin catalog,
parent-created custom tasks (capped at 5/family, 10 XP/task), and per-child
completions, all three now with real handlers; an admin-only account
directory; and admin login (a seeded demo admin, no self-service signup).
Admin login is what gates every admin-only write — content review, Habits
catalog writes — behind a real token instead of leaving them open.

## Run it

```bash
dotnet run --project src/SimartBackend.Api
```

Swagger UI is at `/swagger` in Development.

## Test it

```bash
dotnet test tests/SimartBackend.Tests
```

44 tests: 31 unit tests for the Identity and Content slices' command/query
handlers (no database or network involved) plus 13 real-HTTP integration
tests (via `WebApplicationFactory` + EF Core InMemory — boots the actual
`Program.cs`, no Postgres/Docker needed either). See "Tests" below for the
design and what each layer covers.

### Content

```
GET  /api/content/playlists                  -> every playlist, read from the database
GET  /api/content/playlists?audience=parent  -> just the parent playlist
GET  /api/content/playlists?audience=child   -> just the four child playlists

POST /api/content/sync   [admin token]
  -> 200 [{ youtubeVideoId, title, duration, suggestedPlaylistId,
            suggestedPlaylistTitle, suggestedAudience }]
  -- every video on the real SİMART channel that isn't in our database yet.
     Writes nothing. suggestedPlaylistId is the real YouTube playlist id
     (null if the video isn't in any of our known playlists at all — a
     genuinely "loose" video, e.g. a YouTube Short).

POST /api/content/videos   [admin token]
  { youtubeVideoId, title, duration, youtubePlaylistId, audience }
  -> 201 { id, youtubeVideoId, title, playlistId, audience }
  -- commits one video an admin reviewed. youtubePlaylistId null is a
     deliberate "no playlist" choice, not a missing value; audience ("parent"
     | "child") is always required, independent of whatever the suggested
     playlist's own audience was.
  -> 400 if title/audience invalid
  -> 404 if youtubePlaylistId doesn't match any playlist we have

DELETE /api/content/videos/{youtubeVideoId}   [admin token]
  -> 204 on success
  -> 401/403 same admin gate as everywhere else
  -> 404 if youtubeVideoId doesn't match any (non-already-deleted) video
  -- soft delete (IsDeleted/DeletedAt/DeletedBy) — the row and anything
     already referencing it (watch_progress, etc.) stay in Postgres; the
     global query filter is what actually makes it disappear from
     GetPlaylistsQuery/DbPlaylistCatalog, i.e. the family app. Calling it
     again on an already-deleted video is a 404, not a silent no-op — same
     as the rest of this doc's "default filtered query, deliberately" rule.

POST /api/content/playlists   [admin token]
  { youtubePlaylistId?, title, audience, description?, colorFrom, colorTo }
  -> 201 { id, publicId, youtubePlaylistId, title, audience, description, colorFrom, colorTo }
  -- registers a playlist. youtubePlaylistId is now optional — omitted (or
     blank), it creates a playlist that isn't tied to any real YouTube
     playlist at all; publicId is then the internal database Guid as a
     string (see "Playlists without a YouTube id" below). Given, it's a real
     YouTube playlist id typed in by the admin (not one that came back from a
     prior GetNewContentQuery call), plus the audience/color metadata
     YouTube has no concept of either way.
  -> 400 if title/audience/colorFrom/colorTo invalid
  -> 409 if youtubePlaylistId is given and already exists — including a
     soft-deleted one, so removing a playlist and recreating the same id is
     a conscious choice, not an accident.

POST /api/content/playlists/verify-youtube   [admin token]
  { youtubePlaylistId }
  -> 200 { youtubePlaylistId, title, videoCount }
  -> 404 { error } if it isn't a real, public YouTube playlist
  -- the create-playlist modal's "Yoxla" (check) button: a dry-run against
     the real YouTube Data API v3 (`playlists.list`), writes nothing either
     way. videoCount is YouTube's own itemCount, which (unlike the actual
     import below) includes private/deleted placeholder rows YouTube still
     counts in a playlist — expect it to occasionally overcount by a couple
     videos versus what import-youtube actually pulls in.

POST /api/content/playlists/import-youtube   [admin token]
  { youtubePlaylistId, title, audience, description?, colorFrom, colorTo }
  -> 201 { playlist: { id, publicId, youtubePlaylistId, title, audience,
            description, colorFrom, colorTo }, importedVideoCount, skippedExistingCount }
  -- the create-playlist modal's actual submit once "Yoxla" confirmed the
     playlist is real: registers it, then pulls in every one of its videos
     in one go (reusing the same playlistItems.list/videos.list calls
     GetNewContentQuery already makes), all tagged with the chosen audience.
     A video already in our database (under any playlist, or none) is
     skipped, never moved — counted in skippedExistingCount; an admin who
     actually wants that can do it by hand afterward via "change playlist"
     (the move endpoint below). Not restricted to the SİMART channel —
     works for any public playlist id, deliberately, since catching a typo'd
     id from some other channel is a review-time concern, not a
     server-side one.
  -> 400 if title/audience/colorFrom/colorTo invalid
  -> 404 if the playlist disappeared from YouTube between the "Yoxla" check
     and this submit (re-verified defensively, not trusted from the client)
  -> 409 if youtubePlaylistId is already registered (including soft-deleted)

DELETE /api/content/playlists/{id}   [admin token]
  -> 204 on success
  -> 401/403 same admin gate as everywhere else
  -> 404 if id doesn't match any (non-already-deleted) playlist
  -- soft delete — **now cascades onto every one of the playlist's
     currently non-deleted videos too**, a deliberate change requested
     explicitly (this used to leave videos untouched, relying only on them
     becoming unreachable once their parent was filtered out — see git
     history/this doc's own prior revisions if you need the old behavior).
     The cascade stamps every video with the exact same DeletedAt/DeletedBy
     as the playlist, which is what lets the restore endpoint below tell a
     cascaded video apart from one deleted separately, before or after. A
     removed playlist also stops being scanned by GetNewContentQuery, since
     that only scans GetPlaylistSummariesAsync's (filtered) result too.

GET /api/content/deleted-playlists   [admin token]
  -> 200 [{ id, youtubePlaylistId, title, audience, colorFrom, colorTo,
            deletedAt, videoCount }]
  -- every soft-deleted playlist. id is the public identifier (youtubePlaylistId
     when set, otherwise the Guid as a string — same PlaylistDto.Id
     convention GET /api/content/playlists already used). videoCount only
     counts its own still-real (non-deleted) videos — how many would come
     back if restored, on top of whichever were cascade-deleted with it.

GET /api/content/deleted-videos   [admin token]
  -> 200 [{ youtubeVideoId, title, duration, audience, playlistTitle,
            playlistId, isPlaylistDeleted, deletedAt }]
  -- every soft-deleted video. playlistTitle/playlistId are read with
     IgnoreQueryFilters too, so they're still populated even when that
     playlist has since been deleted as well (playlistId is that playlist's
     own public identifier) — both null only if the video never had one.
     isPlaylistDeleted is the "Silinmiş" tab's restore-warning flag: true
     means restoring this video alone won't make it visible anywhere until
     its playlist is also restored, or the video is moved elsewhere.

GET /api/content/playlists/{id}/videos   [admin token]
  -> 200 [{ youtubeVideoId, title, duration, audience, isDeleted, deletedAt }]
  -> 404 if id doesn't match any playlist (deleted or active) at all
  -- the "Silinmiş" tab's expand action on a deleted playlist — every one of
     its videos, deleted or not, so an admin can see exactly which would
     come back if the playlist were restored and which were deleted
     separately. Works for an active playlist id too, though
     GET /api/content/playlists' own nested Videos already covers that case.

POST /api/content/videos/{youtubeVideoId}/restore   [admin token]
  -> 204 on success
  -> 401/403 same admin gate as everywhere else
  -> 404 if youtubeVideoId doesn't match any currently-soft-deleted video
  -- the reverse of the DELETE above: resets IsDeleted/DeletedAt/DeletedBy,
     so the video immediately reappears in GetPlaylistsQuery/DbPlaylistCatalog
     (and GetDeletedVideosQuery) without needing its own write path — same
     filtered-query mechanism, just the condition flipping back. Deliberately
     doesn't check or touch the video's playlist at all — restoring a video
     whose playlist is still deleted succeeds but stays invisible, exactly
     the case GET /api/content/deleted-videos' isPlaylistDeleted flags.

POST /api/content/playlists/{id}/restore   [admin token]
  -> 204 on success
  -> 401/403 same admin gate as everywhere else
  -> 404 if id doesn't match any currently-soft-deleted playlist
  -- reverse of DELETE /api/content/playlists/{id} — restores the playlist
     **and cascade-restores exactly the videos that were cascade-deleted
     alongside it** (matched by the same DeletedAt/DeletedBy pair the
     delete stamped them with, not just PlaylistId) — a video deleted
     separately, before or after, stays deleted.

POST /api/content/videos/{youtubeVideoId}/move   [admin token]
  { youtubePlaylistId: string | null }
  -> 204 on success
  -> 401/403 same admin gate as everywhere else
  -> 404 if youtubeVideoId doesn't match any video (active or soft-deleted
     — IgnoreQueryFilters, since the restore-warning use case below needs
     to move a still-deleted video), or if youtubePlaylistId doesn't match
     any playlist we have
  -- changes which playlist a video belongs to (null removes it from any
     playlist). Two UI surfaces: the "change playlist" control on every
     active video row, and the restore-warning's "move to a different,
     active playlist instead of restoring the old one" option.
```

### Playlists without a YouTube id

Requested explicitly: let an admin create a playlist that's just an internal
grouping, not tied to any real YouTube playlist — `Playlist.YoutubePlaylistId`
is now nullable (migration `MakePlaylistYoutubeIdOptional`), same nullable
shape `Video.PlaylistId` already had. Every endpoint that used to address a
playlist by its YouTube id now addresses it by a **public identifier**
instead — the real YouTube id when the playlist has one, otherwise the
internal database Guid as a string (`Domain.Content.Playlist.Id` /
`PlaylistDto.Id` / `CreatedPlaylistDto.PublicId` — the exact fallback is
computed once, in the Application layer, never inside a LINQ projection,
since `Guid.ToString()` isn't something to lean on the Npgsql provider to
translate). `IContentCatalogRepository.ResolvePlaylistPublicIdAsync` is the
one place this fallback resolution actually happens — tries a real
`YoutubePlaylistId` match first, falls back to parsing the public id as a
`Guid` and matching `Playlist.Id` — and every playlist-targeting method
(`SoftDeletePlaylistAsync`, `RestorePlaylistAsync`, `GetPlaylistVideosAsync`,
`MoveVideoAsync`'s target, `AssignVideoCommandHandler`'s playlist resolution)
goes through it now, replacing the old YouTube-id-only
`ResolvePlaylistIdAsync` (removed, not just deprecated — nothing else called
it). `GetPlaylistSummariesAsync` (what `GetNewContentQuery`'s channel scan
uses) filters out playlists with no YouTube id, since there's nothing to
call `playlistItems.list` with for one.

`GET /api/content/playlists`' response shape matches `Playlist`/
`PlaylistVideo` in `contentService.ts` field for field (camelCase via the
default ASP.NET Core JSON options) — unchanged by any of this.

**The admin dashboard's playlist rows are now expandable, with create/delete
for both playlists and videos, all confirmed through a real popup instead of
the browser's native `confirm()`** — `AdminDashboardPage.tsx`'s
`PlaylistRow` toggles open on click (one at a time, same pattern
`AnimationsPage.tsx`'s sidebar already used) and renders each video via
`VideoRow`: a thumbnail (`youtubeThumbnailUrl`, already existed, used by the
family-facing player's poster too), title, duration, and a trash-icon
button. A "Yeni Playlist" button opens `CreatePlaylistModal` (built on the
existing `components/ui/Modal.tsx` — the same one `GamesPage.tsx`/
`LeaguesPage.tsx` already used, not a new component) with a form for
`POST /api/content/playlists`'s fields, including two native
`<input type="color">` pickers for colorFrom/colorTo. Every delete action
(video or playlist) sets a `deleteTarget` state at the page level instead of
calling `window.confirm()` inline — a shared `Modal` renders the specific
warning copy (a playlist's warning names how many videos it's about to take
down with it) with "Ləğv et"/"Sil" buttons; confirming calls the matching
`deleteVideo`/`deletePlaylist` and splices local state on success, exactly
like the video-only version before it did.

Verified end-to-end, no real content touched: created a disposable test
video and a disposable test playlist via curl first (confirming 401/201/409/
204/404 exactly as documented above), then through the actual UI — opened
the create-playlist modal, filled it in, confirmed the new playlist
appeared in the list with the right video count (0); opened the delete
popup on that same playlist (not a real one), confirmed the popup's warning
text and button copy render correctly (no native dialog involved — checked
directly via the DOM, not just visually), confirmed clicking "Sil" removed
it from the UI immediately and `is_deleted = true` in Postgres; separately
clicked a real video's delete button, then clicked "Ləğv et", and confirmed
nothing was deleted (still 2 videos, both in the UI and unprompted by any
network call). The two real "3D animasiyalar" videos used for this
cancel-path check, and the five real playlists throughout, were never
actually touched.

**This replaced the old embedded-JSON-seed sync entirely** — there's no
`SeededPlaylistCatalog`, `PlaylistAudienceMap`, `playlists-sync-seed.json`,
or `IPlaylistSyncTarget` anymore; `POST /api/content/sync` now calls
`IYouTubeContentSource` (`YouTubeApiContentSource`, real `HttpClient` calls
against `googleapis.com/youtube/v3`), not a static snapshot. Three real
calls: one `channels.list?forHandle=@Simartaz` to resolve the channel's
"uploads" playlist (YouTube puts every public video there automatically,
regardless of which other playlists it's also in — this is how a video with
*no* playlist is discovered at all, not just new videos in playlists we
already know about), one `playlistItems.list` per already-known playlist
(to tag which videos are already in one, for the review UI's "suggested
playlist" default) plus one more for the uploads playlist itself, and one
`videos.list` to get real durations (`playlistItems.list` doesn't return
duration — only `videos.list`'s `contentDetails.duration`, an ISO 8601
string like `"PT4M13S"`, parsed via `XmlConvert.ToTimeSpan`). "Known
playlists" means whatever's already in the `playlists` table — not a
hardcoded list — so this also doesn't (yet) discover a brand-new playlist
the channel didn't have before; only new *videos*.

**Needs a real YouTube Data API v3 key** — `YouTube:ApiKey` via `dotnet
user-secrets` (same pattern as `Jwt:SigningKey`/`ConnectionStrings:SimartDb`,
never committed) or the `YOUTUBE__APIKEY` env var elsewhere. Get one from
Google Cloud Console: enable "YouTube Data API v3", create an API key,
restrict it to that one API (Application restrictions can stay "None" for a
server-side key like this one — it's never sent to a browser). The default
daily quota comfortably covers this project's call volume.

**Every content-management endpoint except `GET /api/content/playlists`
itself is admin-gated** (sync, assign video, delete/restore/move video,
create/delete/restore playlist, verify/import from YouTube, the deleted-*
reads, and the playlist-videos expand read — same `AdminIdClaimType` check
as everywhere else, see "Admin auth" below) — a family parent's token gets
403 on all of them. The read endpoints are gated too even though they're
GETs: this is exactly the kind of thing a family app should never see.

**`Video.PlaylistId` is now nullable, and `Video` gained its own
`Audience` column** (migration `MakeVideoPlaylistOptionalAddAudience`) — a
video doesn't have to belong to a playlist at all, and its audience is set
directly by whoever assigns it (`AssignVideoCommand`), not inherited from
`Playlist.Audience`. A playlist's own `Audience` is still what the family
app actually groups/filters by (`DbPlaylistCatalog` reads videos through
`Playlist.Videos`, so a playlist-less video simply doesn't show up anywhere
in the family app yet — admin review and the family-facing read path are
deliberately not the same step here). Existing rows were backfilled
(`UPDATE videos SET audience = <their playlist's audience>`) right after
the migration so nothing shipped with an empty string.

Verified end-to-end against the real channel (not a fixture): the first
live sync found 112 videos not yet in the database — 14 of them correctly
suggested into the existing "Tədbirlər" playlist (this is, incidentally,
exactly the missing-14-of-15 gap root `CLAUDE.md` had flagged under "Open
items" — solved as a side effect of real discovery, not a separate fix),
98 with no suggested playlist at all (YouTube Shorts-style clips, genuinely
not in any playlist). Confirmed through the actual admin UI: the "Tədbirlər"
suggestion pre-selects correctly in the review form's playlist `<select>`,
confirming a video with no playlist selected ("Heç biri") lands with
`playlist_id IS NULL` in Postgres, and a parent's bearer token gets 403 on
both endpoints via curl. Also caught and fixed during this verification: the
review UI's playlist `<select>` was first built against
`GET /api/content/playlists`' YouTube-id-keyed options while the backend
expected our internal database Guid — they never matched, silently breaking
every "suggested playlist" pre-selection and any manual pick of a real
playlist. Fixed by keying the whole discover → assign round-trip by the
real YouTube playlist id throughout (`AssignVideoCommand.YoutubePlaylistId`,
resolved to the database Guid only inside the handler — now via
`IContentCatalogRepository.ResolvePlaylistPublicIdAsync`, see "Playlists
without a YouTube id" above) — the database Guid never needs to leave the
backend for this flow at all.

**The admin dashboard has a "Silinmiş" (deleted) tab, with a one-click
restore on every row** — `GET /api/content/deleted-playlists`/
`GET /api/content/deleted-videos` populate the list; each row's "Bərpa et"
button calls `POST /api/content/videos/{id}/restore` or
`POST /api/content/playlists/{id}/restore` directly, no confirmation modal
(unlike delete, restore is the undo of a destructive action, not itself
one) — `DeletedPlaylistRow`/`DeletedVideoRow` in `AdminDashboardPage.tsx`
each hold their own `restoring` flag and splice themselves out of local
state on success, then trigger a `loadPlaylists()` so the active tab's
counts stay correct without a full page reload. Verified live: created a
disposable test playlist + video, soft-deleted both, confirmed they
appeared correctly in "Silinmiş" alongside real content, clicked "Bərpa et"
on each, confirmed the toast, immediate removal from the deleted list, and
reappearance (with correct video count) back on the "Playlistlər" tab — all
through the actual rendered UI, not just curl. Also confirmed via curl:
401 with no token, 204 on success, and a second restore attempt on an
already-restored id correctly 404s instead of silently no-op'ing, same
"default filtered query" rule as every other endpoint in this doc.

**A round of moderation-tooling requests landed together, all on the
"Silinmiş" tab and the content-creation flow**: expand a deleted playlist to
see its videos (deleted or not); deleting a playlist now cascades onto its
videos instead of leaving them untouched; restoring a video whose playlist
is also deleted now warns, with a one-click "restore the playlist too" and
a "move to a different playlist instead" escape hatch; the same
"change playlist" control exists on every active video row too, not just
at initial assignment; and a playlist can now be created either manually
(no YouTube id) or by importing a real YouTube playlist wholesale (a
"Yoxla" check button, then the submit pulls in every video). See "Playlists
without a YouTube id" above for the id-addressing change this needed, and
the endpoint list above for `GET /api/content/playlists/{id}/videos`,
`POST /api/content/videos/{id}/move`, `POST /api/content/playlists/verify-youtube`,
and `POST /api/content/playlists/import-youtube`.

A real bug was caught and fixed during this round's own verification, not
by inspection: the cascade delete above exposed that
`GetDeletedPlaylistsAsync`'s `videoCount` subquery
(`db.Videos.Count(v => v.PlaylistId == p.Id)`) wasn't actually filtering out
deleted videos — it kept reporting a cascade-deleted playlist's video count
as if none of its videos were deleted at all. Root cause: the outer query
had already called `IgnoreQueryFilters()` on `Playlists`, and that turns
out to suppress the global `!IsDeleted` filter for *every* entity reference
EF Core compiles into that one query — not just the root, and not just
`Include`d navigations (already known from this doc's `PlaylistTitle`
handling), but an unrelated correlated subquery against a completely
different `DbSet` too. This went unnoticed until cascade delete made it
observable (previously, a deleted playlist's videos were essentially never
also individually deleted, so filtered and unfiltered counts coincidentally
matched in every prior test). Fixed by adding an explicit `&& !v.IsDeleted`
to the subquery instead of relying on the ambient filter — see the comment
left in `EfContentCatalogRepository.GetDeletedPlaylistsAsync` for the exact
wording, and treat `IgnoreQueryFilters()`'s blast radius as "the whole
query, root and every subquery, not just what it was called on" for any
future work in this file.

Verified end-to-end, no real content touched: curl first for every new
endpoint — `verify-youtube`/`import-youtube` against a real, already-known
SİMART playlist id (confirming the new `playlists.list` call itself works;
409/404 confirmed for an already-registered id and a bogus one
respectively, see caveat below), `move` (204 success, 404 for a bogus
video or a bogus target playlist, 401 with no token), the playlist-videos
expand read (200 with correct per-video `isDeleted`, 404 for a bogus
playlist id), and the cascade delete/restore pair exercised through three
scenarios: a plain two-video cascade delete+restore, a video deleted
*independently* before its playlist was deleted (confirmed it stays
deleted when the playlist is restored — the cascade only restores what it
cascaded), and the full restore-warning remediation path (delete a
playlist, confirm its video's `isPlaylistDeleted` flips to true, move that
video to a different real active playlist while still deleted, confirm the
flag flips back to false, then restore it and confirm it lands correctly
under the new playlist). Then through the actual UI: created a playlist
with no YouTube id via the "Xeyr" toggle, added a disposable test video to
it, moved that video to a real playlist via the new per-video `<select>`
and confirmed both playlists' counts updated correctly, deleted the
playlist and confirmed the cascade-delete confirmation copy and the
cascaded video's "Silinib" badge inside the expanded "Silinmiş" row, and
used the "Playlisti də bərpa et" shortcut to confirm both the video and its
playlist came back together. All disposable rows deleted from Neon
afterward; the five real playlists were only ever read from, confirmed
numerically unchanged (11/2/2/34/1 videos) at the end.

**One caveat, not fully exercised**: `import-youtube`'s actual *write* path
(create playlist + bulk-insert its videos) was verified by code reuse and
by proving its one genuinely new API call (`playlists.list`, via
`verify-youtube`) works against the real channel — not by running a full
import against a live, disposable external playlist, since no safe
throwaway real YouTube playlist was available to import-then-hard-delete
without either reusing a real SİMART playlist (which would 409 immediately,
already registered) or writing real-looking rows sourced from an unrelated
public playlist. The write loop itself
(`AddPlaylistAsync`/`AddVideoAsync`/`GetExistingYoutubeVideoIdsAsync`) is
exactly the already-proven code every other write path in this file already
uses, and `FetchPlaylistVideosAsync` reuses the exact same
`FetchPlaylistItemsAsync`/`FetchDurationsAsync` helpers `FetchChannelVideosAsync`
already proved correct (the "Tədbirlər" 14-video discovery, "Verified
against the real channel" above) — but a genuine first real-world import
is worth a quick manual check next time this feature gets touched.

**`GetNewContentQueryHandler`/`AssignVideoCommandHandler`/
`DeleteVideoCommandHandler`/`RestoreVideoCommandHandler`/`MoveVideoCommandHandler`/
`CreatePlaylistCommandHandler`/`DeletePlaylistCommandHandler`/
`RestorePlaylistCommandHandler`/`ImportYoutubePlaylistCommandHandler`/
`GetDeletedPlaylistsQueryHandler`/`GetDeletedVideosQueryHandler`/
`GetPlaylistVideosQueryHandler`/`VerifyYoutubePlaylistQueryHandler`/
`YouTubeApiContentSource`/`EfContentCatalogRepository` have zero automated
test coverage** — same gap, same reason, as everything else flagged this
way in this doc: verified by hand (curl + the live admin UI, against the
real channel where applicable) at explicit user direction to deprioritize
test-writing for now. Test count is still 44 — the cascade-delete
`videoCount` bug above was caught via curl despite that, which is worth
remembering next time "no tests" starts to feel like "no risk."

### Watch progress sync

Requested explicitly alongside screen-time tracking below ("watch_progress
sync — watchedPct is still local-only"). `WatchProgress` existed in the
schema from the start (per-video `WatchedPct`, keyed by `ChildId`+`VideoId`)
with no handler ever touching it — `AnimationsPage.tsx`'s watch percentage
(the "İzlənilib: NN%" / "Tamamlandı" readout, see root `CLAUDE.md`'s "Real
YouTube playback progress tracking") lived purely in local Zustand state,
never reaching the backend at all, even for a backend-synced child.

```
GET  /api/content/children/{childId}/watch-progress   [Bearer token]
  -> 200 [ { youtubeVideoId, watchedPct }, ... ]   (every video with any progress)

POST /api/content/children/{childId}/watch-progress   [Bearer token]
  { youtubeVideoId, watchedPct }
  -> 200 { youtubeVideoId, watchedPct }   (the merged, possibly-higher value)
  -> 400 if watchedPct is outside 0-100
  -> 404 if youtubeVideoId doesn't resolve to a real video (VideoNotFoundException)
  -> 401/403/404 same family-ownership-via-child rule as Habits/Focus
```

- This is the **first family-facing (child-ownership-gated) endpoint pair
  in the Content domain** — everything else there (sync, assign, delete,
  restore, move, create/delete playlist) is admin-only. `ContentChildOwnership`
  (new, `Application/Content/ContentChildOwnership.cs`) is its own copy of
  the same `IFamilyAccountRepository.GetFamilyIdForChildAsync`-based check
  every other domain's "ChildOwnership" helper already does — kept separate
  per this codebase's established per-domain-duplication convention, not
  shared cross-domain.
- `ResolveVideoIdAsync(youtubeVideoId)` resolves the frontend's only known
  identifier (the real YouTube video id) to the internal `Video.Id` at the
  boundary — the same "never expose the internal Guid" convention
  `ResolvePlaylistPublicIdAsync` already established for playlists, now
  extended to videos. `IgnoreQueryFilters()` is used here deliberately: a
  soft-deleted video (pulled from the family-facing feed) can still resolve
  for this purpose, so progress already recorded against it isn't silently
  orphaned by an unrelated admin moderation action.
- `UpsertWatchProgressAsync` merges server-side via `Math.Max(existing,
  incoming)` — defense in depth on top of the frontend's own already-
  established monotonic `persistProgress` logic (see root `CLAUDE.md`'s
  "Real YouTube playback progress tracking"), so an out-of-order or stale
  network response arriving after a higher value was already recorded can
  never regress what's stored.
- **Frontend**: `AnimationsPage.tsx` fetches this on load for a
  backend-synced child (merging into the local `watchedPct` store, itself
  monotonically — never regressing a value the local store already has)
  and calls the `POST` from the same `persistProgress` helper that already
  drives the local store, so every `onProgress`/`onCompleted` report from
  `YoutubePlayer.tsx` now reaches both places in one call. A local-only
  child (no `childId`) is untouched — `persistProgress` just skips the
  network call, same split as every other backend-wired feature here.
- Verified end-to-end via curl with a disposable test family: no existing
  progress → `GET` returns `[]`; `POST` 39% → merged value 39; `POST` 25%
  (lower) → merged value stays 39, confirming the server-side `Math.Max`
  actually holds even when the client sends a regression; `POST` 100% →
  100; `watchedPct: 150` → 400; a bogus `youtubeVideoId` → 404; a second
  disposable family's token against the first family's child → 403.
  `tsc -b` and `oxlint` clean on the changed frontend files — live-UI
  click-through wasn't possible this round, see "A real environment
  blocker" in root `CLAUDE.md`'s "Admin accounts" section (Node 18 vs.
  `rolldown`'s `^20.19.0 || >=22.12.0` floor; no admin access to switch
  Node that day). Test family and its `watch_progresses` rows deleted from
  Neon afterward.
- **Zero automated test coverage** on `UpsertWatchProgressCommandHandler`/
  `GetWatchProgressQueryHandler`/`ContentChildOwnership`'s Content-domain
  copy/`EfContentCatalogRepository`'s three new methods — same gap, same
  reason, as everything else flagged this way in this doc. Test count is
  still 44.

### Identity (account creation + login)

```
POST /api/identity/signup
  { fullName, email, password, pin }
  -> 201 { familyId, parentId, fullName, email, token }
  -> 400 if a field fails format validation (password < 6 chars, pin not
     exactly 4 digits, email missing '@', etc.)
  -> 409 if email is already registered (case-insensitive)

POST /api/identity/login
  { email, password }
  -> 200 { familyId, parentId, fullName, email, token }
  -> 400 if email/password missing
  -> 401 on wrong email or wrong password — same message either way, so this
     endpoint can't be used to enumerate registered emails

POST /api/identity/families/{familyId}/children   [requires Authorization: Bearer {token}]
  { name, avatarEmoji, gender, dateOfBirth, city }    // gender: "boy" | "girl"
  -> 201 { childId, familyId, name, avatarEmoji, gender, dateOfBirth, city }
  -> 400 on missing/invalid fields
  -> 401 if the request has no valid bearer token
  -> 403 if the token's familyId doesn't match the :familyId in the URL —
     a family can only add children to itself
  -> 404 if familyId doesn't exist

GET /api/identity/families/{familyId}/children   [requires Authorization: Bearer {token}]
  -> 200 [{ childId, familyId, name, avatarEmoji, gender, dateOfBirth, city }]
  -> 401/403 same family-ownership rule as the POST above

POST /api/identity/forgot-password
  { email }
  -> 204 always — whether or not the email matches a real account. If it
     does, a reset email goes out via Resend; if it doesn't, this is a
     silent no-op. Same anti-enumeration shape LoginFamily's shared 401
     message already uses, just for a different endpoint.
  -> 400 if email is missing/malformed

POST /api/identity/reset-password
  { token, newPassword }
  -> 204 on success — the parent's PasswordHash is updated and the token is
     marked used (single atomic save)
  -> 400 if newPassword is under 6 characters, or if token doesn't match
     any row, is already used, or has expired (same message for all three —
     a caller can't tell which case occurred)
```

The GET above exists specifically so `LoginPage.tsx` can restore which child
profile(s) belong to a returning parent on a device with nothing cached
locally — `LoginFamilyCommand` only ever returns family/parent info by
itself, nothing about children. Built alongside the frontend login page in
the same pass — see "Family login" in root `CLAUDE.md` for the full story.
`GetChildrenQuery` + `IFamilyAccountRepository.GetChildrenAsync`, same
pattern as everything else here.

Signup and add-child write real rows into `families`/`parents`/`children` —
no migration was needed, the `Identity` domain tables already existed (see
"Database" below). `Parent.PasswordHash`/`PinHash` are PBKDF2 hashes via
ASP.NET Core Identity's `PasswordHasher<T>` primitive
(`Infrastructure/Identity/PasswordHasherAdapter.cs`) — no full Identity
scaffolding (`UserManager`, stores, etc.), just the one hashing algorithm,
same approach as `IPlaylistCatalog`/`IContentCatalogRepository`: Application
defines `IPasswordHasher`/`IFamilyAccountRepository`, Infrastructure
implements them against `SimartDbContext`.

**Auth is JWT bearer tokens**, not cookies — chosen because the frontend and
backend run on different origins (`:5173`/`:5025`) even in dev, and a
cross-origin cookie session needs `SameSite=None; Secure` (HTTPS) plus CORS
credential plumbing that a bearer token sidesteps entirely. Both signup and
login issue one (`IAuthTokenService`, implemented by
`Infrastructure/Identity/JwtAuthTokenService.cs` — a single symmetric HMAC
key, since this one backend both issues and validates; no need for
asymmetric signing). Claims carry `familyId`/`parentId`/`email`; the token
is valid for 7 days with no refresh-token flow. Signing key lives at
`Jwt:SigningKey` via `dotnet user-secrets` (same pattern as the DB connection
string — never committed) or the `JWT__SIGNINGKEY` env var elsewhere.
**Signup auto-issues a token** (acts as an immediate login) specifically so
the frontend's signup → add-child flow never needs a separate login call —
`AddChildPage.tsx` already has `parent.token` the moment signup succeeds.

**All five endpoints are wired to the real frontend** —
`frontend/src/lib/identityService.ts`'s `signUpFamily`/`loginFamily`/
`addChildAccount`/`fetchFamilyChildren`, called from `LoginPage.tsx`/
`SignupPage.tsx`/`AddChildPage.tsx`. **Login is now the app's default entry
point** (`/giris`, via `RootRedirect` in `Guards.tsx`) — signup is reached
via a button from there, not the other way around. Verified end-to-end
through the actual UI (not curl): signed up a family + child, cleared
`localStorage` to simulate a brand-new device, logged back in with the same
email/password, and the exact child profile came back correctly (name,
avatar, age computed from `dateOfBirth`) via `GET
/api/identity/families/{id}/children` — proving the whole point of that
endpoint actually works, not just that it returns 200. Also verified: a
request with no token gets 401, a token for a different family gets 403,
same as the POST sibling.

### Forgot password (family accounts)

Requested explicitly; narrowed to a real email-based reset by the user's own
choice when asked how the link should actually reach a parent, since this
project had no email-sending capability at all before this — no SMTP, no
provider SDK, nothing.

**`PasswordResetToken`** (new table, migration `AddPasswordResetToken`) is a
one-time, time-limited token row — `ParentId`, `TokenHash` (never the raw
token — see below), `ExpiresAt` (1 hour, `PasswordResetTokens.Lifetime`),
`UsedAt` (null until consumed). Not `ISoftDeletable` — it's a disposable
row, not something an admin ever needs to "undelete."
`Application/Identity/PasswordResetTokens.cs` is the one place the token
shape lives: `GenerateRaw()` (32 cryptographically random bytes, URL-safe
base64) and `Hash()` (SHA-256, hex) — a high-entropy random value doesn't
need PBKDF2-style slow hashing the way a password does, a fast cryptographic
hash is enough. **The raw token only ever exists twice**: inside the reset
email, and inside the one `POST /api/identity/reset-password` request that
redeems it — the database only ever stores `Hash(rawToken)`, so a database
leak alone can't produce a usable reset link.

`ForgotPasswordCommandHandler` looks up the parent by email; if none exists,
it returns without doing anything (the anti-enumeration shape above) — if
one does, it writes the token row then calls `IPasswordResetEmailSender`.
`ResetPasswordCommandHandler` hashes the presented token, looks up the row,
checks `UsedAt is null && ExpiresAt > now`, and if both hold, calls
`IFamilyAccountRepository.ResetPasswordAsync` (updates `PasswordHash` and
sets `UsedAt` in one `SaveChangesAsync` — atomic, so a token can't end up
consumed without the password actually changing or vice versa).

**`IPasswordResetEmailSender`** (Application) is deliberately the boundary
between "what the reset flow needs" (send an email to this person with this
token) and "how that actually happens" (a real link, a real provider call)
— Application never touches `IConfiguration` or builds a URL itself, same
layering `IContentCatalogRepository`/`IPlaylistCatalog` already use.
**`ResendPasswordResetEmailSender`** (Infrastructure) is the one
implementation: a single `POST https://api.resend.com/emails` (a plain
`HttpClient` call, no SDK — Resend's API is simple enough not to need one),
builds the actual reset link here
(`{Frontend:BaseUrl}/#/sifre-sifirla?token={rawToken}`, defaulting to
`http://localhost:5173`) since this is the one place that needs to know the
frontend's real deployed URL, and composes the Azerbaijani email body.

**Needs a real Resend API key and a verified sender identity** —
`Resend:ApiKey` and `Resend:FromAddress` via `dotnet user-secrets` (same
pattern as `YouTube:ApiKey`/`Jwt:SigningKey`, never committed) or the
`RESEND__APIKEY`/`RESEND__FROMADDRESS` env vars elsewhere. Get a free key at
https://resend.com; its sandbox mode lets you send from
`onboarding@resend.dev` to your own account email with no domain
verification at all, which is enough for local dev — a real deployment
needs a verified sending domain. Both are checked lazily, inside
`ResendPasswordResetEmailSender` itself (same pattern as
`YouTubeApiContentSource.RequireApiKey()`), not at startup — forgot-password
is occasional-use, not something that should block the whole app from
booting if unconfigured.

Verified end-to-end via curl, all the way up to the external-provider
boundary: a non-existent email correctly 204s with no email attempt; a
malformed email, a missing/empty reset token, and a too-short new password
all 400 with the right messages; a real registered email correctly reaches
the Resend call and fails there with the exact "Missing Resend:ApiKey"
configuration error (expected and correct without a key configured — proves
the whole path up to that external boundary is wired right, same as how
`YouTube:ApiKey`'s absence was verified in the Content slice). The actual
reset lifecycle was verified with a token inserted directly into Postgres
with a known raw value (bypassing the email step, which a real key wasn't
available for): a valid, unexpired, unused token resets the password (204),
logging in with the new password then works (200) and the old password no
longer does (401); reusing that same now-used token 400s; a token inserted
with `expires_at` in the past 400s too. **Not yet verified: actual email
delivery** — that needs a real `Resend:ApiKey`, which wasn't supplied during
this build; the code path up to Resend's API is fully exercised and
correct, but nobody has actually received one of these emails yet.

`POST /api/content/sync` is a content-admin operation, unrelated to
parent/family auth — it now requires a separate admin token (see "Admin
auth" below), not this parent JWT. A parent's token deliberately isn't
accepted for it (confirmed: 403).

### Habits (catalog, family-created tasks, and completions)

```
GET  /api/habits/categories
  -> 200 [{ id, key, title, icon, tasks: [{ id, categoryId, title, note, xpValue, isCustom }] }]
  -- admin-catalog tasks only (isCustom: false)

GET  /api/habits/categories?familyId={familyId}   [requires Authorization: Bearer {token}]
  -> 200 as above, plus that family's own tasks (isCustom: true)
  -> 403 if the token's familyId doesn't match the query param

GET  /api/habits/categories?familyId={familyId}&childId={childId}   [Bearer token]
  -> 200 as above, but a family's own tasks are filtered to only those
     assigned to childId (see HabitTaskAssignment below) — admin-catalog
     tasks are never filtered, childId has no effect on them
  -> 403 as above

POST /api/habits/categories   [admin token]
  { key, title, icon }
  -> 201 { id, key, title, icon, tasks: [] }
  -> 400 on any missing field

POST /api/habits/categories/{categoryId}/tasks   [admin token]
  { title, note?, xpValue }
  -> 201 { id, categoryId, title, note, xpValue, isCustom: false }
  -> 400 if title missing or xpValue <= 0
  -> 404 if categoryId doesn't exist

POST /api/habits/families/{familyId}/tasks   [requires Authorization: Bearer {token}]
  { categoryId, title, note?, xpValue, childIds }
  -> 201 { id, categoryId, title, note, xpValue, isCustom: true }
  -> 400 if title/xpValue invalid, xpValue > 10 (FamilyHabitLimits.MaxXpValue),
     or childIds is empty (at least one child must be selected)
  -> 403 if the token's familyId doesn't match the route, or any childId
     belongs to a different family
  -> 404 if categoryId doesn't exist, or any childId doesn't exist
  -> 409 if the family already has 5 custom tasks (FamilyHabitLimits.MaxTasksPerFamily)

POST /api/habits/children/{childId}/completions   [requires Authorization: Bearer {token}]
  { taskId, logDate }
  -> 200 { id, childId, taskId, logDate, xpAwarded, baseXp, bonusXp, streakDays }
     (idempotent — already-completed just reports back the amount it was
     already granted, no duplicate HabitCompletion/XpTransaction and no
     recomputed — possibly different — streak bonus)
  -> 401/403 same family-ownership rule, resolved via the child (see below)
  -> 404 if childId or taskId doesn't exist
  -- xpAwarded = baseXp (the task's own XpValue) + bonusXp (a dynamic
     consecutive-day streak bonus, see "Dynamic XP" below). Also writes an
     XpTransaction row — the first thing to ever write to that table.

DELETE /api/habits/children/{childId}/completions/{taskId}?logDate={date}   [Bearer token]
  -> 204 (idempotent — un-completing something not completed is a silent no-op)
  -> 401/403/404 as above
  -- also removes the matching XpTransaction, not just the HabitCompletion —
     a full reversal of the grant, not just the completion flag.

GET  /api/habits/children/{childId}/completions?logDate={date}   [Bearer token]
  -> 200 [{ id, childId, taskId, logDate, xpAwarded }]
  -> 401/403/404 as above
  -- xpAwarded here is read back from XpTransaction (batched, one query for
     the whole day's list) — needed so the frontend knows the real amount to
     subtract if a task that was already done before the page loaded gets
     un-completed, which can differ from the task's current static xpValue
     once a streak bonus applied.

GET  /api/habits/children/{childId}/streak?today={date}   [Bearer token]
  -> 200 { consecutiveDays, week: [{ date, state }] }   // state: "done" | "today" | "upcoming" | "missed"
  -> 401/403 same family-ownership rule as every other completions endpoint
  -- backs HabitsPage.tsx's "Həftəlik Seriya" widget, previously entirely
     static mock data even for a family synced to a real backend account.
     week is always 7 entries, Monday through Sunday, for whichever week
     contains `today`. `today` is a required query param rather than
     computed server-side from DateTime.UtcNow — same reasoning as logDate
     everywhere else here: only the caller knows the child's local "today".
     See "Weekly streak" below for consecutiveDays' exact semantics.
```

`HabitCategory`/`HabitTask` are the shared catalog — "what exists to be
assigned" — now split two ways by `HabitTask.FamilyId` (new nullable column,
migration `AddFamilyIdToHabitTask`): `null` is the admin catalog (visible to
every family), set is a parent's own custom task (visible only to, and
completable only by, that family — "there should be places to add habits,"
capped by `FamilyHabitLimits`: 5 tasks/family, 10 XP/task, enforced in
`CreateFamilyHabitTaskCommandHandler` and re-checked client-side in
`SettingsPage.tsx`'s "Fərdi Vərdişlər" card purely so the form can disable
itself before round-tripping a 409). `HabitCompletion` (one row per
child/task/day) finally has handlers — `CompleteHabitTask`/
`UncompleteHabitTask`/`GetHabitCompletions` — all three keyed by `childId`
rather than `familyId` (the resource is "a child's completions"), so the
ownership check happens *inside* each handler via the new
`HabitChildOwnership.EnsureCallerOwnsChildAsync` helper
(`IFamilyAccountRepository.GetFamilyIdForChildAsync` resolves which family a
child belongs to, then compares it to the caller's token) instead of the
direct claim-vs-route-param check every other endpoint uses — there's no
familyId already in these URLs to compare against directly.
`IHabitCatalogRepository` gained `TaskExistsAsync`/`FindTaskAsync`/
`CountFamilyTasksAsync`/`FindCompletionAsync`/`AddCompletionAsync`/
`RemoveCompletionAsync`/`GetCompletionsForChildOnDateAsync`, plus (for the
dynamic XP work below) `GetConsecutiveStreakDaysAsync`/
`AddXpTransactionAsync`/`FindXpTransactionBySourceAsync`/
`RemoveXpTransactionAsync`/`GetXpAmountsForSourceIdsAsync`, plus (for the
weekly-streak widget further below) `GetCompletionDatesAsync`. The admin-catalog read endpoint stays
fully open (no token); the family-scoped read, both family/admin writes, and
all three completion endpoints require a bearer token — see "Admin auth"
below for the admin ones, and the family-ownership pattern described
throughout "Identity" for the rest.

**Per-child task assignment** (migration `AddHabitTaskAssignments`): a new
join table, `HabitTaskAssignment (TaskId, ChildId)` composite PK, lets a
parent restrict a custom task to a subset of their children instead of it
silently going to every child in the family. Only ever written for
family-created tasks — `CreateFamilyHabitTaskCommand` now takes a required
`ChildIds` (validated via the existing per-child
`HabitChildOwnership.EnsureCallerOwnsChildAsync`, looped once per id; empty
→ `NoChildrenSelectedException`, 400) and writes one assignment row per
selected child alongside the task in `AddFamilyTaskWithAssignmentsAsync`.
Admin-catalog tasks (`FamilyId` null) never get assignment rows and stay
universally visible — this table has no meaning for them.
`GetHabitCategoriesQuery` gained an optional `ChildId`: when present,
`HabitCategoryDto.FromDomainForChild` keeps an admin task unconditionally
and keeps a family task only if it has *no* assignment rows at all (treated
as "visible to everyone," the safe default for anything created before this
table existed) or has one for the given child. The migration backfills
accordingly — every pre-existing family task gets one assignment row per
child currently in its family, so nothing already-assigned silently
disappears from a child who could already see it. Diagnosed and fixed one
real backfill-adjacent issue while verifying this migration against the
actual Neon data, not a bug in the backfill SQL itself: 4 leftover custom
`habit_tasks` rows from an earlier verification round (the
"Otaqı yığışdırmaq"/"Kitab oxumaq" tasks mentioned just below) had survived
in the table even though the family and children that owned them had since
been fully deleted — the backfill correctly produced zero assignment rows
for them (zero live children to assign to), which is what surfaced them.
Confirmed zero references anywhere (`habit_completions`, `xp_transactions`)
before deleting those 4 orphaned rows directly; the family's own full
deletion was already complete, this was only ever a stray `habit_tasks`
leftover.

Verified end-to-end via curl with two disposable test families (one
creating a task assigned to 2 of its 3 children, confirmed visible to
exactly those 2 via `GetHabitCategories?childId=` and invisible to the
3rd, and still visible to all when `childId` is omitted; the second family's
token correctly 403s both reading the first family's child-scoped
categories and creating a task against the first family's child) — `dotnet
build`/`dotnet test`: 44/44 passing throughout. Both test families deleted
from Neon afterward.

**Zero automated test coverage** on `AddFamilyTaskWithAssignmentsAsync`,
`GetAssignmentsForTasksAsync`, or `HabitCategoryDto.FromDomainForChild` —
same gap, same reason, as everything else flagged this way in this file.
Test count is still 44.

Verified end-to-end through the real UI (not just curl): signed up a test
family, created a custom "Otaqı yığışdırmaq" task from `SettingsPage.tsx`,
confirmed it showed up on `HabitsPage.tsx` tagged "Ailənizin fərdi vərdişi"
alongside the admin catalog's "Su içmək" task, completed and un-completed
both (XP went up/down correctly each time, backed by real `POST`/`DELETE`
calls, not local-only state), and confirmed the admin panel's own catalog
view never shows a family's custom tasks. Also verified via curl: a 15-XP
custom task is rejected (400), a 6th custom task is rejected (409) once 5
already exist, and both error messages match `FamilyHabitLimits`' actual
values.

### Dynamic XP on habit completion

Requested explicitly, narrowed by the user's own choice on two open design
questions: the streak-bonus formula is "+1 XP per consecutive day, capped
at +5" (not a daily-completion-count or random bonus), and nobody can
override the awarded amount at completion time — it's fully automatic,
chosen specifically to keep the reward consistent across children rather
than letting whoever clicks "complete" set their own number.

`HabitXpAward` (`Application/Habits/HabitXpAward.cs`) is the one place the
formula lives: `CalculateStreakBonus(streakDays) = Math.Clamp(streakDays -
1, 0, MaxStreakBonus)` — `MaxStreakBonus = 5`, a fresh/non-consecutive
completion (`streakDays == 1`) earns no bonus at all. Also defines
`SourceType = "habit_completion"`, the `XpTransaction.SourceType` tag every
habit-sourced ledger row carries (`SourceId` = that completion's own
`HabitCompletion.Id`) so the grant can be found again later — by
`UncompleteHabitTaskCommandHandler` (to reverse it) and
`GetHabitCompletionsQueryHandler` (to report it back in a list).
`EfHabitCatalogRepository.GetConsecutiveStreakDaysAsync` walks backward
day-by-day from the given date through a bounded window
(`MaxStreakBonus + 7` days — plenty for any realistic streak, far cheaper
than loading a child+task's entire history) counting how many are in the
completion set; called *after* the new completion is written, so the day
just completed counts as day 1 of the streak, not day 0.

This is the first thing to ever write to `XpTransaction` — that table
existed in the schema (the "ledger, never a mutated counter" design) with
no handler touching it until now. Every other XP-bearing surface (games,
the AI-camera demo, the mock/local-only habits path) still only updates the
frontend's local Zustand `xp` counter — only a real backend habit
completion is actually ledgered.

Verified end-to-end: curl — completed the same real catalog task (base 3
XP) across 7 explicit, simulated-consecutive `logDate` values (bypassing
the frontend's "today only" restriction on purpose, to exercise the
streak math directly) and got exactly 3,4,5,6,7,8,8 (bonus 0,1,2,3,4,5,5 —
capped from day 6 on); confirmed an idempotent re-complete on the same day
returns the same 8, not a fresh (possibly different) computation; deleted
one day's completion and confirmed both its `HabitCompletion` and
`XpTransaction` rows were gone (checked directly in Postgres: exactly 7
ledger rows for 7 completion rows, 1:1, right before cleanup); confirmed
re-completing after that removal recomputes fresh and still lands on the
same capped amount, since the rest of the streak was untouched. Then
through the real UI: signed up a fresh test family, completed a task,
watched XP move from 1,250 to 1,253 and a floating "+3 XP" badge render,
confirmed the toast text, then un-completed it and watched XP return to
exactly 1,250. Test family and all its rows deleted from Neon afterward.

**`CreateFamilyHabitTaskCommandHandler`, `CompleteHabitTaskCommandHandler`,
`UncompleteHabitTaskCommandHandler`, `GetHabitCompletionsQueryHandler`,
`HabitChildOwnership`, and the new `GetConsecutiveStreakDaysAsync`/
`GetXpAmountsForSourceIdsAsync` have zero automated test coverage** — same
gap, same reason, as everything else in this doc flagged this way: built
and verified by hand (curl + the live UI) at explicit user direction to
deprioritize test-writing for now. Test count is still 44.

### Weekly streak ("Həftəlik Seriya")

Requested explicitly, pointing at a screenshot of `HabitsPage.tsx`: "apply
all the backends ... like real xp, weekly strike and so on." XP was already
real by that point (see "Dynamic XP" above) — the "Həftəlik Seriya" widget
was the one piece on that page still entirely static mock data
(`habitsData.weeklyStreak`/`useAppStore.streakDays`, a hardcoded `7`), even
for a family synced to a real backend account.

`GetHabitStreakQueryHandler` computes two things from
`IHabitCatalogRepository.GetCompletionDatesAsync` (every distinct date this
child has at least one completion on, across all tasks — not windowed by
date range, a family's real history is small enough to just load and work
with in memory):

- **`ConsecutiveDays`** — a Duolingo-style streak, deliberately distinct
  from `HabitXpAward`'s *per-task* streak bonus (that one only ever
  evaluates at the exact moment one specific task is completed; this one is
  "did the child do *anything* habit-related, across any task, on each
  day"). Today counts the moment it has its first completion; until then,
  the streak is still "alive" off yesterday — walking backward from today
  (or yesterday, if today has nothing yet) and stopping at the first day
  with no completion at all.
- **`Week`** — always 7 entries, Monday through Sunday, for whichever week
  contains `today`. Each day's `state` is `"today"` (always, regardless of
  whether today already has a completion — matches the original mock
  widget's behavior of highlighting today distinctly rather than also
  showing a checkmark), `"upcoming"` (a future day in the same week),
  `"done"` (a past day with at least one completion), or `"missed"` (a past
  day with none at all — the one case the original static mock never had
  to represent, since it always assumed a perfect week). The frontend folds
  `"missed"` into the same plain-gray display as `"upcoming"` — same visual
  the mock widget always had, no new UI state was asked for.

`src/pages/HabitsPage.tsx` fetches the streak alongside categories and
today's completions on load, and again after every complete/uncomplete
(`refreshStreak()`) — since a completion can flip today's own state or the
`ConsecutiveDays` count. `AZ_DAY_LABELS` (`B.e`/`Ç.a`/`Ç`/`C.a`/`C`/`Ş`/`B`)
is a fixed Monday-first array matching the backend's own week ordering,
replacing the per-day labels that used to live in the static mock JSON.

Verified end-to-end via curl: a child with zero completions correctly shows
`consecutiveDays: 0` and every day `"upcoming"` except today; completing
today's task flips `consecutiveDays` to 1 while today's own `state` stays
`"today"` (not `"done"`, by design); completing the two days immediately
before today brought `consecutiveDays` to 3 (correctly spanning the
Monday-Sunday week boundary, even though the display only shows the
current week); and — the case worth calling out — completing Monday and
Tuesday but deliberately skipping Wednesday, with "today" set to Thursday,
correctly showed Mon/Tue as `"done"`, Wed as `"missed"`, and
`consecutiveDays: 1` (only Thursday's own completion counted — Wednesday's
gap broke the chain entirely, even though Monday and Tuesday had history).
Also verified: no token → 401, a different family's token → 403. Then
through the real UI: the badge read the real `"0 GÜN"` on load (replacing
the old static `"7 GÜN"`), and immediately became `"1 GÜN"` after
completing a task, with the day-circles confirmed via direct DOM inspection
(today styled distinctly, the rest plain). Test families deleted from Neon
afterward.

~~**Still mock on this page**: "Bugünkü ekran vaxtı" ... is still
`habitsData.todayStats[1].value`, a static string~~ — done, in a later
round. See "Screen time tracking" below "Focus Mode" — `ScreenTimeEntry` is
the separate, genuinely new mechanism this stat needed (the lock built in
"Focus Mode" was never it).

**`GetHabitStreakQueryHandler`/`GetCompletionDatesAsync` have zero
automated test coverage** — same gap, same reason, as everything else in
this doc flagged this way. Test count is still 44.

### Focus Mode (video-limit lock)

`FocusSession` existed in the schema from the start (`Id`, `ChildId`,
`StartedAt`, `LockedUntil`, `Minutes`, `TriggerReason` — "one row per lock:
when it started, until when, why", per its own doc comment) with no
handler ever touching it — the frontend's "2 Video Limitinə Çatdı" cooldown
screen (`FocusModePage.tsx`) was pure local Zustand state
(`focusLockUntil`), and nothing on the frontend actually *triggered* it —
the mock page just auto-started a demo lock on its own whenever visited
with nothing active. This slice makes the lock real and wires up the
trigger the mock copy always implied but never had behind it.

```
POST /api/focus/children/{childId}/lock   [requires Authorization: Bearer {token}]
  { minutes, reason }
  -> 200 { id, childId, startedAt, lockedUntil, minutes, triggerReason }
     (idempotent — an already-active lock is returned as-is, not stacked)
  -> 400 if minutes is outside 1-180 (FocusLockLimits)
  -> 401/403/404 same family-ownership-via-child rule as the Habits
     completion endpoints above

GET  /api/focus/children/{childId}/lock/active   [Bearer token]
  -> 200 { id, childId, startedAt, lockedUntil, minutes, triggerReason }
  -> 204 if there's no active lock (not 404 — this is an expected result)
  -> 401/403/404 as above
```

- `POST /api/focus/children/{childId}/lock` — body `{ minutes, reason }`.
  Keyed by `childId` (not `familyId`, same route shape as the Habits
  completion endpoints), ownership resolved via
  `IFamilyAccountRepository.GetFamilyIdForChildAsync` + a small
  `FocusChildOwnership` helper (its own copy of the same check
  `HabitChildOwnership` already does — kept separate rather than shared
  cross-domain, since each domain's ownership check throws its own
  exception types that `Program.cs`'s endpoint-specific `catch` blocks map
  to responses). `minutes` is bounds-checked server-side against
  `FocusLockLimits` (1-180) regardless of what the frontend sends — 400 if
  outside that range. **Idempotent**: if the child already has an active
  lock (`LockedUntil` still in the future), the existing one is returned
  as-is rather than stacking a second overlapping lock — a retried or
  accidentally-doubled call can't extend or duplicate the cooldown.
- `GET /api/focus/children/{childId}/lock/active` — 200 with the lock, or
  **204 (not 404)** when there isn't an active one — "no lock" is an
  expected, routine result here, not an error.
- **Frontend trigger**: `AnimationsPage.tsx` tracks which videos completed
  on which local date (`useAppStore.videoCompletionDates`, keyed by
  `youtubeId` — only ever set once per video, so replaying an
  already-completed video doesn't inflate the count) and calls
  `POST .../lock` with `{ minutes: 15, reason: "video_limit" }` every
  `VIDEOS_PER_LOCK`-th (2nd, 4th, 6th, ...) completion in a day — a
  repeating cooldown rule, not a one-time daily cap. A child with no
  backend account (`childId` is `null`) gets the same trigger logic but
  purely local (`useAppStore.startFocusLock`), same split every other
  backend-wired feature in this app already has.
- **A real, previously-missing enforcement gap, closed as part of this**:
  before this, nothing on the frontend actually stopped a child from
  navigating straight back to `/animasiya` while "locked" — the countdown
  on `FocusModePage.tsx` was cosmetic, not enforced. `src/routes/Guards.tsx`
  gained `RequireNotFocusLocked`, wrapping `/animasiya` (inside the
  existing `RequireFamily`): for a backend-synced child it calls
  `GET .../lock/active` and redirects to `/focus-mode` if one comes back
  (syncing the real `lockedUntil` into local state first, so the countdown
  there is accurate); for a local-only child it just checks the existing
  local `focusLockUntil`. If the backend call fails outright, the guard
  fails open (lets the child through) rather than stranding them behind a
  check that can never resolve.
- `FocusModePage.tsx` itself no longer auto-starts a demo lock for a
  backend-synced child with nothing active — it fetches the real active
  lock on mount and bounces back to `/animasiya` if there isn't one (only
  `AnimationsPage`'s real trigger is allowed to start one now). The
  auto-start-a-short-demo-lock behavior is kept, unchanged, for a
  local-only child, so the page stays explorable on its own without a
  backend account.
- Verified end-to-end via curl: no active lock → 204; no token → 401; start
  a lock → 200 with the row; fetching it back → 200 with the same `id`;
  starting again while still active → 200 with the *same* `id` (idempotent,
  not a second row); `minutes: 500` → 400; a bogus `childId` → 404; a
  different family's token against this child → 403. Then through the real
  UI: completed one real video (no lock yet, 1 of 2), completed a second —
  confirmed a real `FocusSession` row landed in Postgres
  (`trigger_reason = 'video_limit'`, `minutes = 15`) and the app navigated
  to `/focus-mode` on its own with a live, correctly-counting-down badge;
  navigating straight back to `/animasiya` while that lock was still active
  correctly bounced back to `/focus-mode` (the enforcement gap above,
  confirmed actually closed, not just coded); and visiting `/focus-mode`
  directly for a backend-synced child with no active lock correctly bounced
  to `/animasiya` instead of inventing a fake one. Test families and their
  rows (including `focus_sessions`) deleted from Neon afterward.
- **Deliberately not built this round**: real "today's screen time"
  tracking (the `HabitsPage.tsx` "Bugünkü ekran vaxtı" stat flagged in
  "Weekly streak" above) is a *different* concept from this lock — `
  FocusSession` only ever recorded lock events ("when, until when, why"),
  never cumulative watch-time, and the schema has nothing else designed
  for that either (`WatchProgress` is per-video *percentage*, not
  time-based, and has its own handler-less gap, unrelated to this one).
  Giving that stat a real value would mean designing and building a third,
  separate tracking mechanism from scratch — out of scope for this round,
  which focused on what "Focus Mode" actually names: the lock itself.
- **Zero automated test coverage** on any of this
  (`StartFocusLockCommandHandler`, `GetActiveFocusLockQueryHandler`,
  `EfFocusRepository`) — same gap, same reason, as everything else flagged
  this way in this doc. Test count is still 44.

### Screen time tracking

Requested explicitly, picking up the "Deliberately not built this round"
gap flagged right above: real cumulative "today's screen time" for
`HabitsPage.tsx`'s "Bugünkü ekran vaxtı" stat, which was a static string
even for a backend-synced family. This is a **genuinely new mechanism**,
not an extension of `FocusSession` — that table only ever records lock
*events* ("when, until when, why"), never cumulative watch-time, exactly
the distinction already called out in the paragraph above. `ScreenTimeEntry`
(new entity + table, migration `AddScreenTimeEntry`) is one row per
child-per-day, accumulating `TotalSeconds`.

```
POST /api/focus/children/{childId}/screen-time   [Bearer token]
  { date, secondsDelta }
  -> 200 { date, totalSeconds }   (the new running total for that day)
  -> 400 if secondsDelta is outside 1-300 (ScreenTimeLimits.MaxDeltaSeconds)
  -> 401/403/404 same family-ownership-via-child rule as everywhere else

GET  /api/focus/children/{childId}/screen-time?date=YYYY-MM-DD   [Bearer token]
  -> 200 { date, totalSeconds }   (totalSeconds: 0 if no row exists yet — not 404)
  -> 401/403/404 as above
```

- `AddScreenTimeAsync`/`GetScreenTimeAsync` (new on `IFocusRepository`,
  implemented in `EfFocusRepository`) use a find-or-create-then-increment
  pattern — no DB-level unique constraint on `(ChildId, Date)`, idempotency
  of "don't create two rows for the same day" is handled in C# rather than
  at the schema level, consistent with how little else in this schema
  relies on DB-level constraints beyond PK/FK. `GetScreenTimeAsync` returns
  `0` for a day with no row rather than 404 — same "absence is a routine
  result, not an error" shape `GET .../lock/active`'s 204 already
  established for this domain.
- `secondsDelta` is capped at `ScreenTimeLimits.MaxDeltaSeconds = 300`
  server-side (one call can't claim more than 5 minutes of screen time at
  once) — defense in depth matching `FocusLockLimits`/`FamilyHabitLimits`'s
  already-established numeric-cap pattern in this codebase, since the
  frontend flushes small deltas every ~10s in normal operation and should
  never legitimately need to send anywhere near 300 in one call.
- **Frontend trigger**: `YoutubePlayer.tsx` gained a new `onElapsedSeconds`
  callback, fired every ~250ms poll tick while actually playing with the
  real wall-clock seconds elapsed since the previous tick (not an assumed
  "1x playback speed, no pauses" guess). `AnimationsPage.tsx` accumulates
  these in a ref and flushes to this endpoint once accumulated ≥10 real
  seconds, and also on every video switch and on unmount — so a partial,
  not-yet-flushed chunk is never silently dropped mid-session. A local-only
  child (no `childId`) accumulates the same way but the flush is a no-op —
  there's no local equivalent table to persist to, same split as every
  other backend-only feature in this app.
- `HabitsPage.tsx`'s "Bugünkü ekran vaxtı" card now fetches this on load
  for a backend-synced family (`fetchScreenTime(childId, today, token)`)
  and formats it into the same "1s 40dq" style the old static mock string
  used (`formatScreenTime` — hours omitted when zero). It's a point-in-time
  read on page load, not a live subscription — revisiting or reloading the
  Habits page picks up whatever's accumulated so far, same "no live-push"
  shape every other stat on this page already has.
- Verified end-to-end via curl with a disposable test family: no entry for
  today → `GET` returns `{ totalSeconds: 0 }`; `POST` with `secondsDelta: 8`
  → `{ totalSeconds: 8 }`; a second `POST` with `secondsDelta: 12` on the
  same date → `{ totalSeconds: 20 }` (confirms real cumulative addition,
  not an overwrite); a `POST` against a *different* date for the same
  child → its own independent `{ totalSeconds }`, confirming per-day
  isolation; `secondsDelta: 301` → 400; `secondsDelta: 0` → 400; a bogus
  `childId` → 404; a second disposable family's token against the first
  family's child → 403. `tsc -b` and `oxlint` clean on the changed
  frontend files — live-UI click-through wasn't possible this round, same
  Node-version blocker as "Watch progress sync" above. Test family and its
  `screen_time_entries` rows deleted from Neon afterward.
- **Zero automated test coverage** on `AddScreenTimeCommandHandler`/
  `GetScreenTimeQueryHandler`/`EfFocusRepository`'s two new methods — same
  gap, same reason, as everything else flagged this way in this doc. Test
  count is still 44.

### Leagues (reward store + parent approval)

`Reward`/`RewardRedemption` existed in the schema from the start with zero
handlers — `LeaguesPage.tsx`'s "Mükafat Mağazası" redeem flow was entirely
local Zustand state (`redeemedRewards`), an instant, unapproved "spend"
that ignored the reward store's own on-page disclaimer text about a parent
having to approve it first. This slice makes both halves real: redeeming
debits real XP immediately (reserving it) and creates a "pending" row; a
parent then approves (no further XP change) or rejects it (XP refunded)
from `SettingsPage.tsx`.

```
GET  /api/leagues/children/{childId}/rewards   [requires Authorization: Bearer {token}]
  -> 200 [{ id, title, description, costXp, sponsor, icon, redemptionStatus }]
  -- redemptionStatus is this child's most recent attempt at that reward:
     null (never tried), "pending", "approved", or "rejected". A "rejected"
     status does NOT block a retry — see below.
  -> 401/403/404 same family-ownership-via-child rule as the Habits
     completion endpoints

POST /api/leagues/children/{childId}/rewards/{rewardId}/redeem   [Bearer token]
  -> 200 { id, childId, childName, rewardId, rewardTitle, costXp, status, redeemedAt }
  -> 400 if the child's real XP balance is below the reward's CostXp
  -> 404 if childId or rewardId doesn't exist
  -> 409 if the child's latest attempt at this reward is still "pending"
     or already "approved" (a "rejected" latest attempt does not 409 —
     it frees the reward up for a fresh try)

GET  /api/leagues/pending-redemptions?familyId={familyId}   [Bearer token]
  -> 200 [{ id, childId, childName, rewardId, rewardTitle, costXp, status, redeemedAt }]
  -- every "pending" redemption across every child in the family; backs
     SettingsPage.tsx's approval card
  -> 403 if the token's familyId doesn't match the query param (same shape
     GET /api/habits/categories?familyId= already uses)

POST /api/leagues/redemptions/{redemptionId}/approve   [Bearer token]
  -> 200 the updated row, status: "approved"
  -> 403/404 — 403 resolved via the redemption's own child, not a route
     familyId (there isn't one)
  -> 409 if the redemption isn't "pending" anymore (a decision, once made,
     can't be changed by calling the other endpoint afterward)

POST /api/leagues/redemptions/{redemptionId}/reject   [Bearer token]
  -> 200 the updated row, status: "rejected" — and the XP is refunded
  -> 403/404/409 as above
```

- **The XP ledger (`XpTransaction`) gained its second real consumer**:
  `IHabitCatalogRepository.GetTotalXpAsync(childId)` (a plain `SUM`) is
  `RedeemRewardCommandHandler`'s real, server-side affordability check —
  the frontend's own local `xp` counter (used for the page's optimistic
  "can I afford this" styling) is never trusted for the actual spend. It
  lives on `IHabitCatalogRepository` rather than a new ledger-specific
  interface — every `XpTransaction` method already lived there from the
  Habits work, and splitting that surface across two repositories for one
  new caller wasn't worth the churn to already-shipped code; see that
  method's own doc comment for the full reasoning.
- **Reserve-then-refund, not pay-on-approval**: redeeming debits the XP
  immediately, before any parent has seen the request — reserving it so a
  child can't request two rewards they can only actually afford one of
  before a parent gets to either. Approving makes no further XP change
  (the spend already happened); rejecting refunds it via a second
  `XpTransaction` row (`reward_redemption` source type, same `SourceId` as
  the original debit, so both sides of a reversed spend are traceable back
  to the same redemption).
- **No admin management UI for the catalog yet** — the four rewards are
  seeded idempotently at every backend startup (same "insert only if
  missing" shape as the seeded admin account, gated on the whole `rewards`
  table being empty rather than a single natural key, since this is a
  multi-row catalog with no admin UI to re-create rows by hand later). They
  match what used to be `src/data/leagues.json`'s static mock list.
- **A real, pre-existing-class-of-bug caught during this round's own
  verification, not a new one**: the first version of the reward-catalog
  seed (hardcoded Azerbaijani-diacritic string literals in `Program.cs`)
  wrote visibly mangled text into Postgres on its first run — a UTF-8
  byte sequence double-decoded as if it were a single-byte codepage, the
  same *symptom* flagged elsewhere in this doc for raw `curl -d` on
  Windows Git Bash, but this time from a stale incremental-build artifact,
  not a shell quoting issue: deleting the bad rows, a full clean rebuild
  (`rm -rf **/bin **/obj`), and letting the idempotent seed re-run on a
  fresh build produced correct text, confirmed by inspecting actual
  Unicode codepoints in the database (not a terminal's own display, which
  garbles high bytes regardless of what's actually stored). Worth knowing
  if a future hardcoded-diacritic seed ever looks wrong on first boot.
- Verified end-to-end via curl: accumulated real XP through 65 real
  (backdated) habit completions on a disposable test child (reusing the
  same technique "Dynamic XP" above used to exercise the streak math), then
  — insufficient XP → 400; redeem an affordable reward → 200 pending, XP
  debited exactly; redeeming the same reward again while pending → 409; no
  token → 401; a different family's token → 403; bogus reward/child → 404;
  `GET .../pending-redemptions` correctly listed it with the real child's
  name joined in; approve → 200 approved, XP unchanged; approving an
  already-resolved redemption again → 409; a second reward redeemed then
  *rejected* → XP refunded back to the exact pre-redeem amount, catalog
  showed `redemptionStatus: "rejected"`, and redeeming that same reward
  again succeeded (the no-409-on-rejected rule). Then through the real UI:
  the catalog rendered with correct Azerbaijani diacritics and real
  per-reward status badges ("Təsdiq Gözlənilir" / "Dəyişdirildi" / locked),
  approving a real pending redemption from `SettingsPage.tsx`'s new card
  removed it from the list with a success toast, and — the one real bug
  this round's live testing caught — deliberately desyncing the frontend's
  local `xp` display from the real server balance (so the button showed
  "affordable" when the real ledger wasn't) correctly 400'd server-side,
  but the first version of this surfaced the backend's raw English
  `InsufficientXpException` text straight into the Azerbaijani UI; fixed
  in `LeaguesPage.tsx`/`SettingsPage.tsx` the same way `LoginPage.tsx`
  already handles its own backend-error leaks. All test families and their
  rows (including `reward_redemptions`) deleted from Neon afterward; the
  real four-row reward catalog was only ever read from, confirmed
  numerically unchanged at the end.
- **Zero automated test coverage** on any of this
  (`RedeemRewardCommandHandler`, `Approve`/`RejectRewardRedemptionCommandHandler`,
  `GetRewardsQueryHandler`, `GetPendingRedemptionsQueryHandler`,
  `EfRewardRepository`, `GetTotalXpAsync`) — same gap, same reason, as
  everything else flagged this way in this doc. Test count is still 44.

### Social (feed, likes, comments, leaderboard)

`SocialPost`/`PostLike`/`SocialComment`/`CommentLike` existed in the schema
from the start with zero handlers — `SocialPage.tsx`'s feed, like counts,
comment counts, and leaderboard were all static mock JSON, with no way to
actually post, like, or comment on anything. **Deliberately cross-family,
unlike every other slice in this file**: the feed and leaderboard span
every family in the app, same as the original mock data always implied —
see `ISocialRepository`'s own doc comment. Only the *acting* childId
(posting, liking, commenting) is ever ownership-checked against the
caller's token; nothing here is scoped to the caller's own family the way
Habits/Focus/Leagues are.

```
GET  /api/social/posts?childId={childId}&limit=20   [requires Authorization: Bearer {token}]
  -> 200 [{ id, childId, handle, avatarEmoji, caption, mediaEmoji, createdAt, likeCount, commentCount, likedByMe }]
  -- most recent first, across every family; childId is only used to compute
     likedByMe per post
  -> 401/403/404 — 403/404 resolved via childId, same ownership-via-child
     shape as the Habits completion endpoints

POST /api/social/children/{childId}/posts   [Bearer token]
  { caption, mediaEmoji? }
  -> 201 the created post dto (likeCount/commentCount start at 0)
  -> 400 if caption is empty or over 280 characters
  -> 401/403/404 ownership

POST /api/social/children/{childId}/posts/{postId}/like     [Bearer token]
DELETE /api/social/children/{childId}/posts/{postId}/like   [Bearer token]
  -> 204 both — idempotent (liking an already-liked post, or unliking one
     that isn't, is a silent no-op)
  -> 401/403/404 (404 if postId doesn't exist)

GET  /api/social/posts/{postId}/comments   [Bearer token]
  -> 200 [{ id, postId, childId, handle, avatarEmoji, body, parentCommentId, createdAt }]
  -- oldest first, flat (parentCommentId distinguishes a reply from a
     top-level comment — the frontend doesn't nest them visually this round,
     see below)
  -> 404 if postId doesn't exist

POST /api/social/children/{childId}/posts/{postId}/comments   [Bearer token]
  { body, parentCommentId? }
  -> 201 the created comment dto
  -> 400 if body is empty/over 280 chars, or parentCommentId points at a
     comment that isn't actually on this post
  -> 401/403/404 (404 if childId or postId doesn't exist)

GET  /api/social/leaderboard?limit=10   [Bearer token]
  -> 200 [{ childId, handle, avatarEmoji, totalXp }]   -- ranked desc
  -- every family's children are eligible; a child with 0 or negative total
     XP is excluded (nothing to rank them against yet)
```

- **`SocialHandle.Generate(childId)`** (`Application/Social/SocialHandle.cs`)
  is the one place the anonymized "@Handle_NN" identity comes from —
  deterministic from the child's own Guid bytes (not .NET's `GetHashCode()`,
  which isn't guaranteed stable across runtimes/versions — this reads the
  Guid's raw bytes directly instead), picked from a fixed list of whole,
  pre-built Azerbaijani compound words matching the original mock's style
  (e.g. `"@UlduzKəşfiyyatçı_44"`) rather than assembling grammatically
  risky combinations on the fly. A `SocialPost` freezes its own `Handle` at
  creation time (so an old post's byline never silently changes later);
  the leaderboard computes it fresh from `ChildId` at read time, since a
  child can rank without ever having posted — confirmed live: the same
  child's post, comment, and leaderboard row all showed the exact same
  handle, independently computed three separate times.
- **The XP ledger's third real consumer**: `GetLeaderboardQuery` uses a new
  `IHabitCatalogRepository.GetTopXpChildrenAsync(limit)` (a grouped `SUM`
  + `ORDER BY` + `TAKE`, same "lives here, not a new ledger-specific
  repository" reasoning as `GetTotalXpAsync` in "Leagues" above) to rank
  real children by real total XP — no mock numbers anywhere in this path.
- **A new cross-family read, added to `IFamilyAccountRepository`**:
  `GetChildrenByIdsAsync(childIds)` — every other method on that interface
  is scoped to one family at a time (by design, everywhere else in this
  backend *is* family-scoped); the leaderboard is the first caller that
  legitimately needs children from several different families in one
  batch, to resolve `AvatarEmoji` for whoever the XP ranking names.
- **Deliberately not built this round**: `CommentLike` (the fourth table
  in this domain) has no handlers — only a post itself can be liked, not
  a comment on it. The frontend also doesn't render replies nested under
  their parent — `GetCommentsQuery` returns a flat, chronological list
  with `parentCommentId` attached, and a reply can be *created* via that
  field (verified via curl), but `SocialPage.tsx`'s comment UI only ever
  posts top-level comments this round, not reply-to-a-specific-comment.
  Both are real, scoped-out pieces, not oversights — flagging them the
  same way "today's screen time" was flagged out of Focus Mode.
- **The "AI Filter" badges are still purely decorative** — `SocialPage.tsx`
  shows "AI FILTER AKTİV" / "AI FILTER: TƏSDİQLƏNDİ" on every post
  unconditionally, exactly as the original mock did. No moderation service
  of any kind is called anywhere in this slice; `SocialLimits` only
  enforces a plain 280-character cap, not content safety. Worth being
  explicit about given this is a kids'-safety-themed feature — the badge
  claims something stronger than what's actually implemented.
- Verified end-to-end via curl with two disposable test families (to
  specifically exercise the cross-family behavior a single-family test
  couldn't): Family A posted, no token → 401, empty caption → 400, Family
  B's token posting *as* Family A's child → 403; Family B liked Family A's
  post — confirmed `likedByMe` was `true` reading as Family B but `false`
  reading the exact same post as Family A (per-viewer, not global); like
  while already liked and unlike while not liked both correctly no-op'd;
  liking a bogus postId → 404. Family B commented on Family A's post,
  Family A replied with a real `parentCommentId`, a reply pointed at an
  unrelated random `parentCommentId` → 400, comments on a bogus post →
  404. Leaderboard excluded both fresh test children (0 XP) until one
  completed a real habit task, then appeared ranked correctly — and, while
  checking it, correctly surfaced an unrelated **real, pre-existing**
  account's XP too (not a test row — left untouched, see "Known gotcha"
  below). Then through the real UI: composed a real post with a media
  emoji picker, confirmed the diacritics and the chosen emoji rendered
  correctly, liked then unliked it (optimistic UI confirmed both
  directions against the real backend), expanded comments and posted two
  — the second one live-incremented the header's comment count without a
  reload (a real gap caught during this verification: the count only
  updated on the next full fetch until `PostCard` was given an
  `onCommentAdded` callback to bump it locally, same optimistic-update
  shape `onToggleLike` already had). All test families and their posts/
  comments/likes deleted from Neon afterward (confirmed `social_posts` back
  to a real-content-only state: 0 rows once every test row was gone).
- **Known gotcha hit (and worth remembering) during this round's own curl
  verification, not a product bug**: `AvatarEmoji` (a 4-byte UTF-8 emoji)
  silently came back as `"??"` in every curl response for a child created
  with an inline `-d` body — this is the *exact* already-documented
  Windows Git Bash diacritic-corruption bug elsewhere in this file, just
  triggered by an emoji instead of an Azerbaijani letter for the first
  time. Same fix as always: a file + `--data-binary @file`. Confirmed
  live through the real UI afterward that the actual stored avatar emoji
  was always correct — this was purely an artifact of how curl was
  invoked in this one verification session, not a bug in `AddChildPage`
  or anywhere else.
- **Zero automated test coverage** on any of this
  (`CreatePostCommandHandler`, `Like`/`UnlikePostCommandHandler`,
  `CreateCommentCommandHandler`, `GetPostsQueryHandler`,
  `GetCommentsQueryHandler`, `GetLeaderboardQueryHandler`,
  `EfSocialRepository`, `GetTopXpChildrenAsync`,
  `GetChildrenByIdsAsync`) — same gap, same reason, as everything else
  flagged this way in this doc. Test count is still 44.

### Mini-games

Requested explicitly ("let's do the Games backend"). `Game`/`GameResult`
existed in the schema from the start with zero handlers — all six mini-games
(Memory Match, Tangram, Sudoku for Kids, Puzzle Logic, Rənglərin Sehri, Söz
Tapmacası) always played fine client-side (none of their logic needs a
backend), but every result and every XP award was local Zustand state only
(`gameHistory`/`addXp`), never reaching the backend even for a
backend-synced child — the game-play equivalent of what `WatchProgress` was
before "Watch progress sync" above.

```
POST /api/games/children/{childId}/plays   [Bearer token]
  { gameId, score }   (gameId is the real slug, e.g. "memory" — see below)
  -> 200 { id, gameId, axis, score, xpAwarded, playedAt }
  -> 400 if score is outside 0-100
  -> 404 if gameId doesn't match one of the seeded games, or childId doesn't exist
  -> 401/403 same family-ownership-via-child rule as Habits/Focus/Leagues

GET  /api/games/children/{childId}/plays?limit=30   [Bearer token]
  -> 200 [ { id, gameId, axis, score, xpAwarded, playedAt }, ... ]   (newest first)
  -> 401/403/404 as above
```

- **The game catalog has no admin management UI** — same "fixed set, seeded
  idempotently at startup" shape `Reward`'s catalog already established:
  the six `Game` rows (`Slug`/`Title`/`Icon`/`Axis`) are inserted once if
  the table is empty, matching `GAME_CATALOG` (`useAppStore.ts`) exactly —
  the frontend's own static display metadata (title/icon/description per
  game) never needed to move to the backend at all, only the *slug* needs
  to resolve to something real server-side.
- `gameId` in the request/response is always the real slug, never the
  internal `Game.Id` — `RecordGamePlayCommand` resolves slug → Guid at the
  boundary (`IGameRepository.FindGameBySlugAsync`), same "never surface the
  internal id" convention `ResolvePlaylistPublicIdAsync`/`ResolveVideoIdAsync`
  already established for Content.
- **The XP amount is computed server-side, never trusted from the client**:
  `GameXpAward.CalculateXp(score)` mirrors `GamesPage.tsx`'s own
  `Math.round(5 + score / 5)` formula exactly (5-25 XP per play), and the
  result is written as a real `XpTransaction` row (`SourceType =
  "game_play"`) — the same ledger `HabitXpAward` first wrote and
  `RedeemReward` first spent from, now with its third writer. Unlike a habit
  completion, a game play has no "already played today" concept to dedupe
  against — every play is its own independent ledger entry, always.
- `RecordGamePlayCommandHandler`/`GetGamePlaysQueryHandler` both inject
  `IHabitCatalogRepository` as `xpLedger` purely for its
  `AddXpTransactionAsync`/`GetXpAmountsForSourceIdsAsync` methods — same
  cross-domain reuse `RedeemRewardCommandHandler` already does, rather than
  duplicating ledger read/write methods onto a third repository (see
  `IHabitCatalogRepository`'s own doc comment on `GetTotalXpAsync` for why
  the ledger methods live there instead of a dedicated Economy repository).
- `GetGamePlaysQueryHandler` batch-attaches each play's real `XpAwarded` via
  one `GetXpAmountsForSourceIdsAsync` call — same shape
  `GetHabitCompletionsQueryHandler` already uses, not an N+1.
- **Frontend**: new `src/lib/gamesService.ts` (`recordGamePlay`/
  `fetchGamePlays`). `GamesPage.tsx` gained the same `useBackend =
  !!(parent?.familyId && child?.childId)` branch every other backend-wired
  page already has: a backend-synced child's `handleFinish` now calls
  `recordGamePlay` and credits XP from the real `xpAwarded` the backend
  returns (not a local guess), appending to a new `backendPlays` state used
  for the "Ümumi oynanıldı"/"Orta uğur nisbəti" stats instead of the local
  `gameHistory` array; a failed network call falls through to the exact old
  local-only path so the child still gets credit for the play even if the
  backend is briefly unreachable. A local-only child (no `childId`) is
  completely untouched — same split every other backend-wired feature here
  already has.
- Verified end-to-end via curl with a disposable test family: recorded a
  score-80 Memory Match play → `xpAwarded: 21` (`round(5 + 80/5)`,
  confirming the server-side formula matches the frontend's exactly); a
  score-0 Tangram play → `xpAwarded: 5` (the floor); `score: 150` → 400; a
  bogus `gameId` ("nope") → 404; a bogus `childId` → 404; a second
  disposable family's token against the first family's child → 403 on both
  endpoints; `GET .../plays` correctly returned both plays newest-first
  with the right `xpAwarded` for each. `tsc -b` and `oxlint` are clean on
  every changed frontend file — live-UI click-through wasn't possible this
  round, same Node 18 vs. `rolldown` blocker as the "Admin accounts",
  "Watch progress sync", and "Screen time tracking" sections above. Test
  families and their rows (`game_results`, `xp_transactions`, `children`,
  `parents`, `families`) deleted from Neon afterward via a disposable
  cleanup script, never printing the connection string; the seeded 6-row
  `games` catalog was only ever read from.
- **Zero automated test coverage** on any of this
  (`RecordGamePlayCommandHandler`, `GetGamePlaysQueryHandler`,
  `EfGameRepository`, `GameXpAward`) — same gap, same reason, as everything
  else flagged this way in this doc. Test count is still 44.

### Wallet

Requested explicitly ("Wallet backend") — picked from a short list of
remaining gaps (Wallet was the last fully-mock domain; the others offered
were test coverage, the Node environment issue, and a few small flagged
loose ends). `WalletTransaction`/`DonationCampaign` existed in the schema
from the start with zero handlers — `WalletPage.tsx`'s balance, transaction
history, and donate flow were all static mock data / local-only Zustand
state, the wallet-side sibling of what Games' `Game`/`GameResult` were
before "Mini-games" above.

```
GET  /api/wallet/donation-campaigns   (open, no token — just a catalog)
  -> 200 [ { id, title, sponsor, xpCost, aznAmount, icon }, ... ]

GET  /api/wallet/children/{childId}/balance   [Bearer token]
  -> 200 { balanceAzn }

GET  /api/wallet/children/{childId}/transactions?limit=30   [Bearer token]
  -> 200 [ { id, title, direction, amountAzn, occurredAt }, ... ]   (newest first)

POST /api/wallet/children/{childId}/donations   [Bearer token]
  { campaignId }
  -> 200 { transactionId, campaignTitle, xpCost, aznAmount, newBalanceAzn }
  -> 400 if the child's real XP balance is below the campaign's XpCost
  -> 404 if campaignId doesn't match a seeded campaign, or childId doesn't exist

POST /api/wallet/children/{childId}/allowance   [Bearer token]
  { amountAzn }
  -> 200 { id, title, direction, amountAzn, occurredAt }
  -> 400 if amountAzn is outside 0.01-500 (WalletLimits)

All child-keyed routes: 401/403/404 same family-ownership-via-child rule as
Habits/Focus/Games.
```

- **The donation campaign catalog has no admin management UI** — same
  "fixed set, seeded idempotently at startup" shape `Reward`/`Game`'s
  catalogs already established: the two campaigns ("Kimsəsiz Heyvanlara
  Sığınacaq Dəstəyi" / PASHA Bank, "Meşə Salma Kampaniyası" / Kapital Bank)
  match what used to be `src/data/wallet.json`'s static `donations` list.
  Unlike those two catalogs, this read is **open/unauthenticated** — same
  "just a catalog, nothing to own" shape as `GET /api/habits/categories`
  with no `familyId` — since a donation campaign carries no per-child state
  the way a reward's `redemptionStatus` does.
- **The real balance formula, finally actually enforced**:
  `IWalletRepository.GetBalanceAsync` sums every "in" transaction's
  `AmountAzn` and subtracts every "out" one's — never a mutated counter,
  same ledger shape as `XpTransaction`/`GetTotalXpAsync`. This isn't a new
  invented formula: the old mock's own seed data in `wallet.json` already
  implied it (its static balance, 15.50 AZN, equals exactly
  sum(in) − sum(out) over its seed transactions — 24.00 − 8.50) — the old
  frontend `donate()` just never kept that invariant live, since it only
  ever touched local `xp` and the transaction log, never the `balance`
  field itself. This repository is what finally makes it real.
- **`DonateCommandHandler` faithfully ports the mock's own two-effect
  `donate()`**: it spends real XP (the same `XpTransaction` ledger
  Habits/Games already write to and `RedeemReward` already spends from)
  **and** logs a real AZN "out" `WalletTransaction` for the sponsor-matched
  amount — even though the actual money moves from the sponsor to the
  charity, not literally out of the child's own saved balance. That's the
  mock's own existing design (per the arithmetic above), not reinterpreted
  here. No "already donated" dedupe — repeatable, same as the mock. The
  `WalletTransaction` is written first (same order
  `CompleteHabitTaskCommandHandler` uses for its own completion row), so
  the `XpTransaction`'s `SourceId` can point at it as the donation event;
  the `WalletTransaction`'s own `SourceId` points at the campaign itself —
  "why this AZN amount", the same role `RewardRedemption.RewardId` plays
  elsewhere.
- **`GrantAllowanceCommand` is the one genuinely new capability here, not a
  port of existing mock behavior**: a parent manually crediting their own
  child's pocket money — the real version of "Valideyn Cib Pulu", the
  recurring "in" transaction title the old mock's seed data always showed
  but nothing ever actually wrote. Same trust level as
  `CreateFamilyHabitTaskCommand` (a parent acting on their own family, not
  an admin-gated action), capped at `WalletLimits` (0.01-500 AZN per grant)
  for defense in depth. `SettingsPage.tsx`'s new "Cib Pulu Göndər" card is
  where a parent does this.
- **Deliberately not built**: automatically crediting AZN when a child
  reaches a new league tier or hits a weekly streak — the other two "in"
  transaction titles the old mock's seed data showed ("Liqa Mükafatı",
  "Həftəlik Seriya Bonusu"). Neither was ever wired to a real trigger even
  in the mock itself (no handler fired them locally either) — building one
  means reaching into the League-tier/streak domains' own logic to detect a
  threshold crossing, a materially bigger, cross-cutting change than "give
  the wallet a backend" asked for. A fresh backend-synced family's wallet
  therefore starts at 0.00 AZN with no automatic credit mechanism — an
  honest reflection of what's wired, not a bug; `GrantAllowanceCommand`
  above is the only way real AZN enters a fresh wallet right now, and a
  donation only ever needs XP (already real), never AZN balance, so it
  works regardless.
- `DonateCommandHandler`/`GetWalletBalanceQueryHandler`/
  `GetWalletTransactionsQueryHandler`/`GrantAllowanceCommandHandler` all
  inject `IFamilyAccountRepository` for the ownership check and
  `IWalletRepository` for everything else — `Donate` additionally injects
  `IHabitCatalogRepository` as `xpLedger` purely for
  `GetTotalXpAsync`/`AddXpTransactionAsync`, same cross-domain reuse
  `RedeemRewardCommandHandler`/`RecordGamePlayCommandHandler` already
  established, rather than duplicating ledger methods onto a fourth
  repository.
- A brand-new `WalletChildNotFoundException`/`WalletAccessDeniedException`
  pair lives in the same `EconomyExceptions.cs` file as Reward's own —
  same `ContentChildNotFoundException`-alongside-Content's-admin-exceptions
  precedent: one Application namespace, a different sub-concept, its own
  exception types so `Program.cs`'s per-route `catch` blocks stay
  independent.
- Verified end-to-end via curl with a disposable test family: balance
  starts at 0.00; granting 20 AZN allowance → balance 20.00; `amountAzn: 0`
  and `amountAzn: 9999` → 400; donating with 0 XP → 400 (reuses
  `InsufficientXpException`, same message shape Leagues' redeem already
  uses); a bogus `campaignId` → 404; earned 300 XP via 12 Memory Match
  plays (reusing "Mini-games" from this same session), then donated to the
  300-XP/3-AZN campaign → `newBalanceAzn: 17` (20 − 3, confirming the
  real formula), with the transaction list showing both the "in" grant and
  the "out" donation newest-first; a second disposable family's token
  against the first family's child → 403 on every child-keyed endpoint; no
  token → 401. `tsc -b` and `oxlint` are clean on every changed frontend
  file — live-UI click-through wasn't possible this round, same Node 18
  vs. `rolldown` blocker as every frontend round since "Admin accounts".
  Test families and their rows (`wallet_transactions`, `game_results`,
  `xp_transactions`, `children`, `parents`, `families`) deleted from Neon
  afterward via a disposable cleanup script that never printed the
  connection string; the seeded 2-row `donation_campaigns` catalog was only
  ever read from.
- **Zero automated test coverage** on any of this
  (`DonateCommandHandler`, `GrantAllowanceCommandHandler`,
  `GetWalletBalanceQueryHandler`, `GetWalletTransactionsQueryHandler`,
  `GetDonationCampaignsQueryHandler`, `EfWalletRepository`) — same gap,
  same reason, as everything else flagged this way in this doc. Test count
  is still 44.
- ~~Worth a real click-through once the Node/environment situation is
  resolved~~ — done, in the "Vouchers and partners" round right below,
  once Node was upgraded: the balance hero, transaction history, and
  donate buttons on `/cüzdan` were confirmed live against the real
  backend, and the "Cib Pulu Göndər" card was confirmed to actually move
  the balance (0.00 → 5.00 → 2.00 AZN after a donation).

### Vouchers and partners

Requested explicitly: "after redeeming something it should give a QR
code. And we should create an admin panel for partners as well. and when
they scan this qr it should show all the details." Scoped with the user
up front across three questions: (1) QR vouchers apply to **both** Leagues
reward redemptions and Wallet donations, not just one; (2) a partner can
**view details and mark a voucher as collected/fulfilled**, not just
read-only; (3) partner accounts are **seeded demo accounts**, same "no
admin management UI yet" shape as every other catalog in this backend, not
a real admin-managed CRUD. This is also the first round built after the
Node 18 vs. `rolldown` environment blocker was resolved (the user upgraded
via `nvm`), so — unlike every round since "Admin accounts" — this one was
verified through the real, running frontend end-to-end, not curl alone.

```
POST /api/partners/login
  { email, password }
  -> 200 { partnerId, name, email, token }
  -> 401 on a wrong email/password

GET  /api/partners/vouchers/{code}   [Bearer partner token]
  -> 200 { id, code, childName, title, sourceType, status, createdAt, fulfilledAt }
  -> 404 if the code doesn't exist
  -> 403 if the voucher belongs to a different partner

POST /api/partners/vouchers/{code}/fulfill   [Bearer partner token]
  -> 200 { ...same shape, status: "fulfilled" }
  -> 404/403 as above
  -> 409 if already fulfilled
  -> 409 if this is a reward-sourced voucher and the redemption isn't "approved" yet
```

- **New domain, `Partner`/`Voucher`** (`Domain/Entities/Partners/PartnerEntities.cs`,
  migration `AddPartnersAndVouchers`). `Partner` is a real-world business
  (the bookstore, the ice cream shop, the park, the toy store, or one of
  the two sponsor banks) with its own login — a third account type
  alongside family and admin, with its own disjoint JWT claim
  (`JwtAuthTokenService.PartnerIdClaimType`), so a parent's or admin's
  token can never satisfy a partner endpoint and vice versa. `Voucher` is
  the QR-scannable receipt for one redemption or donation: `Code` (what's
  actually encoded in the QR, rendered client-side — a 10-character code
  from a 32-symbol alphabet minus visually ambiguous characters, ~50 bits
  of randomness, no collision-retry logic since the odds against the
  unique index on `Code` are astronomically low), `ChildId`, `PartnerId`,
  `SourceType`/`SourceId` (the same ledger-correlation shape
  `XpTransaction`/`WalletTransaction` already use — pointing at the
  `RewardRedemption` or `WalletTransaction` row this voucher is a receipt
  for), `Title`, `Status` (`"pending"`/`"fulfilled"`), `CreatedAt`,
  `FulfilledAt`.
- **`Reward`/`DonationCampaign` both gained a nullable `PartnerId`** — a
  catalog item with no partner yet simply never gets a voucher created for
  it. Since the existing seed blocks only insert when their whole table is
  empty (and the real `rewards`/`donation_campaigns` rows already existed
  from earlier rounds), a **separate backfill step** runs every startup
  alongside the six-partner seed: it matches each existing row to its
  partner by title/sponsor name and sets `PartnerId` where still null —
  without this, every pre-existing reward/campaign would be permanently
  stuck voucher-less.
- **Six demo partner accounts are seeded idempotently at startup** (own
  email, shared password) — same "no admin management UI yet" shape every
  other catalog in this backend already has, just for accounts instead of
  catalog rows: "Libra Kitab Mağazası", "Bambini Dondurma", "Gənclik
  Parkı", "ToyWorld Mağazası" (the four Reward partners — the reward's own
  title already names the business), "PASHA Bank", "Kapital Bank" (the two
  DonationCampaign sponsors). All six share one openly-documented demo
  password, `Partner_Demo_2026!` — unlike the real seeded Admin account's
  password, deliberately **not** kept secret, since these are synthetic
  demo accounts built for exercising this feature, not real deployment
  credentials.
- **`RedeemRewardCommandHandler`/`DonateCommandHandler` both gained a
  `IVoucherRepository` dependency**: right after writing their own primary
  record (the `RewardRedemption`/`WalletTransaction`), they create a
  `Voucher` *only if* the reward/campaign has a `PartnerId` set, and return
  the new `VoucherCode` in their own response DTO (`RewardRedemptionDto`/
  `DonationResultDto` both gained a nullable `VoucherCode`, defaulting to
  null everywhere except these two handlers' own direct construction — a
  parent reviewing the pending-redemptions list doesn't need to see a
  child's QR code, only the child who just redeemed does).
- **`FulfillVoucherCommandHandler`'s one real gate**: a reward-sourced
  voucher (`SourceType == "reward_redemption"`) additionally requires the
  underlying `RewardRedemption.Status == "approved"` — looked up via the
  already-existing `IRewardRepository.FindRedemptionWithRewardAsync` — so a
  partner can't hand over a physical reward before a parent has actually
  approved it, which would defeat the whole point of that approval step. A
  donation-sourced voucher has no such gate: `Donate` is already instant/
  always-confirmed, so there's nothing to wait on. Verified live (see
  below): attempting to fulfill a reward voucher before approval correctly
  409s with "hasn't been approved by a parent yet"; the same voucher
  fulfills successfully the moment a parent approves it from Settings.
- **Frontend**: new `src/lib/partnerService.ts` (`loginPartner`/
  `fetchVoucher`/`fulfillVoucher`), `src/store/usePartnerStore.ts` (a third
  persisted Zustand store, parallel to `useAppStore`/`useAdminStore` — a
  different persona, not a parent/child or an admin), `src/pages/
  PartnerLoginPage.tsx` (mirrors `AdminLoginPage.tsx`'s visual style
  exactly), `src/pages/PartnerDashboardPage.tsx` (manual code entry +
  `src/components/QrScanner.tsx`, a thin wrapper around `html5-qrcode`'s
  own `Html5QrcodeScanner` — it renders its own full camera-permission/
  picker UI, so the wrapper only owns the mount/unmount lifecycle), and
  `src/components/ui/VoucherQrModal.tsx` (shared by `LeaguesPage.tsx`'s
  `confirmRedeem` and `WalletPage.tsx`'s `handleDonate` — renders the real
  `voucherCode` via `qrcode.react`'s `QRCodeSVG`). New routes
  `/tərəfdaş-giris`/`/tərəfdaş`, gated by a new `RequirePartnerAuth` in
  `Guards.tsx`, same shape as `RequireAdminAuth`.
- **The QR encodes the bare code, not a URL** — there's no stable deployed
  origin for this app yet (see root `CLAUDE.md`'s "Deployment history"
  notes), so a phone camera app opening a link isn't a workable pattern
  here; a partner instead looks the code up through their own
  `PartnerDashboardPage.tsx` (camera scan via `html5-qrcode`, or manual
  entry — both call the same `fetchVoucher`). Worth revisiting once/if this
  app has a real deployed URL: the QR could then encode a direct link to a
  partner-facing lookup page, skipping the manual "open the app, then
  scan/type" step.
- **Deliberately not built**: automatic AZN credits tied to a league-tier
  change or a weekly streak are still out of scope (unchanged from
  "Wallet" above — unrelated to this round); a real admin-managed CRUD for
  partner accounts (add/edit/deactivate a partner, same shape "Admin
  account directory" below gives family accounts) — six seeded accounts
  were explicitly chosen over this; liking a comment and nested reply
  display in Social (unchanged, from "Social" above).
- **Verified live through the real running frontend, not curl alone** —
  the first round able to do this since the Node 18 vs. `rolldown`
  blocker was resolved: signed up a disposable test family through the
  actual signup form, added a child, earned real XP via `Games` (curl, for
  speed — a real backend call either way), redeemed "Bambini Dondurma"
  through the real `/liqalar` UI and watched the real `VoucherQrModal`
  render a scannable QR with a real code; opened `/tərəfdaş-giris` in a
  second tab, logged in as that reward's real seeded partner, looked the
  code up by typing it in, confirmed fulfillment correctly 409s with the
  not-yet-approved message; switched to the first tab, approved the
  redemption from `/tənzimləmələr`'s "Mükafat Təsdiqləri" card; switched
  back to the partner tab and fulfilled successfully, confirmed the status
  flipped to "Təhvil verilib" with a real fulfillment timestamp. Separately
  donated 3 AZN to "Meşə Salma Kampaniyası" through the real `/cüzdan` UI,
  got a second real QR/code, logged out and back in as the *different*
  seeded Kapital Bank partner, confirmed cross-partner isolation (this
  partner's lookup only ever found its own voucher), and confirmed a
  donation-sourced voucher fulfills immediately with no approval gate.
  Also used the real "Cib Pulu Göndər" card to grant 5 AZN and confirmed
  the balance hero updated to the exact `sum(in) - sum(out)` result (5.00 −
  3.00 = 2.00 AZN) live in the UI, not just via curl. `dotnet test`: 44/44
  passing throughout (unchanged — this round added no backend tests, same
  reason as everything else flagged this way). Test family and all its
  rows deleted from Neon afterward via a disposable cleanup script that
  never printed the connection string; the six seeded partners and the
  backfilled `PartnerId` on the six real catalog rows were only ever read
  from.
- **Zero automated test coverage** on any of this
  (`LoginPartnerCommandHandler`, `GetVoucherQueryHandler`,
  `FulfillVoucherCommandHandler`, `EfPartnerAccountRepository`,
  `EfVoucherRepository`, the Voucher-creation additions to
  `RedeemRewardCommandHandler`/`DonateCommandHandler`) — same gap, same
  reason, as everything else flagged this way in this doc. Test count is
  still 44.

### Reward proposals

Requested explicitly: "partner can create something that can be redeemed
using xp and admin should accept it. Also admin can edit the request. In
that case it should go to the sponsor's panel. If they approve then it can
be public. ... there should be a history." Scoped with two up-front
questions: (1) a plain admin accept (no edit) publishes **immediately** —
only an edited proposal needs to go back to the partner, since the partner
already proposed those exact unedited terms; (2) a partner rejecting an
admin's edit **loops back to the admin** to revise again (not a terminal
close) — only an outright admin decline is terminal.

```
POST /api/partners/reward-proposals   [Bearer partner token]
  { title, description?, costXp, icon }
  -> 200 RewardProposalDto (status "pending_admin_review")
  -> 400 if title is blank or costXp is outside 1-5000

GET  /api/partners/reward-proposals   [Bearer partner token]
  -> 200 [ RewardProposalDto, ... ]   (this partner's own, newest first)

POST /api/partners/reward-proposals/{id}/approve   [Bearer partner token]
  -> 200 RewardProposalDto (status "approved", PublishedRewardId set)
  -> 404/403/409 (not found / not yours / not "admin_edited_pending_partner")

POST /api/partners/reward-proposals/{id}/reject   [Bearer partner token]
  { note? }
  -> 200 RewardProposalDto (status "rejected_by_partner")
  -> 404/403/409 as above

GET  /api/admin/reward-proposals[?status=]   [Bearer admin token]
  -> 200 [ RewardProposalDto, ... ]   (every partner's, newest first)

POST /api/admin/reward-proposals/{id}/accept   [Bearer admin token]
  -> 200 RewardProposalDto (status "approved", published immediately)
  -> 404/409 (not found / not "pending_admin_review" or "rejected_by_partner")

POST /api/admin/reward-proposals/{id}/edit   [Bearer admin token]
  { title, description?, costXp, icon }
  -> 200 RewardProposalDto (status "admin_edited_pending_partner")
  -> 404/409/400 (not found / already terminal / bad fields)

POST /api/admin/reward-proposals/{id}/decline   [Bearer admin token]
  { note? }
  -> 200 RewardProposalDto (status "declined_by_admin", terminal)
  -> 404/409 as above
```

`RewardProposalDto` always includes `events: [{ eventType, actorType, note,
occurredAt }, ...]`, oldest first — the explicitly requested "there should
be a history" is satisfied by that on every response, not a separate
endpoint.

- **New entities, `RewardProposal`/`RewardProposalEvent`**
  (`Domain/Entities/Partners/PartnerEntities.cs`, migration
  `AddRewardProposals`). The full state machine (see `RewardProposal`'s own
  doc comment and `RewardProposalStatus`):
  `pending_admin_review` → admin **accepts** (→ `approved`, publishes
  immediately) or **edits** (→ `admin_edited_pending_partner`) or
  **declines** (→ `declined_by_admin`, terminal); from
  `admin_edited_pending_partner` the partner **approves** (→ `approved`,
  publishes) or **rejects** (→ `rejected_by_partner`, which the admin
  dashboard treats exactly like a fresh `pending_admin_review` — the admin
  can edit again, looping, or decline outright to finally close it).
  `RewardProposalEvent` is the audit trail — one row per transition,
  `EventType`/`ActorType` from `RewardProposalEventType`'s fixed set,
  `Note` carrying a human-readable diff for an edit or a free-text reason
  for a decline/rejection.
- **`Reward` gained an `AddRewardAsync`** on `IRewardRepository` — the
  catalog's four original rows are still startup-seeded, but a reward can
  now also come from a published proposal; this is the first write path
  outside that seed. `RewardProposalPublishing.BuildReward` (shared by
  `AdminAcceptRewardProposalCommandHandler` and
  `PartnerApproveRewardProposalCommandHandler` — both "publish" the same
  way) sets `Sponsor` to the partner's own `Name` and `PartnerId` to the
  proposal's partner, so a reward born this way is itself immediately
  eligible for a QR voucher on its first redemption (see "Vouchers and
  partners" above) — no separate backfill step needed, unlike the four
  original seeded rewards.
- **CostXp is bounds-checked server-side** (`RewardProposalLimits`,
  1-5000) on both submit and edit — same numeric-cap pattern as
  `WalletLimits`/`FocusLockLimits`/`FamilyHabitLimits`. A partner is
  trusted to propose a real reward, not to set an absurd cost through a
  direct API call.
- **The natural "not accept" path, not explicitly named in the request but
  built alongside Accept/Edit**: `AdminDeclineRewardProposalCommand` — the
  only sane way to close out a proposal nobody wants to pursue, since
  without it every unwanted proposal would sit in the review queue
  forever. Terminal, unlike a partner's rejection of an edit.
- **Frontend**: `src/lib/partnerService.ts` gained
  `submitRewardProposal`/`fetchPartnerRewardProposals`/
  `approveRewardProposal`/`rejectRewardProposal`; `src/lib/adminService.ts`
  gained `fetchAdminRewardProposals`/`acceptRewardProposal`/
  `editRewardProposal`/`declineRewardProposal`. `PartnerDashboardPage.tsx`
  gained a "Mükafat Təklifləri" section (a submission form + the partner's
  own proposal list, with Approve/Reject buttons appearing only while a
  proposal is `admin_edited_pending_partner`, and an expandable history per
  proposal). New `src/pages/AdminRewardProposalsPage.tsx`
  (`/idareetme-tekliflər`, linked from `AdminSidebar.tsx`) is the review
  queue — Accept/Edit/Decline per proposal, Edit opens a modal pre-filled
  with the current terms, Decline goes through a real confirm `Modal` with
  an optional reason textarea (never the browser's native `confirm()`,
  same discipline every other destructive admin action in this backend
  already follows).
- Verified end-to-end via curl with the real seeded ToyWorld/Bambini
  partners and the real admin account: submitted a proposal, confirmed the
  admin queue lists it; admin edited it (XP 350→300) and confirmed the
  diff note ("CostXp: 350 → 300") landed correctly in the event history;
  partner rejected the edit with a note, confirming the loop-back to
  `rejected_by_partner`; admin then accepted the *original* terms from
  that state, confirming a real `Reward` row was created
  (`PublishedRewardId` populated) with the full 5-event history intact;
  separately confirmed validation (`costXp: 0` → 400, blank title → 400),
  a terminal-state guard (accepting an already-declined proposal → 409),
  cross-partner isolation (a different partner's token → 403 on
  approve/reject), and auth gates (no token → 401 on the admin queue).
  **Then verified live through the real running frontend** (this and
  "Vouchers and partners" above are the only two rounds able to do this so
  far — see "The Node 18 vs. rolldown blocker is resolved" in root
  `CLAUDE.md`): submitted a real proposal from `/tərəfdaş`, watched it
  appear in `/idareetme-tekliflər`'s real queue, edited it from the real
  admin UI (XP 450→380) and confirmed the diff note rendered, approved it
  from the real partner UI and watched the status flip to "Təsdiqləndi ·
  Yayımlandı" with the full real history displayed, and separately
  declined a second real proposal through the real confirm modal (not
  `window.confirm()`) with a typed reason, confirming it correctly ended
  up in a terminal, action-less state. `dotnet test`: 44/44 passing. All
  test proposals and the one published test reward deleted from Neon
  afterward via a disposable cleanup script that never printed the
  connection string; the four original seeded rewards were never touched.
- **Zero automated test coverage** on any of this
  (`SubmitRewardProposalCommandHandler`,
  `AdminAcceptRewardProposalCommandHandler`,
  `AdminEditRewardProposalCommandHandler`,
  `AdminDeclineRewardProposalCommandHandler`,
  `PartnerApproveRewardProposalCommandHandler`,
  `PartnerRejectRewardProposalCommandHandler`,
  `GetPartnerRewardProposalsQueryHandler`,
  `GetAdminRewardProposalsQueryHandler`, `EfRewardProposalRepository`,
  `EfRewardRepository.AddRewardAsync`) — same gap, same reason, as
  everything else flagged this way in this doc. Test count is still 44.

### Admin account directory

```
GET /api/admin/families   [requires Authorization: Bearer {admin token}]
  -> 200 [{ familyId, createdAt, parents: [{ parentId, fullName, email }],
            children: [{ childId, name, gender, dateOfBirth, city }],
            deactivatedAt: null }]
  -> 401/403 same admin-gating rule as the Habits writes and content sync
```

Read-only. Deliberately never returns `PasswordHash`/`PinHash` — no reason
for even an admin view to carry those out of the database. Implemented via a
new `IFamilyAccountRepository.GetAllFamiliesWithMembersAsync` method (just an
addition to the existing Identity repository — no new abstraction needed,
unlike Habits).

**Deactivate/reactivate/edit, added in a later round** — this stopped being
listing-only:

```
GET  /api/admin/families/deactivated   [admin token]
  -> 200 — same shape as GET /api/admin/families, but every row is a
     deactivated family and deactivatedAt is always set

POST /api/admin/families/{familyId}/deactivate   [admin token]
  -> 204 — soft-deletes the Family *and* every one of its Parents and
     Children, all stamped with the same DeletedAt/DeletedBy pair
  -> 404 if familyId doesn't exist (or is already deactivated — the
     active-only lookup this uses won't find it either way)

POST /api/admin/families/{familyId}/reactivate   [admin token]
  -> 204 — undoes deactivate exactly: restores the Family and only the
     Parents/Children cascade-deactivated alongside it (matched by that
     same DeletedAt/DeletedBy stamp — something deactivated separately,
     before or after, would stay deactivated; nothing in this slice
     actually creates that case today, but EfFamilyAccountRepository treats
     it the same careful way SoftDeletePlaylistAsync/RestorePlaylistAsync
     already do for playlists/videos)
  -> 404 if familyId doesn't exist or isn't currently deactivated

PATCH /api/admin/parents/{parentId}   [admin token]
  { fullName }
  -> 204
  -> 400 if fullName is blank after trimming
  -> 404 if parentId doesn't exist (or is currently deactivated)

PATCH /api/admin/children/{childId}   [admin token]
  { name, city }
  -> 204
  -> 400 if name or city is blank after trimming
  -> 404 if childId doesn't exist (or is currently deactivated)
```

- **Deactivating a family needed no bespoke "is this account active" check
  anywhere else in the backend** — every endpoint that touches a family's
  data already resolves it through `Family`/`Parent`/`Child`, all three
  `ISoftDeletable`, all three already behind `SimartDbContext`'s global
  query filter. Soft-deleting all three cascades the *consequences* for
  free: `LoginFamilyCommandHandler`'s `FindParentByEmailAsync` stops
  finding the parent (401, same anti-enumeration message as a wrong
  password — doesn't leak "this account was deactivated"), and
  `AddChildCommandHandler`'s `FamilyExistsAsync` stops finding the family
  (404). No new "is active" flag, no new check sprinkled through Identity,
  Habits, Focus, Leagues, or Social — the existing soft-delete filters,
  applied consistently, already were the enforcement.
- **A real, pre-existing-class-of-bug nearly repeated, caught before it
  shipped**: `GetDeactivatedFamiliesWithMembersAsync`'s first draft used
  `.Include(f => f.Parents).Include(f => f.Children)` after
  `.IgnoreQueryFilters()` on the outer `Families` query — the exact same
  "`IgnoreQueryFilters()` silently suppresses the filter for every entity
  reference EF Core compiles into that one query" gotcha already flagged
  in "YouTube content sync" above for `GetDeletedPlaylistsAsync`'s
  subquery, just via an `Include` this time instead of a correlated
  subquery. Here it would have been *harmless by coincidence* (every
  Parent/Child under a deactivated Family is always deactivated too, so
  nothing unrelated would've leaked through) rather than an actual bug,
  but the fix — loading each family's own cascaded members via an explicit
  `.Where(p => p.FamilyId == family.Id)` query instead of `.Include()` —
  was made anyway, so this doesn't rely on getting lucky if the cascade
  invariant ever stops holding.
- **Edit is deliberately narrow**: a parent's `FullName` and a child's
  `Name`/`City` only — never email or password (the login identifier and a
  security-sensitive credential respectively, both needing their own
  verified-change flow if ever built, not an admin overwrite) and never a
  child's `AvatarEmoji`/`Gender`/`DateOfBirth` (fixing a typo in a name or
  city is the realistic case this covers, not re-profiling a child).
- Verified end-to-end via curl with a disposable test family: confirmed
  the family in the active list, deactivated it (204), confirmed it
  vanished from the active list and appeared in the deactivated one with
  `deactivatedAt` set and its one child still attached; confirmed the
  cascade's real teeth — the deactivated parent's own login now 401s
  (same message as a wrong password) and adding a second child to the
  deactivated family now 404s; a repeat deactivate (already deactivated)
  → 404; reactivating a bogus/never-deactivated familyId → 404; reactivated
  for real → 204, back in the active list with its child correctly
  reattached, and login works again. Then edited the parent's `fullName`
  and the child's `name`/`city` (including Azerbaijani diacritics,
  confirmed intact afterward) → 204 each; a blank name → 400; a bogus
  parentId → 404; a family parent's own token (not an admin's) attempting
  an edit → 403. Test family and all its rows deleted from Neon afterward.
- **Not verified live through the actual admin UI this round** — an
  unrelated environment issue (the installed `rolldown`, which `vite@8.x`
  depends on for both `npm run dev` and `npm run build`, requires Node
  ^20.19/>=22.12; the machine this was built on had Node 18.20.8 active
  with no way to switch it that day) blocked running the frontend at all.
  Every endpoint above was verified via curl exactly as described; `tsc -b`
  and `oxlint` are both clean on the new/changed frontend files
  (`AdminAccountsPage.tsx`, `adminService.ts`). Worth an actual click-through
  the next time the frontend can run, to confirm the tab switch, the
  confirm-before-deactivate modal, and the inline parent/child edit rows
  all behave as designed, not just that the API they call is correct.
- **Zero automated test coverage** on any of this
  (`DeactivateFamilyCommandHandler`, `ReactivateFamilyCommandHandler`,
  `UpdateParentCommandHandler`, `UpdateChildCommandHandler`,
  `GetDeactivatedFamiliesQueryHandler`, and the new
  `EfFamilyAccountRepository` methods) — same gap, same reason, as
  everything else flagged this way in this doc. Test count is still 44 —
  the in-memory `InMemoryFamilyAccountRepository` test fake needed the five
  new interface methods implemented just to keep the *existing* 44 tests
  compiling (interface extended, not test coverage added), same situation
  `GetChildrenByIdsAsync` was in for "Social" above.

### Admin auth

```
POST /api/admin/login
  { email, password }
  -> 200 { adminId, fullName, email, token }
  -> 400 if email/password missing
  -> 401 on wrong email or wrong password — same message either way, same
     anti-enumeration reasoning as the family login endpoint
```

Mirrors the Identity slice's login exactly — `IAdminAccountRepository`,
`LoginAdminCommand`/`LoginAdminCommandHandler`,
`IAuthTokenService.IssueAdminToken` (implemented alongside
`IssueFamilyToken` in the same `JwtAuthTokenService`, both just call a
shared private `BuildToken` now) — **except there's no `SignUpAdminCommand`
to pair with it.** Self-service admin creation would be a real backdoor, not
a bridging convenience, so there's deliberately no `POST /api/admin/signup`.
Instead, exactly one admin (`admin@simart.az`, a real password set by the
project owner — deliberately not written down in this file, which ships
with the repo) is seeded idempotently at application startup, directly in
`Program.cs` right after the middleware pipeline is built: it checks whether
that email already exists and inserts it (PBKDF2-hashed via the same
`IPasswordHasher` everything else uses) only if not. This runs on *every*
startup, not just the first — a database reset (new Neon branch, a wiped
dev database, etc.) gets the admin row back automatically next time the API
boots, with no manual re-seeding step. It never touches an existing row, so
changing the password by hand later (direct SQL, or a future admin-settings
page) sticks across restarts too.

**Admin tokens carry a disjoint claim from family tokens** — `adminId`
(`JwtAuthTokenService.AdminIdClaimType`), not `familyId` — specifically so a
parent's token can never satisfy an admin-only endpoint (or vice versa)
just by both being valid, signed JWTs from the same signing key. Every
endpoint that needs this checks `user.FindFirstValue(AdminIdClaimType) is
null -> Results.Forbid()` after `.RequireAuthorization()`, the identical
style the family-ownership checks on `AddChild`/`GetChildren` already use —
no ASP.NET Core authorization-policy builder was introduced just for this.
**Now actually admin-gated**: `POST /api/content/sync`, both Habits writes,
`GET /api/admin/families`. Verified end-to-end via curl: no token -> 401 on
all four; a freshly-signed-up family's own token -> 403 on all four (proving
a parent token can't reach them); the seeded admin's token -> 200 on all
four; wrong admin password -> 401. Also verified live through the actual
admin UI — login, "Playlistləri Sinxronlaşdır", creating a habit category +
task, and the accounts directory all round-tripped correctly with the real
token the frontend now carries in `useAdminStore`.

**`LoginAdminCommandHandler`/the admin-gating checks in `Program.cs` have
zero automated test coverage** — built and verified by hand (curl + the
live admin UI), at the same explicit user direction to deprioritize more
test-writing that the Habits slice, `GET /api/admin/families`, and
`GetChildren` already had. Test count is still 44.

## Layout

```
src/
  SimartBackend.Domain          Content/: Playlist, PlaylistVideo, Audience — the value
                                 types IPlaylistCatalog returns (no dependencies).
                                 Entities/: the 22-table persistence model (see below).
  SimartBackend.Application     CQRS: GetPlaylistsQuery,
                                 SignUpFamilyCommand, LoginFamilyCommand, AddChildCommand,
                                 GetChildrenQuery, GetFamiliesQuery, GetHabitCategoriesQuery,
                                 CreateHabitCategoryCommand, AddHabitTaskCommand,
                                 LoginAdminCommand, GetNewContentQuery, AssignVideoCommand,
                                 DeleteVideoCommand, CreatePlaylistCommand, DeletePlaylistCommand,
                                 GetDeletedPlaylistsQuery, GetDeletedVideosQuery —
                                 DTOs, the IPlaylistCatalog/IYouTubeContentSource/
                                 IContentCatalogRepository/IPasswordHasher/IAuthTokenService/
                                 IFamilyAccountRepository/IHabitCatalogRepository/
                                 IAdminAccountRepository abstractions, MediatR + logging
                                 pipeline behavior registration
  SimartBackend.Infrastructure  DbPlaylistCatalog (default IPlaylistCatalog, reads the DB),
                                 YouTubeApiContentSource (real YouTube Data API v3 calls),
                                 EfContentCatalogRepository, EfFamilyAccountRepository,
                                 PasswordHasherAdapter, JwtAuthTokenService,
                                 EfHabitCatalogRepository, EfAdminAccountRepository.
                                 Persistence/: SimartDbContext + migrations.
  SimartBackend.Api             Program.cs — DI wiring, CORS, JWT bearer auth, minimal-API
                                 endpoints, Swagger
tests/
  SimartBackend.Tests           xUnit. Identity/: the three command handlers plus
                                 PasswordHasherAdapter/JwtAuthTokenService. Content/: the
                                 query + sync command handlers plus DurationFormat. Api/:
                                 real-HTTP integration tests via WebApplicationFactory +
                                 EF Core InMemory. See "Tests" below.
```

Dependency direction: `Api -> Application, Infrastructure`,
`Infrastructure -> Application, Domain`, `Application -> Domain`. `Domain`
depends on nothing. `Application` never references `Infrastructure` directly —
it only knows `IPlaylistCatalog`, so swapping what's behind that interface
never touches a query or handler.

## Where the data actually comes from right now

`GET /api/content/playlists` reads from the Neon database (via
`DbPlaylistCatalog`), same as before. What changed is how rows get into that
database in the first place: `POST /api/content/sync` now calls the real
YouTube Data API v3 for the actual SİMART channel (see "Content" above for
the full discover → review → `POST /api/content/videos` flow) — there's no
embedded seed file left; the first 50 playlists/videos that originally
seeded the database came from one (now deleted, its job is done), everything
from here on is a real, live admin decision per video.

`EfContentCatalogRepository.AddVideoAsync` only ever inserts (one video per
confirmed review, never a bulk upsert) — a playlist the admin already has in
the database stays untouched beyond gaining one more `Video` row;
`video.sort_order` is computed as "how many videos this playlist already has"
at insert time, so new videos land at the end rather than disturbing existing
episode numbering.

`GetPlaylistsQuery`/`DbPlaylistCatalog` never had to change for any of
this — they only ever read from the database, regardless of how a row got
there.

## Database (Neon Postgres)

A real Postgres database exists, is schema-complete — 22 tables matching the
ER diagram (admin, soft delete, threaded comments, all of it) — and is now
the live source for the one endpoint that reads from it (`GET
/api/content/playlists`, via `DbPlaylistCatalog`). Everything else in the
schema (habits, wallet, leagues, games, social, focus mode) has tables but
no CQRS handlers touching them yet.

- **Project**: `simart` (id `blue-unit-44754205`), org `Kanan`
  (`org-small-forest-61476225`), Postgres 18, region `aws-us-west-2`.
- **Database**: `simart` (not Neon's default `neondb` — a dedicated one was
  created for clarity).
- **Schema**: `SimartBackend.Domain/Entities/**` (plain C# entity classes,
  grouped by domain folder — Admin, Identity, Habits, Content, Focus, Games,
  Economy, Social) + `SimartBackend.Infrastructure/Persistence/SimartDbContext.cs`
  (relationships, the soft-delete query filter + `deleted_by -> admin.id` FK
  applied generically via reflection, the `watch_progress` CHECK constraint,
  `social_comment`'s self-referencing reply FK). `EFCore.NamingConventions`
  converts everything to `snake_case` to match the diagram/Postgres convention.
- **Connection string**: stored via `dotnet user-secrets` on
  `SimartBackend.Api`, key `ConnectionStrings:SimartDb` — never committed to a
  file in this repo. To see or change it:
  ```bash
  dotnet user-secrets list --project src/SimartBackend.Api
  dotnet user-secrets set "ConnectionStrings:SimartDb" "<connection string>" --project src/SimartBackend.Api
  ```
  In other environments (CI, production), set it via the
  `ConnectionStrings__SimartDb` environment variable instead — ASP.NET Core's
  configuration binding maps `__` to the same nested key.
- **JWT signing key**: same pattern, different key — `dotnet user-secrets set
  "Jwt:SigningKey" "<random base64 string>" --project src/SimartBackend.Api`
  (`JWT__SIGNINGKEY` env var elsewhere). A fresh one was generated for this
  local setup (`python3 -c "import secrets, base64;
  print(base64.b64encode(secrets.token_bytes(32)).decode())"` — any
  sufficiently random 256-bit value works). Rotating it invalidates every
  token already issued (every signed-in parent gets logged out) since
  `JwtAuthTokenService` and the `AddJwtBearer` validation in `Program.cs` both
  read the same key.

### Gotcha: Neon + Npgsql needs `Channel Binding=Disable`

Neon's connection strings are Postgres URIs
(`postgresql://user:pass@host/db?sslmode=require&channel_binding=require`),
but Npgsql's ADO.NET connection string is keyword-based
(`Host=...;Port=...;Username=...`), so the URI can't be pasted in as-is.
Translating it straightforwardly (`SSL Mode=Require`) connects to the
**wrong** result: Npgsql's default channel-binding negotiation
(SCRAM-SHA-256-PLUS) fails against Neon's TLS-terminating proxy with
`28000: insecure connection: secure channel data mismatch` — a Postgres-level
error from Neon's own endpoint, not a bug in this code. The fix is to
explicitly add `Channel Binding=Disable`:
```
Host=<endpoint>.c-4.us-west-2.aws.neon.tech;Port=5432;Database=simart;Username=neondb_owner;Password=<password>;SSL Mode=Require;Channel Binding=Disable
```
This bit everything that connects via libpq/Npgsql during setup — the .NET
app, `dotnet ef database update`, and a plain `psycopg2` script used to
verify the schema — so it'll bite any other client connecting to this
project the same way. The connection is still TLS-encrypted; only the extra
channel-binding handshake is skipped.

### Known limitation: soft-delete query filters don't cascade

`dotnet ef migrations add`/`database update` both warn about this; it's not
blocking anything but is worth fixing before any code actually reads through
these relationships. Example: `Child` has a soft-delete query filter
(`!IsDeleted`), but `HabitCompletion` (and `GameResult`, `FocusSession`,
`XpTransaction`, `WalletTransaction`, `RewardRedemption`, `PostLike`,
`CommentLike`, and `Video` via `WatchProgress`) don't — so a query that
`Include()`s a soft-deleted `Child` from one of those tables will silently
get a null navigation instead of the (deleted) child. Fix, when it matters,
is giving each dependent entity a matching filter, e.g.
`modelBuilder.Entity<HabitCompletion>().HasQueryFilter(h => !h.Child.IsDeleted)`.

### Migrations

```bash
# add a new migration after changing an entity in SimartBackend.Domain/Entities
dotnet ef migrations add <Name> --project src/SimartBackend.Infrastructure --startup-project src/SimartBackend.Api --output-dir Persistence/Migrations

# apply pending migrations (uses the direct, non-pooled host — see the gotcha above for why
# Channel Binding=Disable has to be in whatever connection string you pass here too)
dotnet ef database update --project src/SimartBackend.Infrastructure --startup-project src/SimartBackend.Api
```
`dotnet ef database update` with no `--connection` flag uses
`ConnectionStrings:SimartDb` from user-secrets (the pooled host) — that
works for applying migrations too, the direct host was only used the first
time out of caution. Prefer the direct (non `-pooler`) host for any future
migration if you hit transaction-pooling issues with DDL.

## Tests

`tests/SimartBackend.Tests` — 44 xUnit tests across three layers:

- **Identity/** (17 tests, unit) — the three command handlers
  (`SignUpFamilyCommandHandler`, `LoginFamilyCommandHandler`,
  `AddChildCommandHandler`) plus `PasswordHasherAdapter` and
  `JwtAuthTokenService` directly. Built first: it's the newest code, had zero
  coverage, and carries the highest-stakes logic in the backend (hashing,
  email uniqueness, JWT issuance/validation).
- **Content/** (14 tests, unit) — `GetPlaylistsQueryHandler` (audience
  filtering, full DTO field mapping) and `DurationFormat` (parse/format/
  round-trip across YouTube's `m:ss` / `h:mm:ss` display strings — this is
  exactly what broke once already this session, as `video.sort_order`, when
  nothing preserved insertion order; the round-trip test is there so a
  similar lossy-conversion bug would fail loudly instead of silently
  shipping a wrong duration). The old `SyncPlaylistsFromSeedCommandHandler`
  test was deleted along with the command itself when the real YouTube
  Data API sync replaced it — see "Content" above;
  `GetNewContentQueryHandler`/`AssignVideoCommandHandler` have no tests of
  their own yet (see that section's coverage note).
- **Api/** (13 tests, integration) — real HTTP requests against the actual
  `Program.cs` via `WebApplicationFactory<Program>`, covering the
  signup/login/add-child endpoints' status codes, validation, and — the
  specific reason this layer exists — the add-child auth gate end to end:
  201 with a matching token, 401 with none, 403 when the token's familyId
  doesn't match the route, 404 when a (deliberately forged) token names a
  family that was never created. **That 403 check lives directly in
  `Program.cs`'s endpoint lambda, not in any command handler** — the unit
  tests above never exercise it at all, so before this layer existed, the
  single most safety-critical check in the backend (which family can write
  which child) had zero automated coverage, only manual curl/browser testing.

**Design — unit layer**: every handler depends only on interfaces
(`IFamilyAccountRepository`, `IPlaylistCatalog`, …), so each gets a small
hand-rolled in-memory fake (`InMemoryFamilyAccountRepository`,
`InMemoryPlaylistCatalog` — plain `List<T>`s or a stored value, same
contract as the real `Ef*`/`Db*` implementations) instead
of a mocking library — each interface was small enough that the fake was less
code than a Moq setup would've been, consistent with the project's general
bias against adding a dependency where a few lines does the job.
`PasswordHasherAdapter`/`JwtAuthTokenService` are used for real in the
Identity handler tests (not faked) — they're fast, pure, no I/O, so faking
them would only add indirection for no real isolation benefit.
`Identity/TestJwtConfiguration.cs` is a tiny hand-rolled `IConfiguration`
(implements just the string indexer `JwtAuthTokenService` actually calls) so
it doesn't need an ASP.NET Core host to construct in a test.

**Design — integration layer**: `Api/SimartBackendApiFactory.cs` boots the
real app and swaps `SimartDbContext`'s Npgsql registration for EF Core's
InMemory provider (a fresh GUID-named database per factory instance, so test
classes never see each other's data) — no Postgres, Neon, or Docker
involved. The swap needs more than removing the `DbContextOptions<T>`
descriptor: `AddInfrastructure`'s `UseNpgsql()` call also registers Npgsql's
own provider-marker services elsewhere in the collection, and EF Core
refuses to build a `DbContext` when two different providers' marker
services are both visible to it ("Services for database providers ... have
been registered" — hit this exact error while building this layer). The fix
is giving the in-memory provider its own isolated internal service provider
via `UseInternalServiceProvider(...)` rather than trying to surgically
remove every Npgsql registration by hand. `Program.cs` has a trailing
`public partial class Program;` specifically so `WebApplicationFactory<Program>`
can name the type — top-level statements generate an internal one by
default; this doesn't change runtime behavior.

**Not covered yet**: the `Ef*`/`Db*` Infrastructure implementations against
a *real* database (these tests prove the HTTP/DI/auth wiring works, not that
`EfFamilyAccountRepository`'s LINQ translates correctly against actual
Postgres) — that needs a disposable real-Postgres instance (Testcontainers
or similar), which doesn't exist yet. The frontend has no test setup at all.
**The Habits slice and `GET /api/admin/families` have zero automated
coverage** — built and verified by hand (curl + the live admin UI, see root
`CLAUDE.md`'s "Admin panel" section) rather than with tests, at explicit
user direction to deprioritize more test-writing for now. Same shape of gap
as Content/Identity had before their first test pass — would follow the
exact same patterns already established here (`InMemoryHabitCatalogRepository`
for the handlers, a fourth `Api/` test class for the HTTP layer) whenever
that's picked back up.

## Next steps

- ~~A frontend login page.~~ — done. `LoginPage.tsx` at `/giris`, now the
  app's default entry point, calls `loginFamily` then
  `fetchFamilyChildren` to restore the returning parent's child profile.
  See "Identity" above and "Family login" in root `CLAUDE.md`. The new
  `GET /api/identity/families/{familyId}/children` endpoint built for
  this (`GetChildrenQuery`/`GetChildrenQueryHandler`) has **zero automated
  coverage** — built and verified by hand (curl + the live frontend, see
  "Identity" above) rather than with tests, same gap and same reason as
  the Habits slice and `GET /api/admin/families` noted just above, at the
  same explicit user direction to deprioritize test-writing for now. Test
  count is still 44, not higher, as a result.
- **Token refresh / expiry handling.** Tokens last 7 days with no refresh
  flow — nothing in the frontend currently reacts to a 401 from an expired
  token (not an issue yet since the only gated call, add-child, always runs
  moments after a fresh signup token).
- ~~`POST /api/content/sync`, the two Habits writes, and
  `GET /api/admin/families` are all still unauthenticated~~ — done. See
  "Admin auth" above: `POST /api/admin/login` + an `adminId`-claimed JWT,
  checked the same manual-claim way the family-ownership checks already
  were. One seeded demo admin, no self-service signup — that part's covered
  by the "seed before any real deployment" caveat there, not left open.
- ~~Real account management, beyond listing.~~ — done for deactivate/
  reactivate/edit. See "Admin account directory" above: `POST
  /api/admin/families/{id}/deactivate`/`.../reactivate` cascade onto every
  Parent/Child under the family (the "does a deactivated family's children
  stop being able to log in" question this bullet used to ask — yes,
  automatically, via the existing `ISoftDeletable` query filters, no new
  flag needed), and `PATCH /api/admin/parents/{id}`/`children/{id}` cover
  the realistic edit case (a name/city typo). **Still not built**: a hard
  `DELETE` (this is soft-delete/deactivate only, by design — reversible),
  and editing a child's `AvatarEmoji`/`Gender`/`DateOfBirth` or a parent's
  email/password (both deliberately out of scope — see "Admin account
  directory" above for why).
- ~~Habit *completions* (`HabitCompletion` — which child did which task on
  which day) have no handlers yet~~ — done.
  `CompleteHabitTask`/`UncompleteHabitTask`/`GetHabitCompletions`, plus
  parent-created custom tasks (`CreateFamilyHabitTaskCommand`, capped at
  5/family and 10 XP/task). `HabitsPage.tsx` now reads the real catalog +
  completions when the signed-in family has a real backend child; see
  "Habits" above for the full endpoint list and "Family habits" in root
  `CLAUDE.md` for the frontend side.
- ~~Every domain beyond Content, Identity, Habits, Focus, Leagues, and
  Social (wallet, games) has tables but no CQRS handlers touching them
  yet~~ — done. Games, see "Mini-games" above; Wallet, see "Wallet" above.
  **Every domain in the original 22-table schema now has at least one real
  handler.** `ClaimsPrincipal`/familyId-from-token (see the add-child
  endpoint in `Program.cs`) was the established pattern every one of these
  rounds built on.
- ~~`WatchProgress` has no handlers; `HabitsPage.tsx`'s "Bugünkü ekran
  vaxtı" stat is still mock~~ — done. See "Watch progress sync" and "Screen
  time tracking" above (two separate mechanisms, per-video percentage vs.
  per-day cumulative seconds). Both verified via curl only — live-UI
  click-through is blocked by the Node 18 vs. `rolldown` environment issue,
  see root `CLAUDE.md`'s "Admin accounts" section.
- ~~Replace `playlists-sync-seed.json` + `SeededPlaylistCatalog` with a real
  YouTube Data API v3 sync~~ — done. See "Content" and "Where the data
  actually comes from right now" above — `POST /api/content/sync` is a real
  discover-and-review flow now, not an automatic upsert from a seed file.
  **Not done**: the first live sync found 112 new videos, only 2 of which
  were actually confirmed (one into "Tədbirlər" by curl, one "no playlist"
  via the live admin UI, both during this feature's own verification) — the
  other 110 (13 more suggested into "Tədbirlər", 97 with no suggested
  playlist at all) are sitting in the real review queue waiting on an actual
  admin decision, which is a content-curation call, not something to script
  or bulk-approve.
- New-playlist discovery isn't built — `GetNewContentQuery` only scans
  playlists already in the database (`IContentCatalogRepository.GetPlaylistSummariesAsync`),
  so if the channel starts a genuinely new playlist, its videos would surface
  as "no playlist" (`suggestedPlaylistId: null`) rather than suggesting the
  new playlist itself. Scoped out deliberately — the admin review flow only
  covers videos, per how this was asked for; creating playlists through the
  same UI is a separate, not-yet-asked-for step.
- Fix the soft-delete query filter gap above before anything does an
  `Include()` across one of the affected relationships.
- Test coverage now spans handlers and the HTTP/auth layer (see "Tests"
  above) — still missing: the `Ef*`/`Db*` Infrastructure implementations
  against a real database (needs Testcontainers or similar, not just more
  fakes), and the entire frontend, which has no test setup at all.
- ~~The Node 18 vs. `rolldown` environment issue blocking `npm run dev`/
  `build`, and live-UI verification for every frontend round since "Admin
  accounts"~~ — resolved: the user upgraded Node via `nvm` (now v24).
  "Vouchers and partners" and "Reward proposals" above are the first two
  rounds to verify their own frontend work through the real running app
  rather than curl alone — a real backlog item, not addressed
  retroactively: the "Admin accounts", "Screen time tracking and real
  watch-progress sync", "Mini-games", and "Wallet" rounds' own frontend
  changes are still only curl/`tsc`/`oxlint`-verified, each flagged in its
  own section above as worth a real click-through, and that's still true —
  only these two rounds' own new work got the live pass, not a
  retroactive sweep of the earlier ones.
- ~~Requested explicitly: QR codes on redemption, a partner panel, scan-to-
  view-details~~ — done. See "Vouchers and partners" above: `Partner`/
  `Voucher`, six seeded demo partner accounts, `POST /api/partners/login`,
  `GET`/`POST .../vouchers/{code}[/fulfill]`. **Deliberately not built**:
  a real admin-managed CRUD for partner accounts (seeded six were chosen
  over this), and QR-encodes-a-real-URL (there's no stable deployed origin
  yet to encode).
- ~~Requested explicitly: a partner can create a reward proposal (XP-
  redeemable), admin accepts/edits it, an edit goes back to the partner's
  panel, approving publishes it, and there should be a history~~ — done.
  See "Reward proposals" above: `RewardProposal`/`RewardProposalEvent`,
  the full accept/edit/approve/reject state machine, `IRewardRepository
  .AddRewardAsync` as the catalog's first non-seed write path. **The
  natural "decline outright" action was added alongside Accept/Edit even
  though it wasn't explicitly named** — without it, an unwanted proposal
  would sit in the review queue forever.
