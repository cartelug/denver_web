#!/usr/bin/env python3
"""
Denver Elysium static site builder.
Edit partials/ (shared head, nav, footer) and pages/ (per-page content),
then run `python3 build.py` to regenerate every *.html, sitemap.xml,
robots.txt and site.webmanifest. Zero runtime dependencies; GitHub Pages friendly.
"""
import re, json, os, html as _html

ROOT = os.path.dirname(os.path.abspath(__file__))
DOMAIN = "denverelysium.com"                 # ← change to your live domain
BASE = "https://" + DOMAIN
TOP = open(os.path.join(ROOT, "partials/top.html")).read()
BOT = open(os.path.join(ROOT, "partials/bottom.html")).read()

# ── page registry ────────────────────────────────────────────────────────────
PAGES = [
    dict(slug="index", crumb=None,
         title="Denver Elysium — Luxury Furnished Apartments · Akright City, Bwebajja",
         desc="Denver Elysium — luxury fully-furnished apartments & residences in Akright City, Bwebajja. Indoor pool, rooftop lounge, gym & free parking, ~25 minutes from Entebbe Airport. Book direct.",
         og="Denver Elysium — Luxury Furnished Apartments, Akright City"),
    dict(slug="rooms", crumb="Rooms",
         title="Rooms & Rates — Denver Elysium · Akright City, Bwebajja",
         desc="Studio & two-bedroom fully-furnished apartments at Denver Elysium, Akright City. Self-contained, en-suite, smart TV & fast WiFi — from UGX 180,000/night. Book direct.",
         og="Rooms & Rates — Denver Elysium"),
    dict(slug="amenities", crumb="Amenities",
         title="Amenities — Denver Elysium · Indoor Pool, Rooftop, Gym",
         desc="Indoor pool, rooftop lounge, fitness gym, free parking, airport pickup, breakfast & fast WiFi — every amenity included at Denver Elysium, Akright City.",
         og="Amenities — Denver Elysium"),
    dict(slug="gallery", crumb="Gallery",
         title="Gallery — Denver Elysium · Luxury Apartments, Akright City",
         desc="A look inside Denver Elysium — furnished apartments, en-suite bathrooms, the indoor pool, rooftop lounge and more in Akright City, Bwebajja.",
         og="Gallery — Denver Elysium"),
    dict(slug="offers", crumb="Offers",
         title="Offers & Long Stays — Denver Elysium · Akright City",
         desc="Weekly, monthly and corporate rates, airport-pickup packages and group bookings at Denver Elysium. Tell us your dates for a tailored quote.",
         og="Offers & Long Stays — Denver Elysium"),
    dict(slug="location", crumb="Location",
         title="Location — Denver Elysium · Akright City, Bwebajja",
         desc="Denver Elysium is in Kakungulu Estates, Akright City, off Entebbe Road — about 25 minutes from Entebbe International Airport. Airport pickup on request.",
         og="Location — Denver Elysium"),
    dict(slug="area", crumb="Area Guide",
         title="Area Guide — Around Akright City & Entebbe · Denver Elysium",
         desc="Explore the area around Denver Elysium — Lake Victoria, Entebbe Airport, Kampala, beaches, dining and getting around. Your guide to Akright City, Bwebajja.",
         og="Explore Akright City & Entebbe — Denver Elysium"),
    dict(slug="about", crumb="About",
         title="About — Our Story · Denver Elysium, Akright City",
         desc="The story behind Denver Elysium — a warm, family-run collection of luxury furnished apartments in Akright City, Bwebajja, where every guest is cared for personally.",
         og="About Denver Elysium — Our Story"),
    dict(slug="contact", crumb="Contact",
         title="Book Your Stay — Denver Elysium · Contact & Booking",
         desc="Book your stay at Denver Elysium, Akright City. Send your dates via the form, WhatsApp or email — no online payment, just a fast, personal reply. +256 705 359522.",
         og="Book Your Stay — Denver Elysium"),
]
NAV_SLUGS = {"rooms", "amenities", "gallery", "offers", "location", "about"}

