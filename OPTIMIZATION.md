# Optimization Instructions — `resume.html` Interactive Skills Panel

> **Scope:** The interactive résumé page at `resume.html` (single-file Jekyll page, ~815 lines).
> All line numbers refer to the current file. Read each instruction's **Acceptance** before marking it done.
> Do **not** change visual design unless an instruction explicitly says so.

---

## 0 · Feature Inventory (what the page does today)

| Feature | Mechanism | Status |
|---|---|---|
| Tab navigation (5 panels) | `activateTab()` + ARIA tablist | ✅ Works |
| Keyboard tab nav (arrows / Home / End) | `keydown` on `.resume-tabs` | ✅ Works |
| Hover timeline item → highlight matching skills (desktop) | `mouseenter` / `mouseleave` per item | ⚠️ Works but duplicated logic |
| Click timeline item → pin highlight + filter skills panel (desktop) | `pinHighlight()` + `filterSkills()` | ⚠️ Works, but orphaned tokens break it |
| Hover skill → highlight matching items (desktop) | `mouseenter` / `mouseleave` per skill | ⚠️ Works but duplicated logic |
| Click skill → pin + filter timeline items (desktop) | `pinSkill()` + `filterTimelineBySkill()` | ✅ Works |
| Mobile: tap item → open slide-out panel | `openPanel()` + inline highlight | ✅ Works |
| Collapsible long descriptions (> 3 lines) | `countLines()` + `.collapsible-desc` CSS | ❌ Broken — truncates *everything* |
| Click outside → deselect | Two `document` click listeners | ⚠️ Fragile ordering |

---

## P0 — Bugs (fix first; each one breaks a user-facing feature)

### P0-1 · Orphaned skill tokens produce an empty skills panel

**Problem.** 20 tokens appear in `data-skills` attributes on timeline items but have **no** matching `data-id` in the skills panel (`#skillsPanel`). Conversely, 4 panel skills (`french`, `lightroom`, `linux`, `model-direction`) are never referenced by any item.

Consequence: clicking **"Rock Climbing"** (tokens `climbing,fitness,teamwork,perseverance`) or **"Reading"** (`reading,continuous-learning,curiosity`) calls `filterSkills(ids)`, which hides *every* skill → the panel goes completely blank. Hovering `french`, `lightroom`, `linux`, or `model-direction` highlights nothing.

**Orphaned tokens (in items, missing from panel):**
`academic-excellence`, `climbing`, `community-building`, `competitive-awards`, `continuous-learning`, `creativity`, `curiosity`, `design`, `discipline`, `fitness`, `grant-writing`, `perseverance`, `philanthropy`, `reading`, `service`, `storytelling`, `team-leadership`, `teamwork`, `technical-repair`, `volunteerism`

**Orphaned panel skills (in panel, never in any item):**
`french`, `lightroom`, `linux`, `model-direction`

**Steps.**

1. **Decide the canonical vocabulary.** For each orphaned token above, either:
   - **(a)** Add a matching `<li class="skill-item" data-id="…">…</li>` to the appropriate skill-group in `#skillsPanel` (lines ~370–425), **or**
   - **(b)** Remove the token from every `data-skills` attribute that references it.
   Choose per-token based on whether the skill is meaningful to display. A reasonable default: add the missing ones to a new **"Personal & Interests"** group (or fold them into existing groups like *Physical & Athletic*, *Design & Creative*).

2. **For each orphaned panel skill** (`french`, `lightroom`, `linux`, `model-direction`), either:
   - **(a)** Add the token to at least one relevant `data-skills` attribute (e.g., add `french` to a language-related item, `lightroom` to the Photography hobby, `linux` to a lab/tech item, `model-direction` to the Wellness Peer or 3MT item), **or**
   - **(b)** Remove the `<li>` from the panel if it's no longer relevant.

