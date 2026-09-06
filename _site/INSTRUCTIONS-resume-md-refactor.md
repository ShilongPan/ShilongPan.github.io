# Agent Task: Data-Driven Refactor of the Résumé Page

You are refactoring the résumé page of a Jekyll personal site (GitHub Pages) so that every
résumé entry lives in its own Markdown file and the skills panel is generated from a single
editable data file — mirroring how blog posts already work. **All existing interactive
functionality must be preserved.**

---

## 1. Context

**Site layout (current):**

| File | Role |
|---|---|
| `resume.html` | Static page. All 32 résumé entries hardcoded as `.timeline-item` divs inside 5 tab panels; the skills panel (9 categories, ~64 skills) also hardcoded. |
| `resume.js` | All interactivity: tabs, hover highlight, click-to-pin filtering, collapsible descriptions, mobile slide-out panel, keyboard accessibility, dev-only console guards. **Purely DOM-driven** — it only reads classes and `data-*` attributes. |
| `_posts/*.md` + `_layouts/blog-index.html` | The blog pattern to imitate: thin page file with frontmatter pointing at a layout that loops over content files. |
| `_config.yml` | Jekyll config (kramdown, plugins). Collections are core Jekyll — no plugin needed. |
| `resume_backup.html` | Pre-existing backup. **Do not modify or delete.** Use it as a visual reference if you break something. |

**Key insight:** `resume.js` never touches data — it queries `.timeline-item[data-skills]`,
`.skill-item[data-id]`, `.skill-group`, `.timeline-divider`, tab/panel ids, etc. Therefore the
refactor is a **rendering-layer change only**: if the generated HTML is structurally identical
to today's, `resume.js` keeps working with zero modifications.

**Do NOT:**
- Rewrite or "improve" `resume.js`.
- Change visual design, CSS, tab labels, or the profile paragraph text.
- Touch `resume_backup.html`, blog files, or other pages (except the one-line `_config.yml` addition).
- Invent new skills, drop existing ones, or reword entry descriptions during migration — copy content verbatim (HTML entities like `&amp;` become plain `&`).

---

## 2. Target file structure

```
_resume/                          ← new Jekyll collection folder (underscore = private)
  employment/*.md                 ← one file per entry, kebab-case slugs
  academia/*.md
  involvements/*.md
  awards/*.md
  interests/*.md
_data/
  skills.yml                      ← new: single source of truth for the skills panel
_layouts/
  resume.html                     ← new layout: full page markup + Liquid loops
resume.html                       ← rewritten as a thin page file (like blog.html)
_config.yml                       ← add the collection registration
```

`resume.js`, `style.css`, everything else: unchanged.

---

## 3. Entry Markdown schema (one file per entry)

Each entry is a Markdown file with YAML frontmatter plus a Markdown body (the description).

```markdown
---
section: employment            # one of: employment | academia | involvements | awards | interests
title: "Commercial Climbing Forerunner"
organization: "Gneiss Climbing"
dateline: "2026 — Present"     # free-form, exactly as shown on the site today (em dash, "Present", seasons)
order: 1                       # integer; display order within its section (1 = first/top)
skills:                        # list of skill IDs that MUST exist in _data/skills.yml
  - communication
  - collaboration
  - adaptability
---
Test and adjust new climbing routes to ensure accessibility, safety, and quality. Approach
problems with diverse and flexible attitudes to create solutions as part of a skilled team.
Acquire new insight into route design and integrate into related roles.
```

Rules:
- **Always double-quote** `title`, `organization`, `dateline` (they contain colons, ampersands, em dashes).
- The body is kramdown Markdown; it renders to one or more `<p>` elements inside the timeline item. Keep the description text verbatim from the current HTML.
- Filename: kebab-case slug of the title, e.g. `_resume/employment/commercial-climbing-forerunner.md`. Two entries may share a title (e.g. "Undergraduate Research Assistant" appears twice) — disambiguate with the org: `undergraduate-research-assistant-plantsmart-lab.md`.
- The file's folder and its `section:` field must agree; the layout filters on the frontmatter field.

**Expected entry counts (sanity check after migration):** employment 10, academia 2, involvements 11, awards 3, interests 6 — **32 total**. If you find a different number in `resume.html`, trust the HTML and note the discrepancy.

---

## 4. Skills registry: `_data/skills.yml`

One file, two lists. Categories render in the order listed; skills within a category render in
the order listed. This is the **only** place skills are defined — entries only reference IDs.

```yaml
# _data/skills.yml
categories:
  - id: leadership-management
    name: "Leadership & Management"
  - id: communication
    name: "Communication"
  # ... one entry per current panel group, in current on-page order

skills:
  - id: leadership
    label: "Leadership"
    category: leadership-management
  - id: supervision
    label: "Supervision"
    category: leadership-management
  # ... every skill from the current panel, preserving IDs and labels exactly
```

Rules:
- **IDs must match the existing `data-id` / `data-skills` tokens in `resume.html` exactly** (kebab-case). They are referenced by ~32 entries; renaming one breaks its links.
- Copy every skill from the current hardcoded panel, preserving label text (e.g. `English (Native)`, `Data Analysis & Visualization`) and group membership.
- **Future-proofing requirement (why this shape):** adding a new skill later = appending ONE item to `skills:` with an existing `category` id. Adding a new category = one item in `categories:` plus the skills that reference it. No HTML, JS, or other files ever need editing for skill changes.

---

## 5. `_config.yml` change

Add (core Jekyll feature; no plugin required):

```yaml
collections:
  resume_entries:
    output: false        # entries are data only — never published as their own pages
```

---

## 6. Rendering contract (CRITICAL)

