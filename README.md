# FCOS — Firmament Core Operating System

A fake in-browser operating system by **S.K.AM Advanced Magitechnologies**.
Built with Next.js (App Router) + Tailwind v4, deployable to Vercel as-is.

## Run it

```bash
npm run dev
```

Boot sequence → login (any credentials work for now) → desktop.
First visit plays the full boot; return visits fast-boot (flag in localStorage).
Press any key during boot to skip.

## What's inside

| Piece | Where | Notes |
| --- | --- | --- |
| Boot / login / desktop shell | `components/FCOS.tsx`, `components/os/` | Phase state machine |
| Window manager | `components/os/Desktop.tsx`, `Window.tsx` | Drag, stack (z-order), minimize, close; minimized windows stay mounted so app state survives |
| Taskbar | `components/os/Taskbar.tsx` | Running apps, volume slider popover, clock + date, logout |
| Sound | `lib/sound.ts` | WebAudio-synthesized click/chime/error, volume persisted to localStorage |
| App registry | `lib/apps.tsx` | Add new apps here |
| Fake browser ("AetherNet") | `components/apps/BrowserApp.tsx` | URL allowlist → fake sites; unknown real URLs get an iframe attempt (many sites block framing) |
| Fake sites | `data/sites.tsx`, `components/apps/sites/` | `purrfect.aet` (demo cat page), `gildedkey.aet` (real estate) |
| Real estate app ("Gilded Key") | `components/apps/RealEstateApp.tsx` | Also served as a website inside the browser |
| NPC dossiers ("Profiles") | `components/apps/PeopleApp.tsx` | Portrait, age/gender/workplace, residence hidden until `homeKnown`, per-NPC notes autosaved to localStorage |
| Data layer | `lib/data.ts` | All reads are async — swap in Firestore/RTDB/Vercel KV here without touching apps |
| Placeholder content | `data/npcs.ts`, `data/listings.ts` | NPC roster and property listings |

## Adding an app

1. Build a component under `components/apps/` (it renders inside a window).
2. Pick or add an icon in `components/os/icons.tsx`.
3. Append an entry to `APP_LIST` in `lib/apps.tsx`.

It appears on the desktop and taskbar automatically.

## Adding a fake website

1. Build a page component under `components/apps/sites/`.
2. Register it in `data/sites.tsx` with every URL that should resolve to it.

## Swapping in a real backend

`lib/data.ts` is the only file that knows where data lives. Replace the
bodies of `fetchNPCs` / `fetchListings` (and move notes off localStorage if
cross-device persistence is wanted) with Firestore / Realtime Database /
Vercel KV calls; the app components already treat everything as async.