3. **Add a data-integrity guard.** At the bottom of the main IIFE (before the closing `})();` around line ~740), add a dev-only console warning that cross-checks the two sets:

   ```js
   // Dev guard: warn about orphaned skill tokens
   if (typeof console !== 'undefined' && console.warn) {
     var panelIds = new Set();
     skillItems.forEach(function(s){ panelIds.add(s.getAttribute('data-id')); });
     var itemTokens = new Set();
     timelineItems.forEach(function(it){
       it.getAttribute('data-skills').split(',').forEach(function(t){ itemTokens.add(t.trim()); });
     });
     var missingFromPanel = [...itemTokens].filter(function(t){ return !panelIds.has(t); });
     var neverReferenced  = [...panelIds].filter(function(id){ return !itemTokens.has(id); });
     if (missingFromPanel.length) console.warn('[resume] Tokens in items but missing from panel:', missingFromPanel);
     if (neverReferenced.length)  console.warn('[resume] Panel skills never referenced by any item:', neverReferenced);
   }
   ```

**Acceptance.**
- Clicking every timeline item in every tab opens a skills panel with **at least one visible skill**.
- Hovering / clicking every skill in the panel highlights **at least one** timeline item.
- Opening DevTools console on a clean page shows **no** `[resume]` warnings.

---

### P0-2 · `countLines()` always returns a large number → every description is truncated

**Problem.** `resume.html:744–752`. The function creates a hidden `<span>` with `line-height: 1.6` (unitless multiplier) and then computes:

```js
var lines = Math.round(temp.scrollHeight / LINE_HEIGHT);   // scrollHeight(px) ÷ 1.6
```

`scrollHeight` is in **pixels** (e.g. ~77 px for 3 lines at 16 px font). Dividing by the unitless `1.6` yields ~48, which is always > `MAX_HEIGHT_LINES` (3). The guard `if (lines <= MAX_HEIGHT_LINES) return;` **never fires**, so every description — even one-liners — gets wrapped in `.collapsible-desc` and truncated to 3 em with a fade gradient.

**Steps.**

1. Replace the division with the **computed pixel line-height**:

   ```js
   function countLines(text, width) {
     var temp = document.createElement('span');
     temp.style.cssText = 'position:absolute;visibility:hidden;display:block;' +
                          'width:' + width + 'px;line-height:' + LINE_HEIGHT + ';';
     temp.textContent = text;
     document.body.appendChild(temp);
     var pixelLineHeight = parseFloat(getComputedStyle(temp).lineHeight) || 16 * LINE_HEIGHT;
     var lines = Math.round(temp.scrollHeight / pixelLineHeight);
     document.body.removeChild(temp);
     return lines;
   }
   ```

2. **Verify** in the browser: one-line descriptions (e.g. "Spring 2020" items, short award descriptions) should render as plain text with **no** fade gradient and **no** pointer cursor. Only genuinely multi-line (> 3 line) descriptions should be collapsible.

**Acceptance.**
- Descriptions of ≤ 3 rendered lines appear in full, without the `::after` fade or `cursor: pointer`.
- Descriptions > 3 lines are truncated at 3 em with the fade; clicking expands them (existing `.expanded` behaviour).
- No JavaScript errors in console.

---

### P0-3 · Dead code in `filterSkills()`

**Problem.** `resume.html:462`:

```js
var visible = group.querySelectorAll('.skill-item[style="display: "], .skill-item:not([style])');
```

`visible` is assigned but never read. The real check is the loop two lines below. Remove the dead line to avoid confusion.

**Steps.** Delete line 462 (the `var visible = …` assignment). Keep the `hasVisible` loop that follows it.

**Acceptance.** `filterSkills()` still hides groups with no visible skills; no reference to `visible` remains in the file.

---

## P1 — Correctness, Maintainability & Accessibility

### P1-1 · Consolidate duplicated highlight logic into one helper

**Problem.** The pattern "highlight matching items + matching skills" is copy-pasted in **five** places:

| Location | Context |
|---|---|
| ~line 560 | Mobile tap handler |
| `pinHighlight()` ~line 578 | Desktop click-to-pin item |
| ~line 660 | Desktop `mouseenter` on item |
| ~line 710 | Desktop `mouseenter` on skill |
| `applyPinnedSkill()` ~line 620 | Re-apply pinned skill after tab switch |

Each copy independently iterates `skillItems` / `timelineItems` and toggles `.highlighted`. A change to the highlight rule must be made in 5 places.

**Steps.**

