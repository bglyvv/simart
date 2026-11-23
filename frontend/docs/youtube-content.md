# YouTube content reference

Source of truth for `src/data/playlists.json`. Pulled live from the channel
on 2026-10-12 using browser automation (not the YouTube Data API — no API
key was available in that session). If anything here looks stale, re-check
against the channel directly.

**Channel**: https://www.youtube.com/@Simartaz (handle `@Simartaz`, ~6.8K
subscribers, 164 videos total across all uploads)

**Playlists page**: https://www.youtube.com/@Simartaz/playlists

## The audience tag is ours, not YouTube's

YouTube playlists have no concept of "this is for parents" vs "this is for
kids." The `audience` field on each playlist in `playlists.json` is an
app-level decision the user made explicitly, not something read from
YouTube. A real backend integration needs its own mapping table
(`youtubePlaylistId -> audience`) — see `CLAUDE.md`'s Content system section.

## The 5 collections, as they exist on the channel today

| Playlist / podcast title | YouTube ID | Type | Video count (real) | Video count (captured) | Audience tag |
|---|---|---|---|---|---|
| Valideyn Bələdçisi | `PLgBu2SwaPp7PMG8--4SqfrHZLA3FpOIYQ` | **Podcast** (not a classic playlist) | 12 | 12 ✅ | `parent` |
| AI - süni intellekt | `PLOh9ddbI6d68` | Playlist | 2 (1 unavailable on YouTube) | 1 ✅ | `child` |
| 3D animasiyalar | `PLgBu2SwaPp7MbKMfViA02Hq3oHRgV3N9Z` | Playlist | 2 | 2 ✅ | `child` |
| Hekayələrin sehri - illustrativ Animasiyalar | `PLgBu2SwaPp7OE2z2fOKjLixcaM6Fhh15U` | Playlist | 35 | 34 ⚠️ (one didn't load) | `child` |
| Tədbirlər | `PLgBu2SwaPp7Px0hnchHVSNqugUAGp_mnv` | Playlist | 15 | **1** ⚠️⚠️ (incomplete — see below) | `child` |

Note: "Valideyn Bələdçisi" shows a "View full podcast" link on the channel
page instead of "View full playlist" — YouTube's UI treats podcast-type
playlists slightly differently, but the playlist ID works the same way for
embedding/linking purposes.

## Known gap: "Tədbirlər"

This playlist's video list would not render in the automated browser session
no matter how much scrolling/waiting was tried (likely a client-side
rendering quirk specific to that page at the time, not a fundamental
blocker). Only one video ID was recovered (`eLop5dJ-y6k`), with no title.
**`playlists.json` currently has a 1-item stub for this playlist with a
placeholder title** ("Tədbirlər (başlıq alınmadı)" — title not retrieved).

To fix properly: either re-run browser automation against
`https://www.youtube.com/playlist?list=PLgBu2SwaPp7Px0hnchHVSNqugUAGp_mnv`
(try scrolling the actual inner scroll container, not `window`, or hit the
YouTube Data API's `playlistItems.list` directly if an API key is available
by then), or have the user hand over the real list of 15 titles/links.

## Full video list actually captured

All `duration` strings are exactly as YouTube displays them (`m:ss`,
`mm:ss`, or `h:mm:ss`) — parse with `parseDurationToSeconds` in
`src/lib/contentService.ts`, which handles all three shapes.

### Valideyn Bələdçisi (parent) — 12 episodes, full real data

| # | YouTube ID | Title | Duration |
|---|---|---|---|
| 1 | `l-2JxduEzBs` | Övladımı ekranın zərərlərindən necə qoruyum? (Ceyran Əhmədova) | 42:19 |
| 2 | `NketcI9JYZ0` | Sevgi olmadan övlad tərbiyəsi mümkündürmü? (Yasəmən Səmədova) | 1:16:08 |
| 3 | `2dh7iZikAv0` | Övladımı sağlam görmək istəyirəm (Səbinə Nurəliyeva) | 1:47:17 |
| 4 | `ZktLNW6X0Hs` | Təhsildə ilk addımlar: Valideynlər nələrə diqqət etməli? (Günel Əkbər) | 1:15:18 |
| 5 | `uCaOl-1-gfo` | Uşaqlarda intellektual inkişaf və öyrənmə həvəsi (Rövşən Abdullaoğlu) | 1:31:16 |
| 6 | `_RMhRuxDOCI` | Uşaqların asudə vaxtının səmərəli idarə olunması (Hüseyn Həsənov) | 1:29:25 |
| 7 | `ldMkrBQadcw` | Uşaq tərbiyəsində cəza, yoxsa mükafat? (Elmir İsgəndərov) | 1:33:03 |
| 8 | `ystwPHzxV58` | Mütaliə: Uşaq zəkasının gizli mühərriki (Fatimə Alxaz & Pərviz Seyidli) | 1:05:45 |
| 9 | `gPy-flWigos` | Övlad tərbiyəsində azadlığın sərhədləri haradan keçir? (İlqar Kamil) | 1:26:57 |
| 10 | `NkghPiSZmcA` | Övladımın bu davranışı normaldırmı? (Yasəmən Səmədova) | 1:01:30 |
| — | `CdQN_e-2JEU` | SİMART / Valideyn Bələdçisi (tanıtım klip) | 0:09 |
| — | `pZVF8A00d-c` | Övladınıza nə qədər azadlıq verməlisiz? (İlqar Kamil, qısa klip) | 1:37 |

### AI - süni intellekt (child) — 1 of 2 (1 unavailable on YouTube)

| YouTube ID | Title | Duration |
|---|---|---|
| `GPuoqqKu2D8` | "İgid şahin" — Sİ animasiya #01 | 6:59 |

### 3D animasiyalar (child) — 2 of 2, complete

| YouTube ID | Title | Duration |
|---|---|---|
| `3wRcQdclz2Y` | "Şəhidlər ölmür" — 3D animasiya #01 | 7:52 |
| `-BB--2LyXcA` | "Tikanlı Kol" — 3D animasiya #02 | 7:51 |

### Hekayələrin sehri - illustrativ Animasiyalar (child) — 34 of 35

Episode numbers #34 and #35 did not load; everything else did, including
#36 (the channel's numbering has a gap/renumber somewhere — not an error on
our side).

