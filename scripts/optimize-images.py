#!/usr/bin/env python3
"""Compress and resize placeholder images so the site stays light for Netlify.

Usage:
    python3 scripts/optimize-images.py Pictures/new-photo.jpg
    python3 scripts/optimize-images.py Pictures/            # every image in the folder
    python3 scripts/optimize-images.py Pictures/ --max-width 1200 --quality 78

By default images are optimized IN PLACE and keep the same filename, so any
<img src="..."> already pointing at them keeps working with no code changes.

Requires Pillow. Install it once (no pip needed):
    sudo apt install python3-pil
"""
import argparse
import os
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit(
        "Pillow is not installed. Install it once with:\n"
        "    sudo apt install python3-pil\n"
        "then run this script again."
    )

# Extensions we know how to re-encode. SVG/GIF/ICO are left untouched.
SUPPORTED = {".jpg", ".jpeg", ".png", ".webp"}


def human(size):
    value = float(size)
    for unit in ("B", "KB", "MB"):
        if value < 1024 or unit == "MB":
            return f"{value:.0f}{unit}" if unit == "B" else f"{value:.1f}{unit}"
        value /= 1024


def optimize(path, max_width, quality):
    ext = os.path.splitext(path)[1].lower()
    if ext not in SUPPORTED:
        return None

    before = os.path.getsize(path)
    img = Image.open(path)
    # Respect EXIF orientation so phone photos aren't sideways.
    img = ImageOps.exif_transpose(img)

    # Downscale if wider than the target (never upscale).
    if img.width > max_width:
        new_height = round(img.height * max_width / img.width)
        img = img.resize((max_width, new_height), Image.LANCZOS)

    has_alpha = img.mode in ("RGBA", "LA") or (
        img.mode == "P" and "transparency" in img.info
    )

    if ext in (".jpg", ".jpeg"):
        img.convert("RGB").save(
            path, "JPEG", quality=quality, optimize=True, progressive=True
        )
    elif ext == ".webp":
        img.save(path, "WEBP", quality=quality, method=6)
    else:  # .png
        if has_alpha:
            img.save(path, "PNG", optimize=True)
        else:
            # Opaque PNGs re-encode far smaller as an 8-bit palette.
            img.convert("RGB").quantize(colors=256, method=Image.FASTOCTREE).save(
                path, "PNG", optimize=True
            )

    after = os.path.getsize(path)
    return before, after


def collect(target):
    if os.path.isfile(target):
        return [target]
    files = []
    for root, _, names in os.walk(target):
        for name in names:
            if os.path.splitext(name)[1].lower() in SUPPORTED:
                files.append(os.path.join(root, name))
    return sorted(files)


def main():
    parser = argparse.ArgumentParser(description="Compress images in place.")
    parser.add_argument("target", help="An image file or a folder of images.")
    parser.add_argument(
        "--max-width", type=int, default=1600,
        help="Downscale anything wider than this (px). Default 1600.",
    )
    parser.add_argument(
        "--quality", type=int, default=82,
        help="JPEG/WebP quality 1-100. Default 82.",
    )
    args = parser.parse_args()

    files = collect(args.target)
    if not files:
        sys.exit(f"No images found in: {args.target}")

    total_before = total_after = 0
    for path in files:
        result = optimize(path, args.max_width, args.quality)
        if result is None:
            continue
        before, after = result
        total_before += before
        total_after += after
        saved = 100 * (before - after) / before if before else 0
        flag = "" if after < before else "  (already optimal)"
        print(f"{path}: {human(before)} -> {human(after)}  (-{saved:.0f}%){flag}")

    if total_before:
        saved = 100 * (total_before - total_after) / total_before
        print(
            f"\nTotal: {human(total_before)} -> {human(total_after)}  (-{saved:.0f}%)"
        )


if __name__ == "__main__":
    main()