1. Add two small helpers near the top of the IIFE (after `clearAll`):

   ```js
   // Highlight items whose data-skills contains any of the given ids
   function highlightItemsForSkills(ids) {
     timelineItems.forEach(function(item) {
       var itemIds = item.getAttribute('data-skills').split(',');
       var match = ids.some(function(id){ return itemIds.indexOf(id) !== -1; });
       item.classList.toggle('highlighted', match);
     });
   }

   // Highlight skills whose data-id is in the given set
   function highlightSkillsForIds(ids) {
     skillItems.forEach(function(skill) {
       var match = ids.indexOf(skill.getAttribute('data-id')) !== -1;
       skill.classList.toggle('highlighted', match);
     });
   }
   ```

2. Replace the inline loops in all five locations with calls to these helpers. For example, `pinHighlight` becomes:

   ```js
   function pinHighlight(item) {
     clearAll();
     var ids = item.getAttribute('data-skills').split(',');
     item.classList.add('highlighted');
     highlightSkillsForIds(ids);
     filterSkills(ids);
     pinnedItem = item;
   }
   ```

3. In `applyPinnedSkill`, replace the two `forEach` loops with:
   ```js
   highlightSkillsForIds([pinnedSkill]);
   // For items, we need "contains this one id":
   timelineItems.forEach(function(item) {
     var skills = item.getAttribute('data-skills').split(',');
     item.classList.toggle('highlighted', skills.indexOf(pinnedSkill) !== -1);
   });
   ```
   (The single-id case can stay inline or you add a `highlightItemsForSingleSkill(id)` wrapper.)

**Acceptance.** Search the file for `classList.add('highlighted')` and `classList.toggle('highlighted'` — total occurrences should drop from ~10 to ≤ 5 (one per helper + the item-self highlight). All existing interactions still work identically.

---

### P1-2 · Unify state into a single object; fix persistence across tab switches

**Problem.** Three independent variables track UI state:

```js
var pinnedItem   = null;   // line ~570
var pinnedSkill  = null;   // line ~571
var expandedItem = null;   // line ~742 (second IIFE)
```

- `clearAll()` (line ~448) mutates `pinnedItem` and `pinnedSkill`, which are **declared later** via hoisted `var`. It works but is confusing.
- Pinned **skills** persist across tab switches (`activateTab` re-applies them). Pinned **items** are silently cleared by `clearAll()` inside `activateTab`. Inconsistent.
- `expandedItem` lives in a separate IIFE with no coordination.

**Steps.**

1. Create a single state object at the top of the main IIFE (before `clearAll`):

   ```js
   var state = {
     pinnedItem: null,    // DOM element or null
     pinnedSkill: null,   // string id or null
     expandedItem: null   // DOM element or null (moved here from second IIFE)
   };
   ```

2. Replace every reference to `pinnedItem`, `pinnedSkill`, and `expandedItem` with `state.pinnedItem`, etc.

