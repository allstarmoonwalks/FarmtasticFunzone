# Farmtastic Fun Zone — Project Handoff

_Last updated: 2026-08-26 (owner supplied real photos for the last 3 outstanding attractions same day — all 11 of 11 now have photos)_

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
- **One deliberate exception:** `booths.html` has a small vanilla-JS video
  lightbox/modal (see section 6). This is the only JavaScript anywhere in the
  project — keep it that way unless there's a strong reason to add more.
- **Owner / contacts:** April and Steve. Phone 936-223-1433,
  farmtasticfunzone@gmail.com, Montgomery, Texas (statewide travel).
- **Tagline:** "Sowing Wisdom for the Harvest."

## 2. Current status

**Done**
- 7-page site built: Home, Attractions, Pricing, Photos, Videos, About, Contact.
- Content + pricing sourced from the owner's GroovePages draft and a print flyer.
- Attractions page = the 11 stations from the flyer (headline, category, ages, description).
- Real brand logo in header/footer (traced from the flyer — owner decided to keep it, see Decisions).
- Real photos wired into Home, Photos, About, and **all 11 of 11** Attractions
  cards on `booths.html` — see section 5 for a note on the last 3, which
  weren't sourced from Drive.
- All 11 attraction videos are real YouTube embeds on `videos.html`; `booths.html`
  plays the same videos in an on-page popup instead of linking out.
- Contact form wired to Netlify Forms; social links finalized (real Facebook,
  no Instagram/TikTok); full "Vintage County Fair" visual redesign shipped
  site-wide.
- **Photo gallery rebuilt as category pages (2026-08-26):** `photos.html` is now
  a clickable grid of 12 category tiles — the 11 attractions plus a bonus
  "Animal Encounters" category — instead of one flat 12-photo gallery. Each
  tile links to its own `photos-<slug>.html` page showing every real photo
  available for that category. See section 5 for full detail, including two
  content-accuracy caveats the owner should be aware of.
- **Attractions page regrouped into 4 zones (2026-08-26):** `booths.html` now
  organizes its 11 attraction cards under 4 color-coded zone dividers (Active
  Adventures / Real Farmer University / The Creative Harvest / Memory Makers)
  with a jump-link nav at the top, instead of one flat 11-card list. Sourced
  from a marketing pitch-deck PDF the owner shared. See section 6 for the
  full breakdown.
- Git repo initialized; ready to push to GitHub and deploy on Netlify.

**In progress / not done — see TODO (section 7). Remaining items: go live on
GitHub/Netlify/domain (the attraction-photo gap is now fully resolved).**

## 3. Tech + structure

Static HTML/CSS. One page = one `.html` file. The header nav and footer are
**duplicated in every page** (no includes), so a nav/footer change must be made
in every file. Shared look lives in `styles.css` (design tokens in `:root`).

