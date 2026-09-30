"""Render the studio's 1200x630 share card.

Same palette, fonts and mark-drawing as the network's other cards (Music/build/make_brand.py), so the
card a crawler fetches is the same visual system as the pages underneath it.

    python scripts/make_card.py            # -> public/card-1200x630.jpg

@license SPDX-License-Identifier: Apache-2.0
"""
import os
from PIL import Image, ImageDraw, ImageFont

FONTS = os.path.join(os.environ["LOCALAPPDATA"], "Temp", "sigfonts")
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "card-1200x630.jpg")

FIELD, TILE, LINE = (11, 14, 20), (15, 20, 28), (46, 56, 74)
TEAL, MINT, GOLD, INK, MUTED = (20, 184, 166), (94, 234, 212), (245, 158, 11), (226, 232, 240), (148, 163, 184)


def draw_arcs(dr, cx, cy, r, colour, width, span=52):
    """Partial arcs, the house's counting pattern — never full circles (those read as a bullseye)."""
    for k in range(2):
        off = 0 if k == 0 else 128
        dr.arc([cx - r, cy - r, cx + r, cy + r], off - span, off + span, fill=colour, width=width)


def card(path=OUT, w=1200, h=630):
    im = Image.new("RGB", (w, h), FIELD)
    dr = ImageDraw.Draw(im)
    for i in range(h):  # vertical wash, warmest at the bottom
        dr.line([(0, i), (w, i)], fill=(7 + int(4 * i / h), 11 + int(9 * i / h), 18 + int(14 * i / h)))

    f_k = ImageFont.truetype(os.path.join(FONTS, "PlexMono.ttf"), 28)
    # headline sized to the frame, not to a guess: 104px cut the final O in half
    max_w = w - 132
    size = 104
    while size > 40:
        f_w = ImageFont.truetype(os.path.join(FONTS, "Syne-800.ttf"), size)
        if dr.textlength("AI TALK RADIO", font=f_w) <= max_w:
            break
        size -= 2
    f_s = ImageFont.truetype(os.path.join(FONTS, "PlexMono.ttf"), 26)
    f_d = ImageFont.truetype(os.path.join(FONTS, "PlexMono.ttf"), 23)

    # mark
    dr.rounded_rectangle([66, 110, 158, 202], radius=22, fill=TILE, outline=LINE, width=2)
    draw_arcs(dr, 112, 156, 30, (15, 118, 110), 5)
    draw_arcs(dr, 112, 156, 21, TEAL, 5)
    draw_arcs(dr, 112, 156, 12, MINT, 5)
    dr.ellipse([106, 150, 118, 162], fill=GOLD)

    dr.text((186, 122), "A  L Y G O   S I G N A L   S T A T I O N", font=f_k, fill=MINT)
    dr.text((66, 232), "AI TALK RADIO", font=f_w, fill=INK)
    dr.rounded_rectangle([70, 376, 288, 385], radius=5, fill=GOLD)
    dr.text((66, 408), "A  R A D I O   S T A T I O N   ·   A L W A Y S   O N", font=f_s, fill=MUTED)
    dr.text((66, 452), "Write an episode on any topic. Two hosts and a caller hotline", font=f_d, fill=INK)
    dr.text((66, 488), "voice it in your browser — timecoded transcript, pack included.", font=f_d, fill=INK)
    dr.text((66, 556), "chatagent.ca/talk-radio", font=f_d, fill=GOLD)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, quality=92)
    return path


def measured_widest(path=OUT):
    """Widest inked column, so a card that runs out of frame fails here instead of on X."""
    with Image.open(path) as im:
        px = im.convert("L").load()
        w, h = im.size
        out = 0
        for y in range(h):
            for x in range(w - 6, w - 60, -1):
                if px[x, y] > 60:
                    out = max(out, x)
                    break
    return out


if __name__ == "__main__":
    print("card:", card())
    with Image.open(OUT) as im:
        print("format:", im.format, "size:", im.size)
    edge = measured_widest()
    print("widest inked column:", edge, "of 1200 -> right margin", 1200 - edge)
    assert edge <= 1180, "art touches the right edge"