AMENITIES = ["Indoor Pool", "Rooftop Lounge", "Fitness Gym", "24-hour Security",
             "Free Parking", "Airport Pickup", "Breakfast", "Free High-Speed WiFi",
             "Bar & Lounge", "BBQ & Picnic Area", "Laundry", "24-hour Front Desk"]

def lodging():
    return {
        "@context": "https://schema.org", "@type": "LodgingBusiness",
        "name": "Denver Elysium Apartments & Residences",
        "description": "Luxury fully-furnished apartments and residences in Akright City, Bwebajja — indoor pool, rooftop lounge, fitness gym and free parking, ~25 minutes from Entebbe International Airport.",
        "image": [BASE + "/assets/og-image.png", BASE + "/images/bedroom-main.jpg"],
        "url": BASE + "/", "telephone": "+256705359522", "email": "stay@denverelysium.com",
        "priceRange": "UGX 180,000–250,000", "currenciesAccepted": "UGX",
        "address": {"@type": "PostalAddress", "streetAddress": "12–14 Jambura Road, Kakungulu Estates",
                    "addressLocality": "Bwebajja, Akright City", "addressRegion": "Wakiso", "addressCountry": "UG"},
        "checkinTime": "14:00", "checkoutTime": "11:00",
        "amenityFeature": [{"@type": "LocationFeatureSpecification", "name": a, "value": True} for a in AMENITIES],
        "makesOffer": [
            {"@type": "Offer", "name": "Studio Apartment", "price": "180000", "priceCurrency": "UGX"},
            {"@type": "Offer", "name": "Two-Bedroom Apartment (breakfast included)", "price": "250000", "priceCurrency": "UGX"}],
    }

def breadcrumb(p):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": BASE + "/"},
        {"@type": "ListItem", "position": 2, "name": p["crumb"], "item": BASE + "/" + p["slug"] + ".html"}]}

def faq_extract(mid):
    """Pull visible FAQ Q/A pairs out of a page middle so JSON-LD matches the page."""
    pairs = []
    for m in re.finditer(r'<button class="faq-q"[^>]*>(.*?)<span class="pm">.*?<div class="faq-a">.*?<p>(.*?)</p>', mid, re.S):
        q = re.sub(r"<[^>]+>", "", m.group(1)).strip()
        a = re.sub(r"<[^>]+>", "", m.group(2)).strip()
        if q and a:
            pairs.append((_html.unescape(q), _html.unescape(a)))
    return pairs

def faqpage(pairs):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in pairs]}

def jsonld(p, mid):
    blocks = []
    if p["slug"] == "index":
        blocks.append(lodging())
    if p["crumb"]:
        blocks.append(breadcrumb(p))
    faqs = faq_extract(mid)
    if faqs:
        blocks.append(faqpage(faqs))
    return "\n".join('<script type="application/ld+json">\n' + json.dumps(b, ensure_ascii=False, indent=2) + "\n</script>" for b in blocks)

def responsive(mid):
    """Add srcset/sizes/decoding to Unsplash <img> tags (skip local + already-done)."""
    def repl(m):
        tag = m.group(0)
        s = re.search(r'src="(https://images\.unsplash\.com/[^"]+)"', tag)
        if not s or "srcset=" in tag:
            return tag
        url = s.group(1)
        base = re.sub(r'[?&]w=\d+', '', url)
        base = re.sub(r'[?&]q=\d+', '', base)
        sep = '&' if '?' in base else '?'
        srcset = ", ".join(f"{base}{sep}w={w}&q=80 {w}w" for w in (600, 900, 1400, 1920))
        sizes = "100vw" if "data-parallax" in tag else "(max-width:760px) 100vw, 50vw"
        extra = f' srcset="{srcset}" sizes="{sizes}" decoding="async"'
        return tag[:-1] + extra + ">"
    return re.sub(r"<img\b[^>]*>", repl, mid)

