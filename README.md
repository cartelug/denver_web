# Denver Elysium — website

Marketing site for **Denver Elysium**, luxury furnished apartments & residences in
Akright City, Bwebajja (Uganda). Static, zero-build, hosted on **GitHub Pages** from the
`main` branch.

Design system v3 — **"Plaster & Bronze"**: quiet international luxury (warm limestone
paper, deep forest ink, a single bronze accent, hairline ledger rules, editorial chapter
numbering). Type: Cormorant Garamond (display serif) + Jost (geometric sans). Preloader +
page transitions, restrained scroll motion, and a direct-booking enquiry flow
(WhatsApp / email / optional form capture).

## Live
GitHub Pages serves `main` → `https://cartelug.github.io/denver_web/`
(or your custom domain — see **Domain** below).

## Project structure
```
partials/
  top.html        ← shared <head>, preloader, nav   (edit nav/SEO defaults here)
  bottom.html     ← shared footer, floating CTA, lightbox, <script>
pages/
  index, rooms, amenities, gallery, offers,
  location, area, about, contact, 404   ← per-page CONTENT only (no head/nav/footer)
assets/
  css/styles.css  ← the whole design system
  js/main.js      ← preloader, transitions, animations, lightbox, gallery filter, booking
  og-image.png, icon-*.png
images/           ← real property photos (also used as fallbacks) + optimized video
build.py          ← assembles everything → *.html, sitemap.xml, robots.txt, site.webmanifest
favicon.ico, site.webmanifest, robots.txt, sitemap.xml   ← generated, do not hand-edit
*.html            ← GENERATED. Do not edit directly — edit pages/ + partials/ then rebuild
```

## Editing & building
1. Edit content in **`pages/<name>.html`** (just the page body), or the shared shell in
   **`partials/top.html` / `partials/bottom.html`**, or styles/behaviour in **`assets/`**.
2. Run the builder:
   ```bash
   python3 build.py
   ```
   This regenerates every `*.html` plus `sitemap.xml`, `robots.txt` and `site.webmanifest`,
   injects per-page SEO/JSON-LD, sets the active nav item, and auto-adds responsive
   `srcset` to Unsplash images.
3. Commit & push `main` to publish.

> The top-level `*.html` files are build output. Editing them directly will be overwritten
> on the next `python3 build.py`.

## Common changes
- **Add a nav link / change the footer:** edit `partials/top.html` / `partials/bottom.html`, rebuild.
- **Add a page:** create `pages/<slug>.html`, add an entry to `PAGES` in `build.py`, rebuild.
- **Page title / description / SEO:** edit the page's entry in `PAGES` in `build.py`.
- **Domain:** change `DOMAIN` at the top of `build.py` (used for canonical, OG, sitemap), rebuild.

## Images
The site uses **premium Unsplash placeholders** with the real property photos in `images/`
as an automatic fallback (`onerror`). To use real photography, either:
- replace the files in `images/` (keep the same names) — they're already the fallbacks; or
- swap the `src="https://images.unsplash.com/…"` URLs in `pages/*.html` for your own,
  keeping the `data-fallback`, `onerror`, `alt`, and `loading` attributes.

`build.py` adds `srcset`/`sizes` automatically for Unsplash sources. Keep new photos
reasonably sized (≤ ~300 KB each); the existing ones were optimized to ~150–290 KB.

## Booking form (lead capture)
`contact.html` posts to **[Web3Forms](https://web3forms.com)** (free, no server) and also
offers WhatsApp + email. To turn on captured submissions:
1. Get a free access key at web3forms.com (1 minute, just your email).
2. In `pages/contact.html`, replace `YOUR_WEB3FORMS_ACCESS_KEY` with your key, rebuild.

Until a key is set, the form validates and guides guests to WhatsApp/email (nothing breaks).

## Contact / business details
Phone & WhatsApp `+256 705 359522` · `stay@denverelysium.com` ·
12–14 Jambura Road, Kakungulu Estates, Akright City, Bwebajja — off Entebbe Road.
Studio UGX 180,000/night · Two-Bedroom UGX 250,000/night (breakfast included).