```
index.html      Home            styles.css      all styling (CSS custom props in :root)
booths.html     Attractions     images/         logos + curated web photos (see below)
pricing.html    Pricing         README.md       repo readme + deploy quickstart
photos.html     Photo categories  HANDOFF.md    this file
photos-*.html   12 photo galleries (one per category — see section 5)
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

- The site now uses **33 curated, web-optimized images** in `images/` (named by
  meaning, e.g. `hero-kids-planting.jpg`, `saddle-up.jpg`, `scarecrow.jpg`,
  `tractor-real.jpg`, `animal-goats-lambs.jpg`, `craft-creations.jpg`,
  `ropin-roundup.jpg`, `pooper-scooper.jpg`). New images follow the project
  convention: ~1400px max width, JPEG quality ~82.
- The owner also dropped their **entire Wix media library** (~35 raw files, hash
  names, some duplicates + AI-generated logos + a screenshot) into `images/`.
  Those raw files are **git-ignored** (see `.gitignore`) so they do NOT bloat the
  repo or Netlify deploy. Only the curated names + logos are tracked (add a new
  `!images/<name>` allow-line in `.gitignore` whenever a new curated image is added).
- The owner can safely delete the raw dump from `images/` locally at any time; the
  tracked curated copies are independent.
- **Attractions page (`booths.html`):** each `.attraction` card has a photo slot
  (`.a-photo`) above the text. **All 11 of 11** attractions now have a real
  photo wired in. The original 8 (Tractor Track and Trots, Saddle Up Station,
  Kernel Corn-struction Zone, Boots/Scoots & Photo Shoots, FarmTastic Corral,
  Joyful Noise Junction, Sprout & Grow Garden, Scarecrow Creation Station) came
  from the owner's Google Drive; the last 3 — Craft Creations Corner
  (`craft-creations.jpg`), Ropin' Roundup (`ropin-roundup.jpg`), and Pooper
  Scooper Trooper (`pooper-scooper.jpg`) — were sent directly by the owner in
  conversation on 2026-08-26, since Drive had no usable shot for any of them.
  Two of those three (Ropin' Roundup, Pooper Scooper Trooper) are photos of
  the booth/backdrop and props (life-like steer, toy animals and cleanup
  tools) rather than a kid actively using the attraction — still real,
  on-brand shots of the actual booths, just without action in frame. The
  `.a-photo--soon` placeholder (`.attraction .a-photo--soon` CSS rule) is no
  longer used anywhere but is left in `styles.css` in case a future
  attraction ever needs it again.
- **Photo gallery pages (NEW, 2026-08-26):** `photos.html` is a `.category-grid`
  of 12 `.category-tile` cards — the same 11 attractions as `booths.html`, plus
  a 12th "Animal Encounters" category — each linking to a dedicated
  `photos-<slug>.html` page (`photos-tractor-track.html`,
  `photos-saddle-up.html`, `photos-kernel-corn.html`, `photos-cowboy-kids.html`,
  `photos-farmtastic-corral.html`, `photos-joyful-noise.html`,
  `photos-sprout-grow.html`, `photos-ropin-roundup.html`,
  `photos-scarecrow.html`, `photos-pooper-scooper.html`,
  `photos-craft-creations.html`, `photos-animal-encounters.html`). Each gallery
  page shows every real photo currently available for that category using the
  existing `.gallery`/`figure` pattern. All 12 categories now have at least
  one real photo — Craft Creations Corner, Ropin' Roundup, and Pooper Scooper
  Trooper all shipped with the empty `.photos-soon` "coming soon" state at
  first, then got their first real photos the same day (2026-08-26), supplied
  directly by the owner rather than sourced from Drive. The `.photos-soon`
  empty state is no longer used anywhere but is left in `styles.css` in case
  a future category ever needs it again. New CSS
  added to `styles.css`: `.category-grid` / `.category-tile` (+`.cat-img`,
  `.cat-img--soon`, `.cat-body`, `.cat-count`), `.photos-soon`, and `.back-link`.
  Sourcing: the owner's Google Drive ("Farmtastic 2026" → "Pictures for web")
  was searched thoroughly and ~96 real candidate photos were reviewed visually
  (most of the folder is signage/rules-board shots, not candid photos, so
  several categories ended up thin — the owner explicitly approved shipping
  thin categories rather than waiting for more material).
  - **⚠️ Animal Encounters — third-party vendor caveat.** The photos used for
    this bonus category (goats, lambs, a camel, an alpaca, a kangaroo, a fawn,
    hatching chicks, etc.) come from a petting-zoo booth in the Drive photos
    that is visibly branded "Texan Petting Zoo" in at least one shot — this
    looks like a **separate vendor's booth** at the same event, not a
    FarmTastic-owned attraction. This was flagged to the owner, who explicitly
    chose to proceed and publish the category anyway. **Worth confirming with
    the owner** whether Animal Encounters should stay framed as "a rotating
    petting-zoo experience featured alongside our attractions" (as currently
    worded) or be removed/reworded if it turns out FarmTastic doesn't want to
    associate itself with a vendor it doesn't run.
  - **Saddle Up Station — real booth vs. photo mismatch (findings, not yet
    acted on).** The real event photos found in Drive show the actual Saddle
    Up Station booth using a **stationary horse/saddle prop**, not a live
    pony — one candidate photo showed the real FarmTastic prop booth (but with
    no rider visible in a usable frame), and another showed what looks like a
    **different vendor's** live real-pony-ride concession, not FarmTastic's
    booth. Given both candidates were flawed, the owner chose to **keep the
    existing stock photo** (`saddle-up.jpg`) rather than swap in either. No
    action needed unless the owner later supplies a clean real photo of a kid
    at the actual prop-saddle booth.
  - **Orphaned image:** `ring-toss.jpg` (previously captioned "Fair Games" in
    the old flat gallery) doesn't map to any of the 11 attraction categories
    and is **no longer displayed anywhere** on the site. It's still tracked in
    `images/` and `.gitignore`-allowed in case it's useful later (e.g. a future
    general "Fair Day" misc-photos category), but nothing currently links to
    it.

## 6. Key decisions & open questions

- **Visual redesign — DONE:** full "Vintage County Fair" restyle applied
  site-wide via `styles.css` (shared across all pages, no per-page HTML rewrites
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
    `.card`, `.attraction`, `.price-card`, `.feature`, `.contact-info`,
    `form.contact-form`, and (new) `.category-tile` — no HTML changes required.
  - `.tag` (homepage attraction highlights) and `.price-table .pill`
    (Popular/Best Value) reshaped into ribbon/banner badges via `clip-path`.
  - Footer restyled as a barn-wood plank gradient with a rope-stitched top edge.
  - Buttons got a subtle inset "carved sign" ring and a slight tilt-on-hover.
  Verified with Playwright screenshots (desktop + mobile) before committing.
- **Videos:** hosted on **YouTube** (not Vimeo), embedded via
  `youtube-nocookie.com/embed/<ID>` on `videos.html` (all 11 real videos are
  live there). `booths.html` plays the same videos in a JS popup/lightbox
  instead of linking to `videos.html`; `videos.html` itself was deliberately
  left unchanged as a standalone full-video grid. This popup is the one place
  in the project using vanilla JS (inline in `booths.html`, ~30 lines).
- **Photos on Netlify:** yes — served from the repo via Git. Good at this scale.
- **Attractions page photos — FULLY RESOLVED (2026-08-26):** all 11 of 11
  stations now have a real photo (see section 5 for which 3 were supplied
  directly by the owner rather than sourced from Drive, and the note that 2
  of those 3 show the booth/props rather than a kid in action).
- **Photo gallery category pages — DONE (2026-08-26):** see section 5 for the
  full writeup, including the two content-accuracy caveats (Animal Encounters
  third-party-vendor branding; Saddle Up Station prop-vs-pony mismatch) that
  are worth a conversation with the owner even though both were shipped per
  the owner's explicit go-ahead.
- **Logo (RESOLVED):** owner decided to keep the current traced logo
  (`logo.png` / `logo_light.png`, traced from the flyer) rather than swap in one
  of the raw official logo files from the Wix dump. No further action needed.
- **Social links (RESOLVED):** real Facebook profile URL
  (`https://www.facebook.com/profile.php?id=61583006674823`) is in the footer on
  all pages. Owner does not use Instagram or TikTok, so those icons/links were
  removed entirely (not just left blank).
