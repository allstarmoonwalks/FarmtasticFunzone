# Farmtastic Fun Zone — Project Handoff

_Last updated: 2026-08-25_

This document lets any person or AI tool pick up this project where it was left
off. Read this first, then `INSTRUCTIONS.md` for how to build/edit/deploy.

---

## 1. What this project is

A brand-new, hand-coded **static website** for **Farmtastic Fun Zone** — a
traveling agricultural-education experience (booths/attractions) for fairs and
rodeos across Texas. It is replacing the owner's old **Wix** site at
**www.farmtasticfunzone.com**.

- **No framework, no build step.** Plain HTML + one shared `styles.css`. Open
  any `.html` file in a browser and it just works.
- **Owner / contacts:** April and Steve. Phone 936-223-1433,
  farmtasticfunzone@gmail.com, Montgomery, Texas (statewide travel).
- **Tagline:** "Sowing Wisdom for the Harvest."

## 2. Current status

**Done**
- 7-page site built: Home, Attractions, Pricing, Photos, Videos, About, Contact.
- Content + pricing sourced from the owner's GroovePages draft and a print flyer.
- Attractions page = the 11 stations from the flyer (headline, category, ages, description).
- Real brand logo in header/footer (traced from the flyer — see Decisions).
- Real photos wired into Home, Photos, and About (optimized, committed to Git).
- Videos page with a placeholder slot per attraction (awaiting real Vimeo links).
- Git repo initialized; ready to push to GitHub and deploy on Netlify.

**In progress / not done — see TODO (section 7). All videos are now live (2026-08-25); remaining items: go live on GitHub/Netlify/domain, optional per-attraction photos.**

## 3. Tech + structure

Static HTML/CSS. One page = one `.html` file. The header nav and footer are
**duplicated in every page** (no includes), so a nav/footer change must be made
in all 7 files. Shared look lives in `styles.css` (design tokens in `:root`).

```
index.html      Home            styles.css      all styling (CSS custom props in :root)
booths.html     Attractions     images/         logos + curated web photos (see below)
pricing.html    Pricing         README.md       repo readme + deploy quickstart
photos.html     Photo gallery   HANDOFF.md      this file
videos.html     Videos          INSTRUCTIONS.md how to edit/deploy/add content
about.html      About & Mission netlify.toml    Netlify config (no build, publish = ".")
contact.html    Contact/booking
```

## 4. Hosting & deploy (the plan)

- **Repo:** `git@github.com:allstarmoonwalks/FarmtasticFunzone.git` (owner's GitHub).
- **Host:** Netlify, connected to that GitHub repo → auto-deploy on every push.
  `netlify.toml` already sets build command = empty, publish directory = ".".
- **Domain:** farmtasticfunzone.com (currently on Wix). After the site is live on
  Netlify, point the domain's DNS at Netlify, then retire the Wix site. The domain
  is kept regardless of host.
- Full commands are in `README.md` / `INSTRUCTIONS.md`.

## 5. Photos

- The site uses **13 curated, web-optimized images** in `images/` (named by
  meaning, e.g. `hero-kids-planting.jpg`, `saddle-up.jpg`, `scarecrow.jpg`).
- The owner also dropped their **entire Wix media library** (~35 raw files, hash
  names, some duplicates + AI-generated logos + a screenshot) into `images/`.
  Those raw files are **git-ignored** (see `.gitignore`) so they do NOT bloat the
  repo or Netlify deploy. Only the curated names + logos are tracked.
- The owner can safely delete the raw dump from `images/` locally at any time; the
  tracked curated copies are independent.

## 6. Key decisions & open questions

- **Visual redesign — DONE (2026-08-25):** full "Vintage County Fair" restyle applied
  site-wide via `styles.css` (shared across all 7 pages, no per-page HTML rewrites
  needed beyond a font link + one decorative div per page). Additions:
  - New Google Font **"Rye"** (`--font-display`) for eyebrow tags, ribbon badges,
    and pills — a rustic hand-painted-sign feel. Headings stay on Baloo 2/Nunito
    for readability.
  - Subtle dot-grid "kraft paper" texture on the body background; diagonal
    ticket-stripe texture on `.section--alt`; pasture-row stripe texture on
    `.section--green`.
  - `.bunting` — a pennant-flag banner (pure CSS/SVG data-URI, no image asset)
    placed right under the header nav on every page.
  - `.rope-divider` — a twisted-twine divider (used once between the homepage
    hero and the next section; also used as the bottom edge of every
    `.page-banner` and the top edge of the footer via `::after`/`::before`).
  - Corner-fold "paper tab" accent (`::after` pseudo-element, cream-2 color) on
    `.card`, `.attraction`, `.price-card`, `.feature`, `.contact-info`, and
    `form.contact-form` — no HTML changes required.
  - `.tag` (homepage attraction highlights) and `.price-table .pill`
    (Popular/Best Value) reshaped into ribbon/banner badges via `clip-path`.
  - Footer restyled as a barn-wood plank gradient with a rope-stitched top edge
    (previously flat dark brown).
  - Buttons got a subtle inset "carved sign" ring and a slight tilt-on-hover.
  All changes are pure CSS/HTML (plus one small SVG data-URI per motif) — no new
  build step, no external image assets, consistent with the project's
  no-framework approach. Verified with Playwright screenshots (desktop + mobile,
  all 7 pages) before committing; no regressions to the video popup modal
  (2026-08-25 feature) or mobile nav.

- **Videos:** hosted on **YouTube** (owner decided against Vimeo — 2026-08-25),
  embedded on `videos.html`. Do NOT host full videos in the repo/Netlify
  (bandwidth + file-size).
- **Attractions-page video links (2026-08-25):** "Watch the video" on `booths.html`
  now opens the attraction's video in a popup/lightbox on that same page (autoplay,
  closable via ✕/backdrop/Escape) instead of navigating to `videos.html`.
  `videos.html` itself is untouched — it still lists all 11 videos in the grid.
  This is the one place in the project that uses a small vanilla-JS snippet
  (inline in `booths.html`, ~30 lines) rather than pure CSS; everything else
  (mobile nav) stays JS-free.