| # | YouTube ID | Title | Duration |
|---|---|---|---|
| 1 | `G5St7aG7FO8` | Kitab, dəftər və qələm | 9:09 |
| 2 | `t9frl3-smcg` | Duz | 8:47 |
| 3 | `A6BwnK6NT8g` | İçərişəhərin sirli sakini | 16:37 |
| 4 | `-0rYqKo7nXA` | Kərpickəsən qocanın hekayəsi | 6:00 |
| 5 | `LBxmmcNxl_c` | Əhmədin dostları | 19:38 |
| 6 | `DIEP-VlEmuY` | Ərik ağacı | 7:48 |
| 7 | `ZDGSFbOVQOQ` | Şahidlər | 9:53 |
| 8 | `r2vPrX0LGhY` | Qara kəmər | 10:14 |
| 9 | `PObnOoC99dU` | Arılar kimi bax | 12:59 |
| 10 | `FwQMTSLzh_4` | Gümrahlığın sirri | 8:04 |
| 11 | `aPJz-AaAYt8` | Məstan pişik | 17:13 |
| 12 | `_M0XQtXy-7c` | Çəyirdək əhvalatı | 11:58 |
| 13 | `ew59Chj68Fs` | Mustafanın buludu (1-ci hissə) | 10:59 |
| 14 | `DJDIusmWQRM` | Mustafanın buludu (2-ci hissə) | 14:17 |
| 15 | `YDPI_Dx5wdY` | İki daş | 8:05 |
| 16 | `bJ0pdoBopBY` | Humay ananın oğulları | 19:12 |
| 17 | `SDfuQEQVpEg` | Yaşıl çərpələng | 12:46 |
| 18 | `jzVd0TZWo_U` | Təranənin arzusu | 7:24 |
| 19 | `p13UZyPA-hI` | Dünyanın ən gözəl fikri | 12:10 |
| 20 | `5No4E-QBGNE` | Tısbağanın yolu | 19:40 |
| 21 | `1tVKfMVDRZQ` | Səhra çiçəyi | 7:43 |
| 22 | `WPkZED19zxw` | Balaca qardaş | 9:50 |
| 23 | `pfWBqz6hzEg` | Xoşbəxtliyin mənası | 5:51 |
| 24 | `ea-gpc-QAl4` | Əsl çempion | 10:53 |
| 25 | `yyfFtxOTs_c` | Sarı fırça | 9:10 |
| 26 | `AnkS9JjMdhs` | Yaxşılıq | 8:30 |
| 27 | `XvVc6KUGgIE` | Orxanın sərgüzəştləri (Niyə mən) | 11:34 |
| 28 | `mtVGvlULXaI` | Orxanın sərgüzəştləri (Əzizimiz Orxan) | 8:06 |
| 29 | `Ru0RLMU3MH0` | Heyva ağacı | 8:54 |
| 30 | `foWckGHAcy8` | Ən gözəl muzey | 10:13 |
| 31 | `kJSYiaS1trE` | Kaktusun fədəkarlığı | 13:14 |
| 32 | `R-TZv7DmNb4` | Vaxtsız banlayan xoruz | 6:38 |
| 33 | `3F5scR9ySoE` | İnşa müsabiqəsi | 9:17 |
| 36 | `GNEB9xkwVm8` | Sirli gecikmə | 12:06 |

### Tədbirlər (child) — 1 of 15 (incomplete, see "Known gap" above)

| YouTube ID | Title | Duration |
|---|---|---|
| `eLop5dJ-y6k` | (title not retrieved) | unknown |