- **"12 vs 11" attractions:** the promo flyer says "12 Educational Farm Experiences"
  but the detail flyer lists only 11. Possible missing 12th — unconfirmed with owner.
  (Not the same thing as the new "Animal Encounters" photo category, which is a
  bonus 12th *photo* category, not a claim that FarmTastic runs a 12th attraction.)
  Note: the pitch-deck PDF the owner later shared (see below) also lists exactly
  11 attractions across its 4 zones, with no 12th — supporting evidence, but
  still not a confirmation from the owner either way.
- **Attractions page 4-zone regrouping — DONE (2026-08-26).** The owner shared a
  marketing pitch-deck PDF ("Farmtastic Fun Zone: A Turnkey Family Experience")
  built in a similar vintage-engraving style to the site, and asked for its
  formatting ideas to be applied. That deck organizes the 11 attractions into
  4 zones; `booths.html` was restructured to match:
  - **Zone 1: Active Adventures** (gold, 🐎) — Tractor Track and Trots,
    FarmTastic Corral, Pooper Scooper Trooper.
  - **Zone 2: Real Farmer University** (green, 🎓) — Saddle Up Station,
    Ropin' Roundup, Scarecrow Creation Station.
  - **Zone 3: The Creative Harvest** (red, 🎨) — Kernel Corn-struction Zone,
    Joyful Noise Junction, Craft Creations Corner.
  - **Zone 4: Memory Makers** (brown, 📷) — Sprout & Grow Garden, Boots,
    Scoots, & Photo Shoots.
  Each zone gets a full-width `.zone-divider` banner (icon + title + tagline,
  colored via the site's existing `--gold`/`--green`/`--barn`/`--wood` tokens
  — no new colors introduced) and, at the top of the page, a `.zone-path`
  "guided tour" component (4 circular icon medallions connected by a dashed
  line, each still a jump-link to its zone's anchor) — replaces an earlier
  plain pill-row nav with a visual journey matching the deck's own "Your
  Guided Tour" slide. All 11 attraction cards and their content are unchanged
  — only grouping/order and the new dividers/path were added. `photos.html`
  and its 12 category pages were **not** regrouped by zone (out of scope for
  this pass) — they still list all categories in the original flat grid;
  revisit if the owner wants the same zone treatment there.
- **More deck-derived design elements added (2026-08-26):** after the 4-zone
  regroup, the owner asked for any more design ideas from the same pitch deck.
  Two more sections were added, both using only existing site colors/fonts:
  - **Home page (`index.html`):** a new "A complete, balanced experience"
    section (reusing `.feature-row`, new `.feature-row--4` variant for a
    4-column layout that collapses to 2 then 1 column) between the Mission
    Teaser and CTA Band, with the deck's own copy — Broad Appeal, Curated
    Variety, Turnkey & Professional, Deeply Engaging.
  - **Pricing page (`pricing.html`):** a new "Build Your Adventure" section
    (new `.zone-blocks` pattern — 4 colored link-tiles, one per zone, using
    the same `--gold`/`--green`/`--barn`/`--wood` tokens) right after the page
    banner, each tile linking to that zone's anchor on `booths.html`. Copy is
    adapted from the deck's "Let's Build the Perfect Farm Adventure" slide —
    the deck's placeholder contact info on its closing slide (email@
    farmtasticfunzone.com / (555) 123-4567) was **not** used anywhere; the
    site's real contact info was left untouched everywhere.