- **Photos on Netlify:** yes — served from the repo via Git. Good at this scale.
- **Attractions page has no per-station photos** (text cards only). 5 of the 11
  stations have matching photos available; 6 do NOT (Kernel Corn-struction, FarmTastic
  Corral, Joyful Noise Junction, Ropin' Roundup, Pooper Scooper Trooper, Craft
  Creations Corner). Left text-only for a consistent look — revisit if photos arrive.
- **Logo — DECIDED (2026-08-25):** keeping the traced logo (`logo.png` /
  `logo_light.png`) already in header/footer. Owner reviewed the alternatives
  in the raw dump (green circle badge, barn/tractor badge, two AI-generated
  cow-face badges) and chose to stick with the current traced version. No
  file changes needed.
- **"12 vs 11" attractions:** the promo flyer says "12 Educational Farm Experiences"
  but the detail flyer lists only 11. Possible missing 12th — unconfirmed with owner.

## 7. TODO (pick up here)

1. ~~**Contact form backend**~~ — DONE (2026-08-25): `contact.html` now uses
   **Netlify Forms** (`data-netlify="true"`, hidden `form-name` field, honeypot
   `bot-field`). Submissions will appear in the Netlify dashboard once deployed.
   No action needed unless the owner prefers Formspree instead.
2. ~~**Real videos**~~ — DONE (2026-08-25): all 11 attraction slots in
   `videos.html` now have real YouTube embeds: Tractor Track and Trots
   (u10-oPBCdOE), Saddle Up Station (a9uKUnvjJ14), Kernel Corn-struction Zone
   (VX2zcGQ3a7c), Boots Scoots & Photo Shoots (WCvR3SnSAgg), FarmTastic Corral
   (L09ZA_6-qNY), Joyful Noise Junction (UTZWses18aM), Sprout & Grow Garden
   (N1kUuo8XI8I), Ropin' Roundup (xQpfwNFLErE), Scarecrow Creation Station
   (phTBLdwwCsE), Pooper Scooper Trooper (ieEu_hkZjL8), Craft Creations Corner
   (CUPseOaIRdI). Setup placeholder note removed from the page.
3. ~~**Logo decision**~~ — DONE (2026-08-25): keeping the current traced logo.
4. ~~**Social links**~~ — DONE (2026-08-25): Facebook footer link now points to the
   real business page https://www.facebook.com/profile.php?id=61583006674823.
   Instagram and TikTok icons removed from all 7 files (owner has no accounts on
   those platforms).
5. **Per-attraction photos — IN PROGRESS (2026-08-25):** sourced from the owner's
   Google Drive ("Farmtastic 2026" > "Pictures for web" folder). Found and added
   to `images/`: `kernel-corn.jpg`, `farmtastic-corral.jpg`, `joyful-noise.jpg`
   (all real event photos, kid-in-action shots, optimized ~1400px/q82). Could NOT
   find a populated action shot for 3 attractions — only empty/staged booth
   photos exist in Drive for these: **Ropin' Roundup**, **Pooper Scooper
   Trooper**, **Craft Creations Corner**. Revisit once the owner has action
   shots for those 3. Also note: these 3 new photos are NOT yet wired into
   `booths.html` — the Attractions cards are deliberately text-only for
   consistency (see section 6); adding photos there is a placement decision the
   owner should make once all (or most) of the 11 have shots. A 12th attraction,
   if one exists, is still unconfirmed with the owner.
6. **Go live** — push to GitHub, connect Netlify, point the domain, retire Wix.

## 8. Environment quirks (for AI tools working via a mounted folder)

This repo may live in a folder mounted read/write to an AI session that **cannot
delete files** (unlink blocked). Consequences: leftover `*.stale` files can appear
in `.git/` after commits, and delivery `*.zip` files can't be removed by the tool.
Both are harmless and `.gitignore`d. On the owner's own machine, normal `rm` works.
