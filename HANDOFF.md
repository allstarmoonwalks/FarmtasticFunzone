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

**In progress / not done — see TODO (section 7).**

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

- **Videos:** hosted on **Vimeo** (owner setting up an account), embedded on
  `videos.html`. Do NOT host full videos in the repo/Netlify (bandwidth + file-size).
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
2. **Real videos** — replace the placeholder blocks in `videos.html` with Vimeo
   embeds once the owner supplies links.
3. ~~**Logo decision**~~ — DONE (2026-08-25): keeping the current traced logo.
4. ~~**Social links**~~ — DONE (2026-08-25): Facebook footer link now points to the
   real business page https://www.facebook.com/profile.php?id=61583006674823.
   Instagram and TikTok icons removed from all 7 files (owner has no accounts on
   those platforms).
5. **Optional:** per-attraction photos (needs 6 more images), a 12th attraction if one exists.
6. **Go live** — push to GitHub, connect Netlify, point the domain, retire Wix.

## 8. Environment quirks (for AI tools working via a mounted folder)

This repo may live in a folder mounted read/write to an AI session that **cannot
delete files** (unlink blocked). Consequences: leftover `*.stale` files can appear
in `.git/` after commits, and delivery `*.zip` files can't be removed by the tool.
Both are harmless and `.gitignore`d. On the owner's own machine, normal `rm` works.
