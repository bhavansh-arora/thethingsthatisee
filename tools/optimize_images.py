"""Make responsive WebP sets for each photo slot and point src/images.json at them.

    python3 tools/optimize_images.py <mapping.json> <source_dir> [<source_dir> ...]

mapping.json maps slot names in src/images.json to source filenames, e.g.
{"hero-mass": "veil-mass.jpg"}. Outputs go to assets/img/<slot>-<width>.webp.
Run `python3 tools/build.py` afterwards.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

WIDTHS = (480, 960, 1600)
QUALITY = 76
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img"
MANIFEST = ROOT / "src" / "images.json"


def find(name, dirs):
    for d in dirs:
        p = Path(d) / name
        if p.exists():
            return p
    raise SystemExit(f"Source not found: {name}")


def main(mapping_path, dirs):
    mapping = json.loads(Path(mapping_path).read_text())
    images = json.loads(MANIFEST.read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    for slot, src in mapping.items():
        if slot not in images:
            raise SystemExit(f"Unknown slot: {slot}")
        im = ImageOps.exif_transpose(Image.open(find(src, dirs))).convert("RGB")
        w, h = im.size
        widths = sorted({x for x in WIDTHS if x < w} | {min(w, WIDTHS[-1])})
        srcset = {}
        for tw in widths:
            out = OUT / f"{slot}-{tw}.webp"
            im.resize((tw, round(h * tw / w)), Image.LANCZOS).save(out, "WEBP", quality=QUALITY, method=6)
            srcset[str(tw)] = f"assets/img/{out.name}"
        tone = im.resize((1, 1), Image.LANCZOS).getpixel((0, 0))
        images[slot].update({"w": w, "h": h, "tone": "#%02x%02x%02x" % tone, "src": srcset})
    MANIFEST.write_text(json.dumps(images, indent=2, ensure_ascii=False) + "\n")
    print(f"{len(mapping)} slots -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
