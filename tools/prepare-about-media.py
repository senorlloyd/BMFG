#!/usr/bin/env python3
"""
Shrink a folder of photos and clips BEFORE you upload them to GitHub.

  python tools/prepare-about-media.py  path/to/folder-of-originals
  python tools/prepare-about-media.py  path/to/folder-of-originals --featured

Why bother? You can drop big originals straight into Assets/About/Media on GitHub
and the site will shrink them for you. But every original you upload stays
in GitHub's history forever and counts toward the repo's size. If you're
adding lots of photos, run this first and upload the small versions.

What it does
  - Photos (jpg, png, webp): shrinks them to 1600px on the long side and
    saves a web-friendly JPG. Typically 4-8 MB phone photos become ~200 KB.
  - GIFs: converts them to small, muted, looping MP4s (often 10x smaller)
    plus a still poster image.
  - Videos (mp4, mov, m4v, webm): shrinks them to 1280px wide, strips the
    audio, and makes a poster image.

Your original files are never changed. Results go to Assets/About/Media/
(or Assets/About/Media/Featured/ with --featured, for the top carousel).
Then upload the results to that folder on GitHub — the site updates itself.
Or, to preview on your computer first, run:  python tools/build-about-media.py

One-time setup
  pip install pillow
  ffmpeg (only needed for GIFs and videos): https://ffmpeg.org/download.html
  iPhone .heic photos work too if you also run:  pip install pillow-heif

Options
  --featured      put results in Assets/About/Media/Featured/ (carousel + collage)
  --out DIR       put results somewhere else
  --max PIXELS    longest side for photos (default: 1600)
  --quality N     JPG quality 1-100 (default: 82)
"""

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is not installed. Run:  pip install pillow")

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
GIF_EXT = {".gif"}
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".webm"}

try:  # optional: iPhone photos
    import pillow_heif
    pillow_heif.register_heif_opener()
    IMAGE_EXT.add(".heic")
except ImportError:
    pass

HAS_FFMPEG = shutil.which("ffmpeg") is not None
PAPER = (240, 238, 230)  # fills transparent PNG areas


def slugify(name):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "media"


def unique_path(folder, stem, suffix):
    p = folder / f"{stem}{suffix}"
    n = 2
    while p.exists():
        p = folder / f"{stem}-{n}{suffix}"
        n += 1
    return p


def save_jpeg(im, dest, max_side, quality):
    im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, PAPER)
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = im.convert("RGB")
    im.thumbnail((max_side, max_side), Image.LANCZOS)
    im.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)


def run_ffmpeg(args):
    result = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error"] + args,
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "ffmpeg failed")


def kb(path):
    return path.stat().st_size / 1024


def main():
    ap = argparse.ArgumentParser(description="Shrink photos and clips for the About page.")
    ap.add_argument("input", help="folder containing your original photos and clips")
    ap.add_argument("--featured", action="store_true",
                    help="save into Assets/About/Media/Featured/ so they also play in the carousel")
    ap.add_argument("--out", default=None, help="output folder (default: Assets/About/Media)")
    ap.add_argument("--max", type=int, default=1600, help="longest side for photos, in pixels")
    ap.add_argument("--quality", type=int, default=82, help="JPG quality 1-100")
    args = ap.parse_args()

    src_dir = Path(args.input).expanduser()
    if not src_dir.is_dir():
        sys.exit(f"Not a folder: {src_dir}")

    site_root = Path(__file__).resolve().parent.parent
    if args.out:
        out_dir = Path(args.out).expanduser()
    else:
        out_dir = site_root / "Assets" / "About" / "Media" / ("Featured" if args.featured else "")
    out_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(p for p in src_dir.iterdir() if p.is_file() and not p.name.startswith("."))
    if not files:
        sys.exit("No files found in that folder.")

    done = 0
    skipped = []
    before_total = after_total = 0

    for f in files:
        ext = f.suffix.lower()
        stem = slugify(f.stem)
        try:
            if ext in IMAGE_EXT:
                dest = unique_path(out_dir, stem, ".jpg")
                with Image.open(f) as im:
                    save_jpeg(im, dest, args.max, args.quality)

            elif ext in GIF_EXT or ext in VIDEO_EXT:
                if not HAS_FFMPEG:
                    skipped.append((f.name, "needs ffmpeg (see setup at the top of this script)"))
                    continue
                is_gif = ext in GIF_EXT
                width = 960 if is_gif else 1280
                scale = f"scale=trunc(min({width}\\,iw)/2)*2:-2:flags=lanczos"
                vf = scale + (",fps=24" if is_gif else "")

                dest = unique_path(out_dir, stem, ".mp4")
                run_ffmpeg([
                    "-i", str(f), "-an", "-vf", vf,
                    "-c:v", "libx264", "-crf", "27", "-preset", "medium",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(dest),
                ])
                try:
                    run_ffmpeg(["-i", str(dest), "-frames:v", "1", "-q:v", "4",
                                str(dest.with_suffix(".jpg"))])
                except RuntimeError:
                    pass
            else:
                skipped.append((f.name, "unsupported file type"))
                continue

            done += 1
            before_total += f.stat().st_size
            after_total += dest.stat().st_size
            print(f"  {f.name}  ->  {dest.name}   ({kb(f):,.0f} KB -> {kb(dest):,.0f} KB)")

        except Exception as e:  # keep going if one file is bad
            skipped.append((f.name, str(e)))

    print()
    if done:
        saved = before_total - after_total
        shown = out_dir.relative_to(site_root).as_posix() if site_root in out_dir.resolve().parents else str(out_dir)
        print(f"Processed {done} file(s): {before_total/1e6:.1f} MB -> {after_total/1e6:.1f} MB "
              f"(saved {saved/1e6:.1f} MB)")
        print(f"Saved to {shown}/")
        print("Next: upload that folder's new files to GitHub (the site updates itself),")
        print("or preview locally with:  python tools/build-about-media.py")

    if skipped:
        print()
        print("Skipped:")
        for name, why in skipped:
            print(f"  {name}: {why}")


if __name__ == "__main__":
    main()
