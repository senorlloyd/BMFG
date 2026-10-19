#!/usr/bin/env python3
"""
Build the About page's media list from whatever is in Assets/About/Media/.

  python tools/build-about-media.py              just rebuild js/AboutMediaList.js
  python tools/build-about-media.py --optimize   also shrink oversized files first

You normally never run this by hand: the GitHub Action in
.github/workflows/about-media.yml runs it every time you add or remove files in
Assets/About/Media/. Run it yourself only to preview on your own computer.

HOW THE FOLDER IS READ
  Assets/About/Media/                 every photo/clip here goes in the collage
  Assets/About/Media/Featured/        files here ALSO play in the top carousel
  Assets/About/Media/captions.txt     optional: give a file a better caption

  - Files are ordered by name. Start names with 01-, 02-, ... to control
    the carousel order.
  - The caption comes from the file name: "01-CNC-mill-cutting-coasters.jpg"
    becomes "CNC mill cutting coasters". Camera names like IMG_4821.jpg get
    no caption.
  - Files or folders starting with "." or "_" are ignored.
  - A video can have a still image with the same name (clip.mp4 + clip.jpg);
    the image is used as its poster, not shown as a separate photo.

captions.txt FORMAT (one per line, # starts a comment)
  wood-shop-01.jpg: Students finishing a batch of coasters

WHAT --optimize DOES (the GitHub Action uses it; it CHANGES files)
  - Photos over 1600px on the long side (or over ~2.5 MB) are shrunk.
  - PNG/HEIC photos that are large are converted to JPG.
  - GIFs and .mov/.m4v clips become small muted MP4s with a poster image.
  The originals in Assets/About/Media/ are replaced. Keep your own copies
  elsewhere (your phone, Drive) — they are not kept here.
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

SITE = Path(__file__).resolve().parent.parent
MEDIA_DIR = SITE / "Assets" / "About" / "Media"
OUT_FILE = SITE / "js" / "AboutMediaList.js"

PHOTO_EXT = {".jpg", ".jpeg", ".png", ".webp", ".svg"}
VIDEO_EXT = {".mp4", ".webm"}
GIF_EXT = {".gif"}
CONVERT_EXT = {".mov", ".m4v"}
HEIC_EXT = {".heic", ".heif"}
RASTER_RESIZE_EXT = {".jpg", ".jpeg", ".png", ".webp"} | HEIC_EXT
POSTER_EXT = [".jpg", ".jpeg", ".png", ".webp"]

MAX_SIDE = 1600
JPEG_QUALITY = 82
JPEG_MAX_BYTES = 2_500_000      # re-encode a JPG only if bigger than this
OTHER_MAX_BYTES = 800_000       # PNG/WebP/HEIC bigger than this become JPG
VIDEO_WARN_BYTES = 8_000_000

HAS_FFMPEG = shutil.which("ffmpeg") is not None
warnings = []
changes = []


# ---------------------------------------------------------------- helpers
def natural_key(text):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", text)]


def is_ignored(path):
    rel = path.relative_to(MEDIA_DIR)
    return any(part.startswith((".", "_")) for part in rel.parts)


def all_files():
    files = [p for p in MEDIA_DIR.rglob("*") if p.is_file() and not is_ignored(p)]
    return sorted(files, key=lambda p: natural_key(p.relative_to(MEDIA_DIR).as_posix()))


def unique_path(folder, stem, suffix):
    p = folder / f"{stem}{suffix}"
    n = 2
    while p.exists():
        p = folder / f"{stem}-{n}{suffix}"
        n += 1
    return p


def run_ffmpeg(args):
    result = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error"] + args, capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "ffmpeg failed")


def has_poster(video):
    return any(video.with_suffix(ext).exists() for ext in POSTER_EXT)


# ------------------------------------------------------------- optimizing
def optimize():
    try:
        from PIL import Image, ImageOps
    except ImportError:
        sys.exit("Pillow is required for --optimize. Run:  pip install pillow")

    try:
        import pillow_heif
        pillow_heif.register_heif_opener()
        heic_ok = True
    except ImportError:
        heic_ok = False

    for f in all_files():
        ext = f.suffix.lower()
        try:
            if ext in RASTER_RESIZE_EXT or ext in HEIC_EXT:
                if ext in HEIC_EXT and not heic_ok:
                    warnings.append(f"{f.name}: HEIC needs pillow-heif (pip install pillow-heif); skipped")
                    continue
                size = f.stat().st_size
                with Image.open(f) as im:
                    im = ImageOps.exif_transpose(im)
                    long_side = max(im.size)
                    is_jpg = ext in (".jpg", ".jpeg")
                    needs = (
                        long_side > MAX_SIDE
                        or (is_jpg and size > JPEG_MAX_BYTES)
                        or (not is_jpg and (size > OTHER_MAX_BYTES or ext in HEIC_EXT))
                    )
                    if not needs:
                        continue
                    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
                        im = im.convert("RGBA")
                        bg = Image.new("RGB", im.size, (240, 238, 230))
                        bg.paste(im, mask=im.split()[-1])
                        im = bg
                    else:
                        im = im.convert("RGB")
                    im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
                    dest = f if is_jpg else unique_path(f.parent, f.stem, ".jpg")
                    tmp = dest.with_name(dest.stem + ".tmp.jpg")
                    im.save(tmp, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
                tmp.replace(dest)
                if dest != f:
                    f.unlink()
                changes.append(f"shrunk {f.name} ({size/1024:,.0f} KB -> {dest.stat().st_size/1024:,.0f} KB)")

            elif ext in GIF_EXT or ext in CONVERT_EXT:
                if not HAS_FFMPEG:
                    warnings.append(f"{f.name}: ffmpeg not found, left as-is (GIFs are large!)")
                    continue
                width = 960 if ext in GIF_EXT else 1280
                vf = f"scale=trunc(min({width}\\,iw)/2)*2:-2:flags=lanczos"
                if ext in GIF_EXT:
                    vf += ",fps=24"
                mp4 = unique_path(f.parent, f.stem, ".mp4")
                run_ffmpeg([
                    "-i", str(f), "-an", "-vf", vf, "-c:v", "libx264", "-crf", "27",
                    "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(mp4),
                ])
                poster = mp4.with_suffix(".jpg")
                if not poster.exists():
                    try:
                        run_ffmpeg(["-i", str(mp4), "-frames:v", "1", "-q:v", "4", str(poster)])
                    except RuntimeError:
                        pass
                before = f.stat().st_size
                f.unlink()
                changes.append(f"converted {f.name} -> {mp4.name} ({before/1024:,.0f} KB -> {mp4.stat().st_size/1024:,.0f} KB)")

            elif ext in VIDEO_EXT:
                if HAS_FFMPEG and not has_poster(f):
                    try:
                        run_ffmpeg(["-i", str(f), "-frames:v", "1", "-q:v", "4", str(f.with_suffix(".jpg"))])
                        changes.append(f"made poster for {f.name}")
                    except RuntimeError:
                        pass
                if f.stat().st_size > VIDEO_WARN_BYTES:
                    warnings.append(f"{f.name}: {f.stat().st_size/1e6:.0f} MB is big for a web clip; consider a shorter one")
        except Exception as e:  # keep going if one file is bad
            warnings.append(f"{f.name}: {e}")


# --------------------------------------------------------------- manifest
CAMERA_NAME = re.compile(r"^(img|dsc|dscn|pxl|mvimg|vid|screenshot|photo|image|video)[ _-]?\d[\w ]*$", re.I)


def nice_name(stem):
    s = re.sub(r"^\d+[\s._-]+", "", stem)          # drop "01-" ordering prefix
    s = re.sub(r"[-_]+", " ", s).strip()
    if not s or re.fullmatch(r"[\d ]+", s) or CAMERA_NAME.match(s):
        return ""
    return s[:1].upper() + s[1:]


def read_captions():
    captions = {}
    f = MEDIA_DIR / "captions.txt"
    if not f.exists():
        return captions
    for raw in f.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        name, text = line.split(":", 1)
        if name.strip() and text.strip():
            captions[name.strip().lower()] = text.strip()
    return captions


def src_path(path):
    return quote(path.relative_to(SITE).as_posix())


def build_manifest():
    captions = read_captions()
    files = all_files()

    video_keys = {(f.parent, f.stem.lower()) for f in files if f.suffix.lower() in VIDEO_EXT}

    items = []
    for f in files:
        ext = f.suffix.lower()
        rel = f.relative_to(MEDIA_DIR)
        featured = "featured" in [p.lower() for p in rel.parts[:-1]]

        if ext in VIDEO_EXT:
            kind = "video"
        elif ext in PHOTO_EXT or ext in GIF_EXT:
            kind = "image"
            if ext in PHOTO_EXT and (f.parent, f.stem.lower()) in video_keys and ext != ".svg":
                continue  # this image is a video's poster
        else:
            continue

        caption = captions.get(f.name.lower()) or nice_name(f.stem)
        item = {"type": kind, "src": src_path(f)}
        if kind == "video":
            for pext in POSTER_EXT:
                poster = f.with_suffix(pext)
                if poster.exists():
                    item["poster"] = src_path(poster)
                    break
        if caption:
            item["alt"] = caption
            item["caption"] = caption
        if featured:
            item["featured"] = True
        items.append(item)
    return items


def write_manifest(items):
    lines = [
        "/* AUTO-GENERATED by tools/build-about-media.py — do not edit by hand.",
        "   To change what the About page shows, add or remove files in",
        "   Assets/About/Media/ (put files in Assets/About/Media/Featured/ for the carousel).",
        "   Captions come from file names, or from Assets/About/Media/captions.txt. */",
        "",
        "const ABOUT_MEDIA = [",
    ]
    for i, item in enumerate(items):
        comma = "," if i < len(items) - 1 else ""
        lines.append("  " + json.dumps(item, ensure_ascii=False) + comma)
    lines.append("];")
    lines.append("")
    OUT_FILE.write_text("\n".join(lines), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description="Build js/AboutMediaList.js from Assets/About/Media/.")
    ap.add_argument("--optimize", action="store_true",
                    help="shrink oversized photos and convert GIF/MOV clips first (changes files)")
    args = ap.parse_args()

    MEDIA_DIR.mkdir(parents=True, exist_ok=True)

    if args.optimize:
        optimize()

    items = build_manifest()
    write_manifest(items)

    photos = sum(1 for i in items if i["type"] == "image")
    videos = sum(1 for i in items if i["type"] == "video")
    featured = sum(1 for i in items if i.get("featured"))
    for c in changes:
        print("  " + c)
    print(f"AboutMediaList.js: {photos} photo(s), {videos} video(s), {featured} featured")
    if not items:
        print("  (folder is empty — the About page will hide its carousel and collage)")
    for w in warnings:
        print("  warning: " + w)


if __name__ == "__main__":
    main()
