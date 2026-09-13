/* ===========================================================================
 * resume.js — interactive skills panel for the résumé page
 * Extracted from resume.html (OPTIMIZATION.md P2-4) and merged into one
 * script so the shared `state` object (P1-2) is a single source of truth.
 *
 * Implemented items:
 *   P0-1  Orphaned skill tokens reconciled in HTML + dev integrity guard
 *   P0-2  countLines() fixed to use computed pixel line-height
 *   P0-3  Dead `visible` variable removed from filterSkills()
 *   P1-1  Highlight logic consolidated into shared helpers
 *   P1-2  Unified state object (pinnedItem / pinnedSkill / expandedItem)
 *   P1-3  Single document-level click handler (bubble phase)
 *   P1-4  Keyboard activation + ARIA live region for skill/timeline items
 *   P1-5  Placeholder text replaced in HTML + dev guard
 *   P2-1  Debounced hover highlight (~80 ms)
 *   P2-3  "Clear filter" control in the skills panel
 *   (P2-2 sessionStorage persistence intentionally skipped — see OPTIMIZATION.md)
 * =========================================================================== */
(function () {
  'use strict';

  var timelineItems = document.querySelectorAll('.timeline-item[data-skills]');
  var skillItems    = document.querySelectorAll('.skill-item[data-id]');
  var panel         = document.getElementById('skillsPanel');
  var closeBtn      = document.getElementById('skillsClose');
  var clearFilterBtn = document.getElementById('clearFilter');
  var filterStatusEl = document.getElementById('filterStatus');

  // ── P1-2: single source of truth for UI state ─────────────────────────────
  var state = {
    pinnedItem: null,    // DOM element or null
    pinnedSkill: null,   // string id or null
    expandedItem: null   // DOM element or null (collapsible descriptions)
  };

  function isMobile() { return window.matchMedia('(max-width: 900px)').matches; }

  // P1-4: announce filter results to screen readers
  function announce(count) {
    if (!filterStatusEl) return;
    filterStatusEl.textContent = 'Showing ' + count + ' matching entr' + (count === 1 ? 'y' : 'ies') + '.';
  }

  // ── P2-3: "Clear filter" control visibility ───────────────────────────────
  function updateClearFilterVisibility() {
    if (!clearFilterBtn) return;
    clearFilterBtn.hidden = !(state.pinnedSkill || state.pinnedItem);
  }

  // Restore all timeline items and dividers
  function restoreTimeline() {
    document.querySelectorAll('.timeline-item[data-skills]').forEach(function (item) {
      item.style.display = '';
    });
    document.querySelectorAll('.timeline-divider').forEach(function (divider) {
      divider.style.display = '';
    });
  }

  // Clear all highlights, filters, and pins (does NOT touch state.expandedItem)
  function clearAll() {
    timelineItems.forEach(function (item) { item.classList.remove('highlighted'); });
    skillItems.forEach(function (skill) {
      skill.classList.remove('highlighted');
      skill.style.display = '';
    });
    document.querySelectorAll('.skill-group').forEach(function (group) { group.style.display = ''; });
    restoreTimeline();
    state.pinnedItem = null;
    state.pinnedSkill = null;
    if (filterStatusEl) filterStatusEl.textContent = '';
    updateClearFilterVisibility();
  }

  // ── P1-1: shared highlight helpers (single definition of the rules) ───────
  // Highlight items whose data-skills contains any of the given ids
  function highlightItemsForSkills(ids) {
    timelineItems.forEach(function (item) {
      var itemIds = item.getAttribute('data-skills').split(',');
      var match = ids.some(function (id) { return itemIds.indexOf(id) !== -1; });
      item.classList.toggle('highlighted', match);
    });
  }

  // Highlight skills whose data-id is in the given set
  function highlightSkillsForIds(ids) {
    skillItems.forEach(function (skill) {
      var match = ids.indexOf(skill.getAttribute('data-id')) !== -1;
      skill.classList.toggle('highlighted', match);
    });
  }

  // Highlight one timeline item plus its matching skills (self + panel)
  function highlightItemAndSkills(item) {
    var ids = item.getAttribute('data-skills').split(',');
    item.classList.add('highlighted');
    highlightSkillsForIds(ids);
    return ids;
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  // Filter skill items to only show those whose data-id is in the given set
  function filterSkills(ids) {
    var visibleCount = 0;
    skillItems.forEach(function (skill) {
      var show = ids.indexOf(skill.getAttribute('data-id')) !== -1;
      skill.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });
    // Hide skill groups that have no visible items (P0-3: dead `visible` line removed)
    document.querySelectorAll('.skill-group').forEach(function (group) {
      var hasVisible = false;
      group.querySelectorAll('.skill-item').forEach(function (s) {
        if (s.style.display !== 'none') hasVisible = true;
      });
      group.style.display = hasVisible ? '' : 'none';
    });
    announce(visibleCount);
  }

  // Filter timeline items to show only those containing the given skill
  function filterTimelineBySkill(skillId) {
    var activePanel = document.querySelector('.resume-panel:not([hidden])');
    if (!activePanel) return;
    var timeline = activePanel.querySelector('.timeline');
    if (!timeline) return;
    var items = timeline.querySelectorAll('.timeline-item[data-skills]');
    var matchCount = 0;
    items.forEach(function (item) {
      var skills = item.getAttribute('data-skills').split(',');
      var matches = skills.indexOf(skillId) !== -1;
      if (matches) matchCount++;
      item.style.display = matches ? '' : 'none';
      // Hide the divider that follows a hidden item
      var divider = item.nextElementSibling;
      if (divider && divider.classList.contains('timeline-divider')) {
        divider.style.display = 'none';
      }
    });
    announce(matchCount);
  }

  // ── Tabs: infinite-loop carousel (active tab always anchored to the left) ──
  //
  //  .resume-tabs  is a fixed-width clipping window (the visible strip).
  //  .resume-tab-track holds the N real tabs plus trailing clones and is
  //  shifted with translateX so the ACTIVE tab is always flush to the left.
  //  Clicking any tab animates the track until that tab is the leftmost one.
  var tablist  = document.querySelector('.resume-tabs');
  var tabTrack = tablist ? tablist.querySelector('.resume-tab-track') : null;
  var panels   = document.querySelectorAll('.resume-panel');

  // Canonical tab order. Read the real tabs first (data-index drives the order),
  // BEFORE any clones are appended.
  var logicalTabs = Array.prototype.slice.call(
    (tabTrack ? tabTrack : document).querySelectorAll('.resume-tab')
  ).sort(function (a, b) {
    return (parseInt(a.dataset.index, 10) || 0) - (parseInt(b.dataset.index, 10) || 0);
  });
  var N = logicalTabs.length;

  // Append non-interactive clones so the strip wraps seamlessly. A trailing set
  // is enough: with the active tab pinned to the left edge, a clicked tab is
  // always within the next N-1 slots, and after that move the tabs to the
  // right of the (new) active tab are all real ones. The clone simply fills the
  // wrap-around gap and is never highlighted or clickable.
  if (tabTrack && N > 0) {
    logicalTabs.forEach(function (t) {
      var c = t.cloneNode(true);
      c.classList.add('tab-clone');
      c.removeAttribute('id');            // keep the real tab the sole id owner
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('tabindex', '-1');
      tabTrack.appendChild(c);
    });
  }

  // Width of one slot (real tab + gap). Recomputed on resize — fonts/padding
  // are responsive, so the pixel step changes across breakpoints.
  var step = 0;
  function measureStep() {
    var a = tabTrack.children[0], b = tabTrack.children[1];
    if (a && b) step = Math.round(b.offsetLeft - a.offsetLeft);
  }

  var activeIndex = 0;   // logical index of the active tab (0..N-1)
  var anchor      = 0;   // track slot pinned to the left edge

  // Position the track so the active tab is exactly at the left edge.
  // animate=false hard-jumps (no transition); animate=true eases via CSS.
  function positionTrack(animate) {
    if (!tabTrack || !step) return;
    tabTrack.style.transition = animate ? '' : 'none';
    tabTrack.style.transform  = 'translateX(' + (-anchor * step) + 'px)';
    if (!animate) {
      void tabTrack.offsetWidth;          // commit the jump before re-enabling transitions
      tabTrack.style.transition = '';
    }
  }

  // Paint the active state on the real tabs; clones stay neutral.
  function paintActive() {
    logicalTabs.forEach(function (t) {
      var isSel = (t === logicalTabs[activeIndex]);
      t.classList.toggle('active', isSel);
      t.setAttribute('aria-selected', isSel ? 'true' : 'false');
    });
    if (tabTrack) tabTrack.querySelectorAll('.tab-clone').forEach(function (c) { c.classList.remove('active'); });
  }

  function showPanelFor(index) {
    var slug = logicalTabs[index].id.replace('tab-', '');
    panels.forEach(function (p) { p.hidden = true; });
    var target = document.getElementById('panel-' + slug);
    if (target) target.hidden = false;
  }

  function activateTab(index, animate) {
    if (N === 0) return;
    index = ((index % N) + N) % N;            // normalise (allows +N for "next")
    var prev = activeIndex;
    activeIndex = index;

    showPanelFor(index);
    paintActive();

    // Choose the slot to land on: the one that needs the least movement, then
    // snap the anchor back into the real-tab region [0, N-1] (whole loops only,
    // so the visible window is unchanged) so we never drift off the track end.
    if (step && N > 1) {
      var fwd  = (index - prev + N) % N;      // 0..N-1, steps right of current active
      var base = anchor + fwd;
      if (base >= N) base -= N;
      if (base < 0)  base += N;
      anchor = base;
    }
    positionTrack(animate !== false);

    // P1-2 documented behaviour on tab switch:
    //  - a pinned SKILL persists and is re-applied to the new panel;
    //  - a pinned ITEM is cleared, because it may not exist in the new panel.
    state.pinnedItem = null;
    if (state.pinnedSkill) {
      applyPinnedSkill();
    } else {
      clearAll();
    }
  }

  // Clicking a tab scrolls the loop until it reaches the left edge.
  if (tabTrack) {
    tabTrack.addEventListener('click', function (e) {
      var tab = e.target.closest('.resume-tab:not(.tab-clone)');
      if (!tab) return;
      activateTab(parseInt(tab.dataset.index, 10), true);
    });
  }

  // Keyboard navigation on the tablist (arrows wrap, Home/End jump) —
  // "next/prev" always follow the loop direction, so it never reverses.
  if (tablist) {
    tablist.addEventListener('keydown', function (e) {
      var focusTab = document.activeElement;
      if (!focusTab || !focusTab.classList || !focusTab.classList.contains('resume-tab')) return;
      var i = parseInt(focusTab.dataset.index, 10); if (isNaN(i)) i = 0;
      var next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = i + 1;      // +N wraps
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = i - 1 + N; // wrap to the other side
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End')  next = N - 1;
      else return;
      e.preventDefault();
      logicalTabs[next % N].focus();
      activateTab(next, true);
    });
  }

  // Re-measure the slot width and re-anchor when the layout changes size.
  window.addEventListener('resize', function () {
    measureStep();
    positionTrack(false);
  });

  measureStep();
  positionTrack(false);
  paintActive();

  // ── Mobile: slide-out panel ────────────────────────────────────────────────
  function openPanel()  { if (panel) panel.classList.add('open'); }
  function closePanel() { if (panel) panel.classList.remove('open'); }

  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      closePanel();
      clearAll();
    });
  }

  // Escape closes the slide-out panel (mobile)
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel && panel.classList.contains('open')) {
      closePanel();
      clearAll();
    }
  });

  // ── P2-3: "Clear filter" button in the skills panel ───────────────────────
  if (clearFilterBtn) {
    clearFilterBtn.addEventListener('click', function () {
      clearAll();
    });
  }

  // ── Desktop: click to pin highlight, hover to preview ─────────────────────
  function pinHighlight(item) {
    clearAll();
    var ids = highlightItemAndSkills(item);
    filterSkills(ids);
    state.pinnedItem = item;
    updateClearFilterVisibility();
  }

  // Apply the currently pinned skill to the active panel: filter its
  // timeline entries and highlight the matching items + the pinned skill.
  function applyPinnedSkill() {
    if (!state.pinnedSkill) return;
    restoreTimeline();
    filterTimelineBySkill(state.pinnedSkill);
    highlightSkillsForIds([state.pinnedSkill]);
    highlightItemsForSkills([state.pinnedSkill]);
    updateClearFilterVisibility();
  }

  // Pin a skill: highlight it and filter timeline entries
  function pinSkill(skillId) {
    clearAll();
    state.pinnedSkill = skillId;
    applyPinnedSkill();
  }

  // Clear skill pin (also calls clearAll which restores the timeline)
  function clearSkillPin() {
    clearAll();
    state.pinnedSkill = null;
  }

  // ── P2-1: debounced hover highlight to reduce flicker ─────────────────────
  var HOVER_DEBOUNCE_MS = 80;
  var hoverTimer = null;

  function scheduleItemHover(item) {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(function () {
      if (isMobile()) return;
      if (state.pinnedItem || state.pinnedSkill) return; // don't override pinned selection
      clearAll();
      highlightItemAndSkills(item);
    }, HOVER_DEBOUNCE_MS);
  }

  function cancelItemHover() {
    clearTimeout(hoverTimer);
    hoverTimer = null;
    if (isMobile()) return;
    if (state.pinnedItem || state.pinnedSkill) return; // don't clear pinned selection
    clearAll();
  }

  timelineItems.forEach(function (item) {
    item.addEventListener('click', function () {
      if (isMobile()) {
        // Tap on mobile → open panel + highlight matching skills
        clearAll();
        highlightItemAndSkills(this);
        openPanel();
        return;
      }
      // Re-pinning an already-pinned item is idempotent (clearAll + re-pin).
      pinHighlight(item);
    });

    item.addEventListener('mouseenter', function () { scheduleItemHover(this); });
    item.addEventListener('mouseleave', function () { cancelItemHover(); });
  });

  skillItems.forEach(function (skill) {
    skill.addEventListener('mouseenter', function () {
      if (isMobile()) return;
      if (state.pinnedItem || state.pinnedSkill) return; // don't override pinned selection
      clearAll();
      var id = this.getAttribute('data-id');
      highlightSkillsForIds([id]);
      highlightItemsForSkills([id]);
    });
    skill.addEventListener('mouseleave', function () {
      if (isMobile()) return;
      if (state.pinnedItem || state.pinnedSkill) return; // don't clear pinned selection
      clearAll();
    });
    skill.addEventListener('click', function () {
      if (isMobile()) return;
      var id = this.getAttribute('data-id');
      if (state.pinnedSkill === id) {
        clearSkillPin();
      } else {
        pinSkill(id);
      }
    });
  });

  // ── Collapsible descriptions (merged from second IIFE; P1-2 state sharing) ─
  // Wrap EVERY description paragraph so collapsed entries show only
  // year / title / org — no text at all until the entry is expanded.
  document.querySelectorAll('.timeline-item p').forEach(function (p) {
    if (p.classList.contains('org') || p.querySelector('a')) return;
    if (!p.textContent.trim()) return;

    var text = p.textContent.trim();
    p.style.cursor = 'pointer';
    p.innerHTML = '';
    var wrapper = document.createElement('span');
    wrapper.className = 'collapsible-desc';
    wrapper.textContent = text;
    p.appendChild(wrapper);
  });

  // Expand an item's description (desktop only — on mobile entries stay
  // fully expanded via the CSS media query, so there is nothing to toggle)
  function expandItem(item) {
    if (isMobile()) return;
    if (state.expandedItem === item) return;
    collapseAllDescs();
    var descs = item.querySelectorAll('.collapsible-desc');
    if (descs.length) {
      descs.forEach(function (d) { d.classList.add('expanded'); });
      state.expandedItem = item;
    }
  }

  // Collapse all descriptions (desktop only — mobile entries never collapse)
  function collapseAllDescs() {
    if (isMobile()) return;
    if (state.expandedItem) {
      state.expandedItem.querySelectorAll('.collapsible-desc').forEach(function (d) {
        d.classList.remove('expanded');
      });
      state.expandedItem = null;
    }
  }

  // ── P1-3: single document-level click handler (bubble phase) ──────────────
  // Replaces the former mobile-backdrop, desktop-deselect, and capture-phase
  // expand/collapse handlers. Ordering is explicit and no longer fragile.
  document.addEventListener('click', function (e) {
    var target = e.target;

    // 1) Timeline item → expand / collapse its description
    var item = target.closest('.timeline-item[data-skills]');
    if (item) {
      expandItem(item);
      return;
    }

    // 2) Mobile: tapping the open panel or its backdrop closes it again
    if (isMobile() && panel && panel.classList.contains('open')) {
      closePanel();
      clearAll();
      return;
    }

    // 3) Desktop: deselect pinned skill / item when clicking elsewhere.
    //    Tabs are excluded so switching tabs keeps the current selection.
    if (!isMobile()) {
      var isSkill = target.closest('.skill-item');
      var isTab   = target.closest('.resume-tab');
      if (state.pinnedSkill && !isSkill && !isTab) {
        clearSkillPin();
      } else if (state.pinnedItem && !isTab) {
        clearAll();
      }
    }

    // 4) Clicked outside the skills panel and tabs → collapse descriptions
    if (!target.closest('.resume-secondary') && !target.closest('.resume-tabs')) {
      collapseAllDescs();
    }
  });

  // ── P1-4: keyboard accessibility for skill items and timeline items ───────
  function makeActivatable(el) {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    });
  }
  skillItems.forEach(makeActivatable);
  timelineItems.forEach(makeActivatable);

  // ── Dev-only guards (P0-1 data integrity, P1-5 placeholder content) ───────
  if (typeof console !== 'undefined' && console.warn) {
    var panelIds = new Set();
    skillItems.forEach(function (s) { panelIds.add(s.getAttribute('data-id')); });
    var itemTokens = new Set();
    timelineItems.forEach(function (it) {
      it.getAttribute('data-skills').split(',').forEach(function (t) { itemTokens.add(t.trim()); });
    });
    var missingFromPanel = Array.from(itemTokens).filter(function (t) { return !panelIds.has(t); });
    var neverReferenced  = Array.from(panelIds).filter(function (id) { return !itemTokens.has(id); });
    if (missingFromPanel.length) console.warn('[resume] Tokens in items but missing from panel:', missingFromPanel);
    if (neverReferenced.length)  console.warn('[resume] Panel skills never referenced by any item:', neverReferenced);

    document.querySelectorAll('.timeline-item').forEach(function (el) {
      if (el.textContent.indexOf('[Placeholder') !== -1) {
        var title = el.querySelector('h3');
        console.warn('[resume] Placeholder text in:', title ? title.textContent : '(untitled item)');
      }
    });

    // New guard: check for whitespace in tokens and validate kebab-case format
    var validPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    timelineItems.forEach(function (it) {
      var tokens = it.getAttribute('data-skills').split(',');
      tokens.forEach(function (t) {
        if (/\s/.test(t)) {
          console.warn('[resume] Token with whitespace in data-skills:', JSON.stringify(t), 'in item:', it.querySelector('h3') ? it.querySelector('h3').textContent : '(untitled)');
        } else if (!validPattern.test(t)) {
          console.warn('[resume] Token not valid kebab-case:', JSON.stringify(t), 'in item:', it.querySelector('h3') ? it.querySelector('h3').textContent : '(untitled)');
        }
      });
    });
  }

})();
