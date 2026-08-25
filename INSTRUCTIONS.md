# Farmtastic Fun Zone — Working Instructions

How to preview, edit, deploy, and extend this site. Pair with `HANDOFF.md`
(project status and decisions).

---

## Preview locally

No build needed. Just open `index.html` in a browser (double-click it), or run a
tiny local server for clean relative paths:

```bash
cd "path/to/FarmtasticFunzone"
python3 -m http.server 8000    # then visit http://localhost:8000
```

## Project conventions

- **Plain static HTML/CSS.** One page per `.html` file. No framework, no bundler.
- **Shared styles** live in `styles.css`. Colors/spacing are CSS custom properties
  in the `:root {}` block at the top — change a brand color there and it updates
  everywhere.
- **The header nav and footer are copied into every page** (there are no server
  includes). If you change a nav item, a footer link, or the logo, **make the same
  edit in all 7 HTML files** (`index, booths, pricing, photos, videos, about, contact`).
- Class naming is descriptive (`.attraction`, `.price-card`, `.video-card`,
  `.gallery`, etc.). Reuse existing classes rather than adding new CSS where possible.
- Mobile nav is a pure-CSS toggle (the `#nav-check` checkbox) — no JavaScript.

## Deploy (GitHub + Netlify)

First time (push the repo):

```bash
cd "path/to/FarmtasticFunzone"
git remote add origin git@github.com:allstarmoonwalks/FarmtasticFunzone.git
git branch -M main
git push -u origin main
```

Then in Netlify: **Add new site → Import an existing project → GitHub →** choose
`allstarmoonwalks/FarmtasticFunzone`. Build settings are already in `netlify.toml`
(build command empty, publish directory `.`). Every later change is just:

```bash
git add -A && git commit -m "describe the change" && git push
```

…and Netlify redeploys automatically. (No-Git alternative: drag the folder onto
netlify.com/drop.)

## Add or replace a PHOTO

1. Put an optimized JP(max ~1400px wide, quality ~82) into `images/`.
2. Reference it with a relative path, e.g. `<img src="images/my-photo.jpg" alt="...">`.
3. **Important:** `images/*` is git-ignored by default (to keep the owner's raw
   media dump out of the repo). Add a matching allow line to `.gitignore`:
   `!images/my-photo.jpg` — otherwise the file won't be committed/deployed.

## Add a VIDEO (YouTube)

Videos live on `videos.html`, one card per attraction, each with an `id` anchor
(e.g. `id="ropin-roundup"`) that the Attractions page links to. To add a real video,
replace that card's placeholder block:

```html
<div class="video-embed"><div class="ph">…placeholder…</div></div>
```

with a YouTube iframe wrapped to stay 16:9 (use the `youtube-nocookie.com` embed
domain and the video's ID from its share/embed link):

```html
<div class="video-embed" style="padding:0">
  <iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID"
          style="position:absolute;inset:0;width:100%;height:100%;border:0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          title="Attraction video"></iframe>
</div>
```

Keep videos on YouTube — do not commit large video files to the repo.

## Wire up the CONTACT FORM (Netlify Forms)

On `contact.html`, the `<form>` currently posts to a Formspree placeholder. On
Netlify, the easiest working option is Netlify Forms:

1. Add attributes to the form tag:
   `<form class="contact-form" name="booking" method="POST" data-netlify="true">`
2. Add a hidden field inside the form:
   `<input type="hidden" name="form-name" value="booking">`
3. Deploy. Submissions appear in the Netlify dashboard (Forms) and can email you.

(Or set the form `action` to a Formspree endpoint instead.)

## Update the LOGO

Header uses `images/logo.png` (dark, for the cream header); footer uses
`images/logo_light.png` (light, for the dark footer). To swap in a different logo,
replace those two files (keep the names, or update the `<img src>` in all 7 pages).
Official logo options are in the raw `images/` dump — see `HANDOFF.md`.

## Update SOCIAL / CONTACT details

Phone, email, and social links appear in the footer of **every** page and on
`contact.html`. Search-and-replace across all files when these change.

## Pricing reference (as currently on the site)

- Under 10 days (per day): 4=$1,122 · 6=$1,272 · 8=$1,422 (popular) · 10=$1,600
- 10+ days (per day / 10-day total): 4=$800/$8,000 · 6=$950/$9,500 ·
  8=$1,100/$11,000 (best value) · 10=$1,288/$12,880
- Craft Station add-on: $200/day (short) or $400 (10+ days)
