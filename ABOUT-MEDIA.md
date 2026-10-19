# About page: photo carousel + live collage

`about.html` shows a carousel and a live collage under the big photo. Both
are built from whatever files are in `Assets/About/Media/`. There is no list
to edit and no code to change.

- **Carousel:** plays the files in `Assets/About/Media/Featured/`, in file-name
  order. Swipe on phones, arrows or keyboard on desktop, advances every 6 seconds,
  pauses on hover or with the Pause button.
- **Collage:** 8 tiles (5 on phones) that crossfade to a different file every
  couple of seconds, drawn from everything in `Assets/About/Media/`, including
  `Featured`. It never shows the same file twice at once and stops when scrolled
  off-screen or paused.
- **Empty folder:** both sections hide, and the page looks exactly like before.
- Visitors with "reduce motion" turned on get a still collage and a manual carousel.

## Adding photos and clips

1. On GitHub open `Assets/About/Media` (or `Assets/About/Media/Featured` for
   carousel photos).
2. **Add file → Upload files**, drag photos or clips in, commit.
3. About a minute later the "Update About page media" action (Actions tab) shrinks
   anything oversized and updates `js/AboutMediaList.js`. The site then republishes.

Delete a file in the same folder to remove it from the page.

What the action does to your files: photos over 1600px or 2.5 MB are shrunk;
iPhone `.heic` and big PNGs become JPGs; GIFs and `.mov` clips become small muted
MP4s with a poster image. **The big original is replaced**, so keep your own copy.

**Names:** the caption comes from the file name, so `CNC-mill-cutting.jpg` shows
"CNC mill cutting". Camera names like `IMG_4821.jpg` get no caption. Start names
with `01-`, `02-` to control carousel order. For a custom caption add a line like
`IMG_4821.jpg: Students finishing a batch` to `Assets/About/Media/captions.txt`.

## One-time setup / if something doesn't update

- If the action fails at "Commit changes": repo **Settings → Actions → General →
  Workflow permissions → Read and write permissions**, then re-run it.
- If the action succeeded but the live site didn't change, re-run the Pages
  deployment from the Actions tab.
- The `.github` folder is hidden in Finder and File Explorer. Make sure it is in
  the repo (`.github/workflows/about-media.yml`).

## Try it on your own computer first

Drop files into `Assets/About/Media`, run `python tools/build-about-media.py`
(add `--optimize` to shrink files the same way the action does), and open
`about.html`. Needs Python and `pip install pillow` (plus `pillow-heif` for iPhone
photos and `ffmpeg` for GIFs and video).

## Shrinking lots of photos before uploading

Every big original you upload stays in GitHub's history forever and counts toward
the repo's size. For many photos, shrink them first:

```
python tools/prepare-about-media.py path/to/originals            # collage + carousel
python tools/prepare-about-media.py path/to/originals --featured # carousel photos
```

Your originals are not changed. Upload the small files it writes.

## What was added (and how to remove it)

New: `css/about-media.css`, `js/AboutMedia.js`, `js/AboutMediaList.js` (generated),
`tools/`, `.github/workflows/about-media.yml`, `Assets/About/Media/`.
Changed: `about.html` (one stylesheet link, two `<section class="about-media">`
blocks, two script tags). Nothing else was touched. To remove the feature, undo
those `about.html` additions and delete the new files.
