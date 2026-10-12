# TRUSTED CAMPUS — AI LearnMate · Keynote

An interactive HTML presentation with 14 slides for the final review of the incubation program, รายงานผลการบ่มเพาะ รอบปิดโครงการ.

## Presenting (offline)

1. Open **`index.html`** in Google Chrome or Microsoft Edge. You can double-click the file. No server and no internet are needed.
2. Press **F** for fullscreen.
3. Press **N** to open the Thai speaker notes. A timer starts when the notes first open. The audience view never shows the notes unless you open them.

`index.html` contains everything it needs: the IBM Plex Sans Thai and Space Grotesk fonts, the Three.js LUMI mascot, a real QR code and all the slide graphics.

### Controls

| Action | Keys / input |
|---|---|
| Next slide | `→` · `Space` · `PageDown` · mouse wheel down · click the right part of the screen · `›` button |
| Previous slide | `←` · `PageUp` · mouse wheel up · `‹` button |
| First / last slide | `Home` / `End` |
| Jump to a slide | type the number, then `Enter` (for example `1` `0` `Enter`) |
| Fullscreen | `F` |
| Speaker notes and timer | `N` |
| Slide overview | `O` |
| Hide or show the presenter UI | `H` |
| Shortcut help | `?` |
| Touch | swipe left or right (or up or down) |

One wheel gesture moves exactly one slide. Trackpad momentum is absorbed, so it can't skip ahead. Clicks on links, the QR code and the controls never change slides.
The deck never advances by itself and plays no sound. Each slide's animation resets and plays again when you return to it.
The deck follows the `prefers-reduced-motion` setting and switches to low-motion behaviour when it's on.

### Print / PDF

Use Chrome → Print → *Save as PDF* (enable *Background graphics*). Each slide prints on its own 1920×1080 page in its final state, with no animations.

## Photos

The deck uses no photo slots. Slide 02 shows text-only team cards, slide 03 uses a drawn graphic for milestone 03, and slide 13 shows the three activities as cards.

## Editing and rebuilding

The source lives in `src/`. After editing it, run:

```bash
npm install      # once
npm run build    # writes index.html
npm run check    # headless Chromium validation + screenshots in ./shots
```

| File | Purpose |
|---|---|
| `src/index.src.html` | All 14 slides (Thai content and speaker notes in `<aside class="notes">`) |
| `src/styles.css` | Design system, per-slide layouts, transitions, print styles |
| `src/app.js` | Presentation engine: navigation, transitions, canvases, counters, notes, overview |
| `src/mascot.js` | LUMI, a real-time WebGL mascot built with Three.js |
| `tools/build.mjs` | Inlines fonts, bundles Three.js, generates the QR code, writes `index.html` |
| `tools/check.mjs` | Automated checks (navigation, wheel, notes, QR decoding, console errors) |

## About the content

- The financial figures on slide 10 come from the project brief exactly as given. The chart is built from the same data as the table and has a true zero baseline.
- The student data in the product demo on slide 4 is fictional and labelled as illustrative.
- The revenue flow on slide 5 is labelled as a designed structure that is not yet in operation.