3. In `clearAll()`, reset the state:
   ```js
   function clearAll() {
     // …existing DOM cleanup…
     state.pinnedItem  = null;
     state.pinnedSkill = null;
   }
   ```
   (Do **not** reset `state.expandedItem` here — that's managed by the collapsible IIFE.)

4. In `activateTab()`, decide explicitly: if `state.pinnedSkill` is set, re-apply it; otherwise clear highlights. If `state.pinnedItem` is set, either re-apply it or clear it — **pick one behaviour and document it in a comment**. Recommended: clear the pinned item (it may not exist in the new panel) but keep the pinned skill.

5. Move the `expandedItem` logic into the main IIFE or expose it via `state` so both scripts share one source of truth. If keeping two IIFEs, at minimum read/write `state.expandedItem` from a shared scope (e.g., attach to `window.__resumeState` or merge the IIFEs).

**Acceptance.**
- No bare `pinnedItem` / `pinnedSkill` / `expandedItem` variables remain outside the `state` object.
- Switching tabs while a skill is pinned keeps the skill highlighted and re-filters the new panel.
- Switching tabs while an item is pinned clears the item highlight (documented behaviour).
- Expanding a description in one tab, switching tabs, and coming back does not leave a stale `.expanded` class.

---

### P1-3 · Reduce to one document-level click handler

**Problem.** Three `document.addEventListener('click', …)` handlers compete:

| Line | Purpose | Phase |
|---|---|---|
| ~543 | Mobile backdrop close | bubble |
| ~678 | Desktop deselect (pinned item / skill) | bubble |
| ~794 | Collapsible expand/collapse | **capture** (`true`) |

The capture-phase listener exists only to fire *before* the others so that `stopPropagation()` in item/skill handlers doesn't prevent it. This is fragile: any new handler added between them can break the ordering.

**Steps.**

1. Merge all three into a **single** document-level click handler (bubble phase, no capture):

   ```js
   document.addEventListener('click', function(e) {
     var target = e.target;

     // 1) Collapsible: expand / collapse description
     var item = target.closest('.timeline-item[data-skills]');
     if (item) {
       // …expand/collapse logic…
       return;
     }

     // 2) Mobile: close panel on backdrop tap
     if (isMobile() && panel && panel.classList.contains('open')
         && !panel.contains(target) && !item) {
       closePanel();
       clearAll();
       return;
     }

     // 3) Desktop: deselect pinned item / skill
     if (!isMobile()) {
       var isSkill = target.closest('.skill-item');
       var isTab   = target.closest('.resume-tab');
       if (state.pinnedSkill && !isSkill && !isTab) {
         clearSkillPin();
       } else if (state.pinnedItem && !item && !isTab) {
         clearAll();
       }
     }

     // 4) Clicked outside everything → collapse description
     if (!target.closest('.resume-secondary') && !target.closest('.resume-tabs')) {
       collapseAllDescs();
     }
   });
   ```

2. Remove the three old `document.addEventListener('click', …)` calls.

3. Remove the `e.stopPropagation()` calls from the mobile tap handler and the skill click handler that existed solely to prevent the document handlers from firing (they're no longer needed since the single handler checks `closest()`).

**Acceptance.**
- Exactly **one** `document.addEventListener('click', …)` in the file.
- All existing interactions (mobile close, desktop deselect, expand/collapse) work identically.
- No `stopPropagation()` calls remain that exist only to guard against document-level handlers.

---

### P1-4 · Keyboard accessibility for skill items and timeline items

**Problem.** Skill `<li>` elements and timeline item `<div>` elements are interactive (clickable, hoverable) but:
- Not focusable (`tabindex` missing).
- No `role="button"` or equivalent.
- No `keydown` handler for Enter / Space.
- Screen readers announce them as plain list items / divs.

**Steps.**

1. Add `tabindex="0"` and `role="button"` to every `.skill-item` `<li>` and every `.timeline-item[data-skills]` `<div>`. (You can do this in HTML or via a small init loop.)

2. Add a shared keydown handler:

   ```js
   function activateOnKeydown(el) {
     el.addEventListener('keydown', function(e) {
       if (e.key === 'Enter' || e.key === ' ') {
         e.preventDefault();
         el.click();
       }
     });
   }
   skillItems.forEach(activateOnKeydown);
   timelineItems.forEach(activateOnKeydown);
   ```

3. Add an ARIA live region to announce filter results (insert once in the HTML, after `#skillsPanel`):

   ```html
   <div aria-live="polite" class="sr-only" id="filterStatus"></div>
   ```

   In `filterSkills()` and `filterTimelineBySkill()`, update its text:
   ```js
   document.getElementById('filterStatus').textContent =
     'Showing ' + visibleCount + ' matching entr' + (visibleCount === 1 ? 'y' : 'ies') + '.';
   ```

4. Add a `.sr-only` utility class to `style.css` if not present:
   ```css
   .sr-only {
     position: absolute; width: 1px; height: 1px;
     padding: 0; margin: -1px; overflow: hidden;
     clip: rect(0,0,0,0); white-space: nowrap; border: 0;
   }
   ```

**Acceptance.**
- Tab key cycles through all skill items and timeline items.
- Enter / Space on a focused skill or item triggers the same action as a click.
- A screen reader (or `aria-live` inspection) announces the number of visible results after filtering.

---

### P1-5 · Guard against placeholder content in production

**Problem.** Several timeline items contain the literal text `[Placeholder description]` (e.g., most "Other Involvements" and several "Interests" entries). These are visible to visitors.

**Steps.**

1. Search the file for `[Placeholder` and either:
   - Replace each with a real one-sentence description, **or**
   - Remove the `<p>` element entirely (the item still shows year + title + org).

2. Add a dev-only console warning (in the same guard block as P0-1) that flags any `.timeline-item` whose text content contains `[Placeholder`:

   ```js
   document.querySelectorAll('.timeline-item').forEach(function(el) {
     if (el.textContent.indexOf('[Placeholder') !== -1) {
       console.warn('[resume] Placeholder text in:', el.querySelector('h3')?.textContent);
     }
   });
   ```

**Acceptance.** No visitor-visible `[Placeholder` text remains. Console warning fires for any that are missed.

---

## P2 — Enhancements (nice-to-have; do after P0 + P1)

### P2-1 · Debounce the hover highlight to reduce flicker

Rapidly moving the mouse across many timeline items causes a cascade of `clearAll()` → re-highlight cycles, which can flicker. Add a small debounce (~80 ms) to the `mouseenter` handlers so that only the last hovered item under 80 ms of stillness triggers the highlight. Use a shared `setTimeout` / `clearTimeout` pair.

**Acceptance.** Sweeping the mouse across 5+ items in < 500 ms produces at most one visible highlight transition (the final item). No flicker.

---

### P2-2 · Persist pinned skill in `sessionStorage`

If a user pins a skill, switches tabs, and comes back, the pin survives (already works). But if they navigate away and return to the page, it's lost. Optionally persist `state.pinnedSkill` in `sessionStorage` so a refresh within the same tab restores it.

**Acceptance.** Pin a skill → reload the page → the skill is still pinned and the timeline is filtered. (Only if this is desired; skip if it feels surprising.)

---

### P2-3 · Add a "Clear filter" button in the skills panel

When a skill is pinned, the user must click outside or re-click the skill to clear. A small "×" or "Clear" link at the top of `#skillsPanel` (next to the existing mobile close button) would make this more discoverable on desktop.

**Acceptance.** A visible "Clear" control appears in the skills panel when a filter is active; clicking it calls `clearSkillPin()` and restores all items.

---

### P2-4 · Extract the inline `<script>` blocks into an external file

The page has two large inline `<script>` blocks (~350 lines total). Moving them to `resume.js` (or `assets/resume.js`) would:
- Allow caching across page loads.
- Enable linting / minification in the build pipeline.
- Keep the HTML file under 500 lines for easier review.

**Acceptance.** `resume.html` contains no inline `<script>` blocks (except the tiny profile-popup include). A new `resume.js` file is referenced via `<script src="resume.js" defer></script>`. Lint passes with zero errors.

---

## Quick-Reference: File & Line Map

| Concern | File | Lines (approx.) |
|---|---|---|
| Skills panel HTML | `resume.html` | 340 – 425 |
| Timeline items (all tabs) | `resume.html` | 60 – 330 |
| Main IIFE (tabs, highlight, pin) | `resume.html` | 430 – 740 |
| Collapsible descriptions IIFE | `resume.html` | 741 – 810 |
| `.collapsible-desc` CSS | `style.css` | 305 – 335 |
| `.skill-item.highlighted` CSS | `style.css` | 514 – 520 |
| `.timeline-item.highlighted` CSS | `style.css` | 533 – 537 |

---

## Suggested Order of Work

```
P0-1  Orphaned tokens          ← breaks core feature; do first
P0-2  countLines fix           ← breaks every description
P0-3  Dead code removal        ← trivial, do while in the file
─────────────────────────────────────────────────
P1-1  Consolidate highlight    ← reduces duplication before refactoring state
P1-2  Unify state object       ← makes P1-3 and P1-4 safer
P1-3  Single click handler     ← removes fragile ordering
P1-4  Keyboard + ARIA          ← accessibility
P1-5  Placeholder content      ← quick content fix
─────────────────────────────────────────────────
P2-*  Enhancements             ← only after all P0/P1 pass
```

Each item is independently shippable. Test in a real browser (desktop + mobile viewport) after each P0 fix and after the full P1 batch.
