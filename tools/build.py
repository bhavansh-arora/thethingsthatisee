"""Static site builder. Python 3.8+, no dependencies.

    python3 tools/build.py

Reads src/pages/*.html, wraps each in src/partials/layout.html, expands <x-img> tags
from src/images.json, and writes the finished pages to the repo root.
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
SITE_URL = "https://www.thethingsthatisee.com"

IMAGES = {k: v for k, v in json.loads((SRC / "images.json").read_text()).items() if not k.startswith("_")}
PARTIALS = {p.stem: p.read_text() for p in (SRC / "partials").glob("*.html")}

META_RE = re.compile(r"\A<!--meta\s*(\{.*?\})\s*-->\s*", re.S)
XIMG_RE = re.compile(r"<x-img\b([^>]*)>(?:</x-img>)?")
ATTR_RE = re.compile(r'([\w-]+)(?:="([^"]*)")?')
PARTIAL_RE = re.compile(r"\{\{>\s*([\w-]+)\s*\}\}")
SRC_RE = re.compile(r"\{\{src\s+([\w-]+)(?:\s+(\d+))?\s*\}\}")


def esc(s):
    return html.escape(s, quote=True)


def render_img(attrs):
    name = attrs["name"]
    if name not in IMAGES:
        raise SystemExit(f"Unknown image slot: {name}")
    img = IMAGES[name]
    alt = attrs.get("alt", img["alt"])
    cls = ("img " + attrs.get("class", "")).strip()
    sizes = attrs.get("sizes", "100vw")
    eager = "eager" in attrs
    style = f'--tone:{img["tone"]};--ratio:{img["w"]}/{img["h"]}'
    pos = attrs.get("pos") or img.get("pos")
    if pos:
        style += f";object-position:{pos}"
    src = img.get("src") or {}
    if src:
        widths = sorted(int(w) for w in src)
        srcset = ", ".join(f"{src[str(w)]} {w}w" for w in widths)
        fallback = src[str(min(widths, key=lambda w: abs(w - 1000)))]
        loading = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
        tag = (f'<img class="{cls}" src="{esc(fallback)}" srcset="{esc(srcset)}" sizes="{esc(sizes)}" '
               f'width="{img["w"]}" height="{img["h"]}" alt="{esc(alt)}" {loading} decoding="async" style="{style}">')
        full = src[str(widths[-1])]
    else:
        tag = (f'<span class="{cls} img--pending" role="img" aria-label="{esc(alt)}" '
               f'data-shot="{esc(img["shot"])}" style="{style}"></span>')
        full = ""
    if "link" in attrs:
        cat = attrs.get("cat", "")
        caption = attrs.get("caption", alt)
        tag = (f'<a class="g-link" href="{esc(full) if full else "#"}" data-full="{esc(full)}" '
               f'data-caption="{esc(caption)}" data-cat="{esc(cat)}" data-name="{esc(name)}">{tag}</a>')
    return tag


def image_url(name, width=960):
    src = IMAGES[name].get("src") or {}
    if not src:
        return ""
    w = min((int(k) for k in src), key=lambda k: abs(k - width))
    return src[str(w)]


def expand_srcs(text):
    return SRC_RE.sub(lambda m: image_url(m.group(1), int(m.group(2) or 960)), text)


def expand_images(text):
    def sub(m):
        attrs = {k: (v if v is not None else "") for k, v in ATTR_RE.findall(m.group(1))}
        return render_img(attrs)
    return XIMG_RE.sub(sub, text)


def expand_partials(text, depth=0):
    if depth > 5:
        return text
    return PARTIAL_RE.sub(lambda m: expand_partials(PARTIALS[m.group(1)], depth + 1), text)


def og_image(name):
    src = IMAGES.get(name, {}).get("src") or {}
    if not src:
        return ""
    best = src[str(max(int(w) for w in src))]
    return f'<meta property="og:image" content="{esc(best)}">\n<meta name="twitter:image" content="{esc(best)}">'


def build_page(path):
    raw = path.read_text()
    m = META_RE.match(raw)
    if not m:
        raise SystemExit(f"{path.name}: missing <!--meta {{...}} --> header")
    meta = json.loads(m.group(1))
    body = raw[m.end():]
    out_name = meta.get("out", f"{path.stem}.html")
    canonical = SITE_URL + "/" + ("" if out_name == "index.html" else out_name)
    page = PARTIALS["layout"]
    replacements = {
        "{{title}}": esc(meta["title"]),
        "{{description}}": esc(meta["description"]),
        "{{canonical}}": canonical,
        "{{body_class}}": meta.get("body_class", ""),
        "{{og_image}}": og_image(meta.get("og_image", "")),
        "{{scripts}}": "\n".join(f'<script src="{s}" defer></script>' for s in meta.get("scripts", [])),
        "{{jsonld}}": meta.get("jsonld", ""),
    }
    page = page.replace("{{content}}", body)
    page = expand_partials(page)
    for k, v in replacements.items():
        page = page.replace(k, v)
    nav = meta.get("nav")
    if nav:
        page = page.replace(f'data-nav="{nav}"', f'data-nav="{nav}" aria-current="page"')
    page = page.replace("{{nav}}", nav or "")
    page = expand_images(expand_srcs(page))
    (ROOT / out_name).write_text(page)
    return out_name, canonical, meta.get("sitemap", True)


def main():
    built = [build_page(p) for p in sorted((SRC / "pages").glob("*.html"))]
    urls = "\n".join(f"  <url><loc>{c}</loc></url>" for _, c, inc in built if inc)
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "\n</urlset>\n")
    pending = sum(1 for v in IMAGES.values() if not v.get("src"))
    print(f"Built {len(built)} pages: " + ", ".join(n for n, _, _ in built))
    print(f"Images: {len(IMAGES) - pending} filled, {pending} placeholders")


if __name__ == "__main__":
    main()
