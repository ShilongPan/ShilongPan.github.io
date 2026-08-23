# Diagnosis Plan: White Screen on `/projects.html`

**Context:** `projects.html` is a 3-line Jekyll page that delegates all rendering to
`_layouts/projects-index.html`, which loops over the `projects` collection
(`_projects/*.md`). A white screen on this static site usually means one of:

- **H1** — the build failed or produced empty HTML
- **H2** — the deployed page is stale/failed on GitHub Pages
- **H3** — a client-side JS error halts rendering
- **H4** — CSS makes content invisible (color, overlay, `display:none`)
- **H5** — browser/CDN cache is serving a bad copy

Work through the steps in order. Stop at the first step whose decision branch fires,
and report: the failing artifact (log line / HTTP status / console error / CSS rule),
its file:line, and a one-line fix recommendation.

---

## 1. Check the local preview server log for build errors — *fastest signal, zero setup*

- Read `.preview-server.log` in the repo root in full (it's small).
- Look for Jekyll errors: `Liquid error`, `Front matter error`, `Could not open file`,
  or any non-zero exit / crash trace.

**Decision:** Any Liquid/front-matter error mentioning `projects-index.html` or a
`_projects/*.md` file → H1 confirmed; fix that file and jump to step 6 (re-verify).

## 2. Build the site locally and inspect the output HTML — *definitive test of H1*

- Run: `bundle exec jekyll build --trace 2>&1 | tee build.log`
  (if Ruby/Bundler aren't available, use Docker:
  `docker run --rm -v "%cd%":/src jekyll/jekyll:latest jekyll build --trace`)
- Then inspect `_site/projects.html`:
  - **Missing or empty** → build failure; re-run with `--trace` and report the exact error line.
  - **Contains a full `<main>…</main>` with project cards** → source renders fine;
    the problem is deployment (step 3) or client-side (steps 4–5).
- Also check `_site/` for the three project pages (`banks-street-market`, `gneiss-knits`,
  `pop-and-lock-8`) — missing ones mean a collection doc failed to process.

## 3. Check what GitHub Pages actually serves — *tests H2*

- Run: `curl -sI https://shilongpan.github.io/projects.html` and note the HTTP status
  (expect `200`; `404`/`500` is itself the diagnosis).
- Then: `curl -s https://shilongpan.github.io/projects.html | head -c 2000`.
  - **Empty body or error page** → deployment failed. Check Actions:
    `gh run list --workflow=pages-build-deployment --limit 5` and open the latest
    run's log for the build error.
  - **Full HTML in the response** → server side is fine; the white screen is client-side
    (steps 4–5).
- Compare against a known-good page (`curl -s https://shilongpan.github.io/ | head`)
  to rule out a whole-site deploy failure.

## 4. Reproduce locally and capture console + network errors — *tests H3*

- Serve the site: `bundle exec jekyll serve` (or reuse the existing preview server if
  `.preview-server.log` shows one is configured), then open
  `http://localhost:4000/projects.html`.
- DevTools → **Console**: any uncaught exception (e.g., in `profile-popup.js` or inline
  scripts) that fires before/while content paints is the culprit. Note the exact error
  and file:line.
- DevTools → **Network**: flag any 404/failing asset (CSS, JS, images). A failed
  `style.css` load can produce a "white" page if all styling depends on it.

**Decision:** Console shows an error only on `/projects.html` and not on `/` → the bug is
in code that layout or page loads; fix that script.

## 5. Rule out invisible-but-present content — *tests H4*

- In DevTools, with the white screen open: Elements panel → search for `<h1>Projects</h1>`.
  - **Present in DOM** → it's a CSS problem. Inspect computed styles on `body`, `main`,
    `.post-list`: check `color` vs `background-color` (white-on-white), `visibility`,
    `display:none`, `opacity:0`, and any full-viewport overlay (`position:fixed` element
    with high `z-index`) coming from `style.css` or the layout.
  - **Absent from DOM** → rendering never happened; return to steps 1–4 (build or JS failure).

## 6. Eliminate caching — *tests H5*

- Hard-reload (`Ctrl+Shift+R`) and/or open in a private/incognito window.
- If it renders there but not normally: clear site data for the domain; check
  `Cache-Control` headers from step 3's `curl -sI` output.

## 7. (Only if all above pass) Diff the layout chain

- Compare `_layouts/projects-index.html` → `_layouts/default.html` against a working
  page's chain (e.g., `blog.html`) to spot an unclosed tag or conditional that swallows
  the rest of the document.