The generated DOM must be **structurally identical** to the current static markup, because
`resume.js` depends on it exactly. For each section panel, render:

```html
<div class="resume-panel" id="panel-SECTION" role="tabpanel" aria-labelledby="tab-SECTION" hidden?>
  <div class="timeline">
    {% for entry in entries %}
      {% unless forloop.last %}<div class="timeline-divider"></div>{% endunless %}
      <div class="timeline-item" data-skills="{{ entry.skills | join: ',' }}" tabindex="0" role="button">
        <span class="year">{{ entry.dateline }}</span>
        <h3>{{ entry.title }}</h3>
        <p class="org">{{ entry.organization }}</p>
        {{ entry.content }}          <!-- Markdown body → description <p>s -->
      </div>
    {% endfor %}
  </div>
</div>
```

And the skills panel:

```html
{% for cat in site.data.skills.categories %}
  <div class="skill-group">
    <h3>{{ cat.name }}</h3>
    <ul class="skill-list">
      {% for skill in site.data.skills.skills %}
        {% if skill.category == cat.id %}
          <li class="skill-item" data-id="{{ skill.id }}">{{ skill.label }}</li>
        {% endif %}
      {% endfor %}
    </ul>
  </div>
{% endfor %}
```

Notes:
- Sort entries explicitly: `{% assign entries = site.resume_entries | where: "section", "employment" | sort: "order" %}` (do not rely on collection order).
- Keep the tab bar, panel ids (`panel-employment`, `tab-employment`, …), `hidden` attributes (only `panel-employment` visible by default), ARIA wiring, the profile block, the footer, the `#filterStatus` live region, and the profile-popup markup exactly as they are in today's `resume.html`.
- **Normalize the relative links** while you're rewriting the page: current `resume.html` uses `../style.css`, `../index.html`, etc. Since it lives at the site root, use same-folder paths (`style.css`, `index.html`, `blog.html`, `contact.html`) — matching how `index.html` links to it.

---

## 7. Page/layout split (mirror the blog pattern)

- `_layouts/resume.html`: full `<html>…</html>` document (copy today's `resume.html`), with the five timeline panels and the skills panel replaced by the Liquid loops above.
- `resume.html` becomes:

```yaml
---
layout: resume
title: Résumé
---
```

(Compare `blog.html`, which is just frontmatter pointing at `blog-index`.)

---

## 8. Dev guards (preserve + extend)

The existing console guards in `resume.js` (orphaned skill tokens, placeholder text) keep working
unchanged because they read the rendered DOM — and since the panel now comes from the registry,
"token in an entry but missing from the panel" now means "skill ID not registered in
`_data/skills.yml`". Keep them.

**Add one new guard** at the end of `resume.js`'s existing dev-guard block (this is the only
allowed edit to that file): for each `.timeline-item[data-skills]`, warn if any token contains
whitespace or doesn't match `/^[a-z0-9]+(-[a-z0-9]+)*$/` — catches typos like `data-analysis ` or
`Data Analysis`. Keep the style consistent with the surrounding code (plain JS, no dependencies).

---

## 9. Execution steps

1. **Inventory first.** Read all of `resume.html`. List every entry per section (title, org, dateline, skills) and every skill group/ID/label. Cross-check counts against §3.
2. **Create `_data/skills.yml`** from the current panel (§4). Verify: every `data-id` in the panel appears exactly once; every token used in any `data-skills` attribute exists in the registry.
3. **Create the 32 entry files** under `_resume/<section>/` (§3), copying content verbatim and preserving each entry's skill list exactly. Assign `order:` values matching current top-to-bottom display order within each section.
4. **Register the collection** in `_config.yml` (§5).
5. **Create `_layouts/resume.html`** from today's `resume.html`, replacing hardcoded panels/panel with Liquid loops per §6, and normalize relative links.
6. **Rewrite `resume.html`** as the thin frontmatter file (§7).
7. **Add the new dev guard** to `resume.js` (§8) — nothing else in that file.
8. **Build & verify** (see §10).

---

## 10. Verification checklist

Run `bundle exec jekyll serve --livereload` (a Gemfile/lock already exist) and check **all** of:

- [ ] All five tabs render the same entries, in the same order, with identical text as before (diff against `resume_backup.html` content if unsure).
- [ ] Skills panel shows all 9 categories in the original order with every original skill.
- [ ] Hover a timeline entry → matching skills highlight; hover a skill → matching entries highlight (desktop).
- [ ] Click an entry → skills filter to that entry's set; click a skill → timeline filters to matching entries; "Clear filter" button appears and works.
- [ ] Pinned skill persists across tab switches; pinned item clears on tab switch (existing behavior).
- [ ] Click a description → it expands/collapses (desktop); clicking elsewhere collapses.
- [ ] Mobile (≤900 px): tapping an entry opens the slide-out skills panel with highlights; tapping backdrop closes it.
- [ ] Keyboard: arrow keys move between tabs; Enter/Space activates entries and skills.
- [ ] Console: **no** `[resume]` warnings about tokens missing from the panel or never referenced (the current site may warn about never-referenced panel skills — that state must not get worse).
- [ ] `feed.xml`, blog, home, contact pages still build and render.
- [ ] No `.md` entry files are published as browsable pages (`output: false`).

**Acceptance test for the user's core goal:** add a brand-new skill by appending one item to
`_data/skills.yml` (using an existing category) and referencing it in one entry's `skills:` list —
rebuild, and the skill appears in the panel and highlights correctly with no other file touched.
Then remove the test additions.

---

## 11. Deliverable summary for the user

When done, report: files created/modified, entry count per section, skill/category counts, any
content discrepancies found during migration, and confirmation that every checklist item in §10
passed.