def build_page(p):
    mid = open(os.path.join(ROOT, "pages", p["slug"] + ".html")).read().strip()
    mid = responsive(mid)
    canon = BASE + "/" + ("" if p["slug"] == "index" else p["slug"] + ".html")
    top = (TOP.replace("{{TITLE}}", p["title"]).replace("{{DESC}}", p["desc"])
              .replace("{{OGTITLE}}", p["og"]).replace("{{OGDESC}}", p["desc"])
              .replace("{{CANON}}", canon).replace("{{DOMAIN}}", DOMAIN)
              .replace("{{JSONLD}}", jsonld(p, mid)))
    if p["slug"] in NAV_SLUGS:
        top = top.replace(f'<a href="{p["slug"]}.html">', f'<a href="{p["slug"]}.html" class="active">', 1)
    out = top + "\n\n" + mid + "\n\n" + BOT
    open(os.path.join(ROOT, p["slug"] + ".html"), "w").write(out)
    return out

def build_404():
    mid = open(os.path.join(ROOT, "pages/404.html")).read().strip()
    top = (TOP.replace("{{TITLE}}", "Page not found — Denver Elysium").replace("{{DESC}}", "Sorry, that page can’t be found.")
              .replace("{{OGTITLE}}", "Denver Elysium").replace("{{OGDESC}}", "Luxury furnished apartments, Akright City.")
              .replace("{{CANON}}", BASE + "/404.html").replace("{{DOMAIN}}", DOMAIN).replace("{{JSONLD}}", ""))
    open(os.path.join(ROOT, "404.html"), "w").write(top + "\n\n" + mid + "\n\n" + BOT)

def write_sitemap():
    urls = []
    for p in PAGES:
        loc = BASE + "/" + ("" if p["slug"] == "index" else p["slug"] + ".html")
        pr = "1.0" if p["slug"] == "index" else ("0.9" if p["slug"] in ("rooms", "contact", "offers") else "0.7")
        urls.append(f"  <url><loc>{loc}</loc><changefreq>monthly</changefreq><priority>{pr}</priority></url>")
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>\n"
    open(os.path.join(ROOT, "sitemap.xml"), "w").write(xml)

def write_robots():
    open(os.path.join(ROOT, "robots.txt"), "w").write(
        "User-agent: *\nAllow: /\n\nSitemap: " + BASE + "/sitemap.xml\n")

def write_manifest():
    m = {"name": "Denver Elysium", "short_name": "Denver Elysium",
         "description": "Luxury furnished apartments — Akright City, Bwebajja.",
         "start_url": "./index.html", "display": "standalone",
         "background_color": "#06201D", "theme_color": "#0A2A26",
         "icons": [{"src": "assets/icon-192.png", "sizes": "192x192", "type": "image/png"},
                   {"src": "assets/icon-512.png", "sizes": "512x512", "type": "image/png",
                    "purpose": "any maskable"}]}
    open(os.path.join(ROOT, "site.webmanifest"), "w").write(json.dumps(m, indent=2) + "\n")

if __name__ == "__main__":
    n = 0
    for p in PAGES:
        if os.path.exists(os.path.join(ROOT, "pages", p["slug"] + ".html")):
            html_out = build_page(p)
            print(f'  {p["slug"]+".html":16} {len(html_out):6}b  jsonld={html_out.count("application/ld+json")}  srcset={html_out.count("srcset=")}')
            n += 1
        else:
            print(f'  SKIP {p["slug"]} (no pages/{p["slug"]}.html yet)')
    if os.path.exists(os.path.join(ROOT, "pages/404.html")):
        build_404(); print("  404.html")
    write_sitemap(); write_robots(); write_manifest()
    print(f"built {n} pages + sitemap.xml + robots.txt + site.webmanifest")
