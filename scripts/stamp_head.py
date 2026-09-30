"""Own the whole <head> of index.html: SEO meta, X/OG cards, JSON-LD graph, fonts.

This script does not patch individual tags — it *replaces the entire head* from one template. That is
the fix for a real defect: the head had been hand-written before this script existed, so its og tags sat
outside the generated block, survived a "restamp", and the page shipped TWO og:image tags with the old
card first. Owning the head makes a duplicate impossible rather than something to clean up.

Both targets ship the same head. The canonical home is chatagent.ca/talk-radio and the Hugging Face
Space is a mirror, so canonical and og:url point at chatagent.ca from either copy. Icon paths stay
root-relative and Vite prepends each build's own base.

    python scripts/stamp_head.py --canonical https://chatagent.ca/talk-radio/

@license SPDX-License-Identifier: Apache-2.0
"""
import argparse
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "index.html")

CARD = "https://chatagent.ca/talk-radio/card-1200x630.jpg"
TITLE = "AI Talk Radio (Ungated) · a LYGO Signal station"
DESC = (
    "Write a talk-radio episode on any topic and hear it voiced in your browser: two hosts, a caller "
    "hotline, a timecoded transcript, and the finished pack to take away. Free, open, no login."
)
IMAGE_ALT = "AI Talk Radio - a LYGO Signal station: write an episode on any topic and hear it voiced."
KEYWORDS = (
    "AI talk radio, autonomous radio station, AI podcast generator, browser speech synthesis radio, "
    "talk radio studio, timecoded transcript, LYGO Signal, chatagent.ca, Excavationpro"
)
ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"

OWNED = [
    "og:image", "og:image:secure_url", "og:title", "og:description", "og:url", "og:image:alt",
    "twitter:card", "twitter:image", "twitter:image:alt", "twitter:site", "twitter:creator",
    'name="description"', 'name="canonical"', 'rel="canonical"', 'name="keywords"', 'name="robots"',
    "application/ld+json", "<title>",
]


def graph(canonical):
    org = {
        "@type": "Organization",
        "@id": "https://chatagent.ca/#org",
        "name": "ChatAgent",
        "alternateName": "LYGO Signal",
        "url": "https://chatagent.ca/",
        "founder": {"@type": "Person", "name": "Justin Helmer", "alternateName": "Excavationpro"},
        "sameAs": [
            "https://asiancoastline.com/listen.html",
            "https://open.spotify.com/artist/6CkZ4bN2xu3WRKbjEL3u2S",
            "https://music.apple.com/us/artist/excavationpro/1586588545",
            "https://music.youtube.com/channel/UCnCf9gjhMEfUFPvGkdlUabQ",
            "https://www.patreon.com/Excavationpro",
        ],
    }
    site = {
        "@type": "WebSite",
        "@id": "https://chatagent.ca/#website",
        "url": "https://chatagent.ca/",
        "name": "chatagent.ca",
        "publisher": {"@id": "https://chatagent.ca/#org"},
    }
    app = {
        "@type": "WebApplication",
        "@id": canonical + "#app",
        "name": "AI Talk Radio (Ungated)",
        "url": canonical,
        "description": DESC,
        "applicationCategory": "MultimediaApplication",
        "applicationSubCategory": "Internet radio studio",
        "operatingSystem": "Any (web browser)",
        "browserRequirements": "Requires JavaScript; speech synthesis for the voiced broadcast",
        "isAccessibleForFree": True,
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
        },
        "featureList": [
            "Write an episode on any topic",
            "Two hosts plus a caller hotline, voiced in the browser",
            "Timecoded transcript",
            "Downloadable show pack (notes, transcript, data)",
        ],
        "publisher": {"@id": "https://chatagent.ca/#org"},
        "isPartOf": {"@id": "https://chatagent.ca/#website"},
        "license": "https://www.apache.org/licenses/LICENSE-2.0",
    }
    crumbs = {
        "@type": "BreadcrumbList",
        "@id": canonical + "#breadcrumbs",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "chatagent.ca", "item": "https://chatagent.ca/"},
            {"@type": "ListItem", "position": 2, "name": "LYGO Signal", "item": "https://chatagent.ca/signal/"},
            {"@type": "ListItem", "position": 3, "name": "AI Talk Radio", "item": canonical},
        ],
    }
    return {"@context": "https://schema.org", "@graph": [org, site, app, crumbs]}


