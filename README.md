# Farmtastic Fun Zone — Website

A hand-coded, static HTML website (no build step, no framework) for
**Farmtastic Fun Zone**, a traveling agricultural-education experience for
fairs and rodeos across Texas.

## Pages
| File | Page |
|------|------|
| `index.html` | Home |
| `booths.html` | Attractions (11 stations) |
| `pricing.html` | Packages & Pricing |
| `photos.html` | Photo Gallery |
| `videos.html` | Learning Videos (placeholder slots) |
| `about.html` | About & Mission |
| `contact.html` | Book Your Fair / Contact |
| `styles.css` | Shared styles |
| `images/` | Logo files (`logo.png`, `logo_light.png`) |

## Deploy to Netlify (via this repo)
1. Push this repo to GitHub/GitLab (see below).
2. In Netlify: **Add new site → Import an existing project** → pick this repo.
3. Build settings: **Build command:** *(leave blank)* · **Publish directory:** `.`
   (a `netlify.toml` is included so these are set for you).
4. Deploy. Every future `git push` re-deploys automatically.

You can also deploy without Git: **netlify.com/drop** and drag this folder in.

## Push this repo to GitHub (one time)
This folder is already a Git repo with an initial commit. Create a new, empty
repo on GitHub (no README), then run:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

## Point your domain
Keep your domain wherever it's registered; in Netlify go to
**Domain settings → Add a custom domain** and follow the DNS instructions.

## Notes / to-do
- **Photos** currently load from the Wix media CDN (`static.wixstatic.com`).
  They display fine but still depend on the Wix account. Replace with local
  files in `images/` to be fully independent.
- **Videos** (`videos.html`) are placeholder slots — drop in YouTube/Vimeo
  embeds when ready.
- **Contact form** needs a form backend (Netlify Forms works well on Netlify —
  add `netlify` to the `<form>` tag, or use Formspree).
- **Social links** in the footer are placeholders.