## 7. TODO (pick up here)

1. **Optional / cosmetic — Ropin' Roundup and Pooper Scooper Trooper show
   booth/prop photos, not action shots.** Both are real, on-brand photos of
   the actual attractions (see section 5), so this isn't broken — just worth
   swapping for a candid kid-in-action shot if/when the owner has one from a
   future event. Same optimize-and-swap pattern as before (see the other 9
   cards for reference).
2. **Confirm the Animal Encounters vendor question with the owner** (section 5)
   — is it OK for the site to show petting-zoo photos that appear to be from a
   separate vendor's booth ("Texan Petting Zoo" branding visible in source
   photos), framed as "featured alongside our attractions"? If not, the
   category should be reworded or removed from `photos.html` and
   `photos-animal-encounters.html`.
3. **Confirm the "12 vs 11" attraction discrepancy** with the owner (section 6).
4. **Optional — extend the 4-zone grouping to `photos.html`?** The Attractions
   page now groups by zone (section 6); the Photos category grid does not.
   Ask the owner whether they want the same 4-zone dividers applied there, or
   prefer the flat 12-tile grid it already has.
5. **Go live** — push to GitHub (repo is up to date locally; owner runs
   `git push`), connect Netlify, point the domain, retire Wix. Contact form
   submissions won't work until the site is actually deployed on Netlify.
6. **Optional — any more pitch-deck ideas left to mine?** Three deck-derived
   additions are now live (4-zone regroup, guided-tour zone path, Complete
   Balanced Experience block, Build Your Adventure blocks) — the deck's
   remaining slides are mostly restating the same zones/attractions, but
   worth a second pass if the owner wants more.

## 8. Environment quirks (for AI tools working via a mounted folder)

This repo may live in a folder mounted read/write to an AI session that **cannot
delete files** (unlink blocked). Consequences: leftover `*.stale` files can appear
in `.git/` after commits, and delivery `*.zip` files can't be removed by the tool.
Both are harmless and `.gitignore`d. On the owner's own machine, normal `rm` works.