def head(canonical):
    lines = [
        "",
        '    <meta charset="UTF-8" />',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        "    <title>" + TITLE + "</title>",
        '    <meta name="description" content="' + DESC + '" />',
        '    <link rel="canonical" href="' + canonical + '" />',
        '    <meta name="keywords" content="' + KEYWORDS + '" />',
        '    <meta name="robots" content="' + ROBOTS + '" />',
        '    <meta name="author" content="Justin Helmer (Excavationpro)" />',
        '    <meta name="theme-color" content="#0b0e14" />',
        "",
        '    <meta property="og:type" content="website" />',
        '    <meta property="og:site_name" content="chatagent.ca" />',
        '    <meta property="og:locale" content="en_CA" />',
        '    <meta property="og:url" content="' + canonical + '" />',
        '    <meta property="og:title" content="' + TITLE + '" />',
        '    <meta property="og:description" content="' + DESC + '" />',
        '    <meta property="og:image" content="' + CARD + '" />',
        '    <meta property="og:image:secure_url" content="' + CARD + '" />',
        '    <meta property="og:image:type" content="image/jpeg" />',
        '    <meta property="og:image:width" content="1200" />',
        '    <meta property="og:image:height" content="630" />',
        '    <meta property="og:image:alt" content="' + IMAGE_ALT + '" />',
        "",
        '    <meta name="twitter:card" content="summary_large_image" />',
        '    <meta name="twitter:title" content="' + TITLE + '" />',
        '    <meta name="twitter:description" content="' + DESC + '" />',
        '    <meta name="twitter:image" content="' + CARD + '" />',
        '    <meta name="twitter:image:alt" content="' + IMAGE_ALT + '" />',
        '    <meta name="twitter:site" content="@Excavationpro" />',
        '    <meta name="twitter:creator" content="@Excavationpro" />',
        "",
        '    <link rel="icon" href="/brand/favicon-signal.svg" type="image/svg+xml" />',
        '    <link rel="apple-touch-icon" href="/brand/lygo-signal-square.svg" />',
        "",
        '    <link rel="preconnect" href="https://fonts.googleapis.com">',
        '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        '    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">',
        "",
        '    <script type="application/ld+json">',
        json.dumps(graph(canonical), indent=2),
        "    </script>",
        "  ",
    ]
    return "\n".join(lines)


def stamp(canonical):
    html = open(INDEX, encoding="utf-8", newline="\n").read()
    assert html.count("<head>") == 1 and html.count("</head>") == 1, "index.html is not a single head document"
    html = re.sub(r"<head>.*?</head>", lambda m: "<head>" + head(canonical) + "</head>", html, count=1, flags=re.S)
    open(INDEX, "w", encoding="utf-8", newline="\n").write(html)

    back = open(INDEX, encoding="utf-8", newline="\n").read()
    bad = {k: back.count(k) for k in OWNED if back.count(k) != (2 if k == "og:image" else 1)}
    bad = {k: v for k, v in bad.items() if k not in ("og:image",)}  # og:image appears as og:image + og:image:secure_url etc.
    if back.count('property="og:image"') != 1:
        bad['property="og:image" exact'] = back.count('property="og:image"')
    assert not bad, "head tags not present exactly once: %s" % bad
    blocks = re.findall(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', back, re.S)
    assert len(blocks) == 1, "expected one JSON-LD block, found %d" % len(blocks)
    parsed = json.loads(blocks[0])
    assert parsed["@context"] == "https://schema.org"
    types = [n["@type"] for n in parsed["@graph"]]
    assert not re.search(r"\{[a-z_]+\}", blocks[0]), "unfilled template slot in the graph"
    return len(back), types


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--canonical", default="https://chatagent.ca/talk-radio/")
    a = ap.parse_args()
    size, types = stamp(a.canonical)
    print("head stamped: %d bytes | canonical=%s | graph=%s" % (size, a.canonical, types))


if __name__ == "__main__":
    main()
