# Optimisation & Improvement Plan

Audit date: 2026-09-24 · Base commit: `4365b06` (render on demand with a static shadow map)

Confidence tags: **[Certain]** verified in code · **[Likely]** strong inference, measure before/after.

~~Main finding: every project change runs the framing engine ~7×; fixing phases 1–2 gives most of the gain.~~
**Corrected after measuring (Phase 0):** the engine is cheap. `computeAllWallFrames` takes ≈0.01–0.025 ms and
`buildModel` ≈0.3–0.5 ms on every template, so the ~7 repeated framing passes cost ≈0.2 ms per edit.
Engine work (phases 1–2) is not the bottleneck; look at rendering/GPU and storage (phases 3–5) first.

## How to use this file

- Tick `- [x]` a task when it is done; update the phase's **Status** in the board below.
- Status values: `todo` · `in progress` · `done` · `on hold` · `skipped` (write why in the log).
- Add a line to the **Progress log** at the bottom for every finished phase or decision,
  with the date and commit hash.

## Status board

| Phase | Topic | Impact | Status | Commit |
|---|---|---|---|---|
| 0 | Baseline measurements | — | in progress (engine done, browser todo) | |
| 1 | Compute wall frames once | ~~High~~ Negligible | on hold (measured ≈0.2 ms/edit) | |
| 2 | Hold statics/BOM during drags | ~~High~~ Low (≈0.5 ms/edit) | on hold | |
| 3 | Fewer IndexedDB writes (filter, not debounce) | Med | done | `980a1f5` |
| 4 | Stop hover from redrawing shadows | Med | done | `af1e074` |
| 5 | Reuse member + panel geometry | Med | done | `f99314a` |
| 6 | Stable dimension lines | **Med** (all remaining buffer churn) | done | `fdc2c42` |
| 7 | Hygiene (tsbuildinfo, ARIA tabs) | Low | done | `fe66429` |
| 8 | Tests & tooling (pricing/BOM tests, oxlint, CI) | Med | done | `94904b5` |

## Open decisions

- [ ] Phase 2: analysis refreshes **on drag end** (recommended) or throttled live (~150 ms)?

---

## Phase 0 — Baseline (do first, ~30 min)

Measure before changing anything, so each phase can be verified.

- [x] Time `buildModel` and `computeAllWallFrames` in Node over all `PROJECT_TEMPLATES` (200 runs each):

  | Template | Openings | `computeAllWallFrames` | `buildModel` |
  |---|---|---|---|
  | carport-single | 0 | 0.025 ms | 0.405 ms |
  | carport-double | 0 | 0.011 ms | 0.516 ms |
  | garden-shed | 2 | 0.008 ms | 0.525 ms |
  | terrace-roof | 0 | 0.009 ms | 0.307 ms |
- [ ] Record in the browser (dev server port 5180): time per edit for a slider change, and
      commits per second while dragging a post / vehicle / paved-area point (React Profiler).
- [ ] Record the number of `idbSet` calls during a 2 s drag.
- [ ] Note bundle sizes from `npm run build` (current: `three` 1.15 MB, `index` 590 KB).

---

## Phase 1 — Compute wall frames once [Certain] · Impact: High · Risk: Low

**Problem.** `computeAllWallFrames(project)` runs independently in:

| Caller | Location |
|---|---|
| `clampAllOpenings` (inside most reducers) | `src/store/projectStore.ts:196` |
| `useWallFrames()` → `Scene` | `src/components/3d/Scene.tsx:106` |
| `useWallFrames()` → `CameraRig` | `src/components/3d/CameraRig.tsx:51` |
| `useWallFrames()` → `OpeningsEditor` | `src/components/3d/OpeningsEditor.tsx:42` |
| `useWallFrames()` → `OpeningFixtures` | `src/components/3d/OpeningFixtures.tsx:155` |
| `useWallFrames()` → `WallEditor` | `src/components/ui/WallEditor.tsx:116` |

`buildFramingCanonical` also computes the same wall/partition frames internally
(`src/engine/framing/index.ts`, `computeWallFrame` / `computePartitionFrame` calls), then discards them.

**Plan.**
- [ ] `src/engine/framing/index.ts`: add a one-entry memo to `computeAllWallFrames`, keyed on
   the `project` object reference (`let last: { project, frames } | null`). Projects are immutable, so
   reference equality is safe. That covers all six callers, including `clampAllOpenings`.
   The store reducer then produces a new project, so the render-side calls miss the cache once, then share one result.
- [ ] `src/store/useModel.ts`: `useWallFrames` keeps its signature; the `useMemo` becomes a plain call
   through the memoised function (or keep `useMemo`, harmless).
- [ ] Optional follow-up: build the world frames from the frames `buildFramingCanonical` already
   computes (return them on `FramingResult` as `wallFrames`), so `buildModel` + render share one pass.
   Only do this if Phase 0 numbers show framing is still significant after step 1.

- [ ] **Tests.** Add `src/engine/wallFrames.test.ts`: same project reference → same object returned;
a changed project → new frames equal to a fresh computation (`deepStrictEqual`).

**Result.** ~7 framing passes per edit → 2 (one in the reducer, one on render; 1 after step 3).

---

## Phase 2 — Hold heavy results during drags [Certain] · Impact: High · Risk: Medium

**Problem.** `useModel()` (`src/store/useModel.ts:10`) reruns `buildModel` on every `set()`,
including every pointer-move while dragging: framing + EC5 statics + BOM + connections + vehicles + paving.

**Plan.**
- [ ] Split `buildModel` (`src/engine/index.ts:16`) into:
   - `buildGeometry(project)` → `{ framing, vehicles, paving }` (needed by the 3D view live)
   - `buildAnalysis(project, framingC)` → `{ statics, bom, cutList, connections }`
   `buildModel` stays as the composition of the two (tests and PDF export unchanged).
- [ ] `useModel()`: while `isDragging` is true, reuse the last analysis result and recompute only
   geometry. When `isDragging` goes false, recompute everything once.
- [ ] Check `ResultsPanel` / `PricingPanel` show the held values without flicker. Optionally dim them
   during a drag (`opacity-60`) so stale numbers are obvious.

**Decision needed:** analysis refreshes **on drag end** (recommended, simplest) vs throttled live (~150 ms).

**Watch out.** Statics-driven highlighting in the 3D view (utilisation colours, if any) will lag
until drag end. Check `Scene.tsx` for use of `model.statics` before merging.

---

## Phase 3 — Wait before saving to IndexedDB [Certain] · Impact: Medium · Risk: Low

**Problem.** zustand `persist` (`src/store/projectStore.ts:661`) serialises
`{ project, savedProjects, view }` and calls `idbSet` on **every** state change: drags, hover,
selection. `savedProjects` can be large and gets rewritten every time.

**Original plan (superseded, see Outcome):**
- [x] ~~Wrap `idbStorage.setItem` (`src/store/projectStore.ts:46`) in a trailing debounce (400 ms)
   that keeps only the latest value.~~
- [x] ~~Flush the pending write on `visibilitychange` (hidden) and `pagehide`, so closing the tab
   loses nothing.~~
- [x] ~~Keep the localStorage fallback path unchanged.~~

- [x] ~~**Tests.** Unit-test the debounce helper with a fake timer: 10 calls → 1 write with the last value;
flush writes immediately.~~

**Outcome: the debounce plan was dropped; a write filter shipped instead.**
- [x] ~~Trailing debounce (400 ms) + flush on `pagehide` / `visibilitychange`~~. Tested and **rejected**:
  an edit followed by a reload inside the 400 ms window was lost. The flush starts an async IndexedDB
  write the browser drops during unload.
- [x] `src/store/filteredStorage.ts`: `filterWrites(storage, paused)` wraps `idbStorage`, with no timer:
  - skips a write whose JSON equals the last one saved (hover, selection and other UI-only state);
  - skips writes while `isDragging`; the `setDragging(false)` at drag end saves the final state.
    Every drag end handles both pointer-up and pointer-cancel (Scene, OpeningsEditor, VehicleMesh,
    PavedAreaMesh, TimberMember, PanelMesh).
- [x] Tests: `src/store/filteredStorage.test.ts` (dedupe, pause/resume, remove).

**Measured** (`IDBObjectStore.put` calls):

| Action | Before | After |
|---|---|---|
| Hover sweep over 20 members | 21 | **0** |
| Select + deselect a member | 2 | **0** |
| 30-step drag | 62 | **1** |
| Single edit | 1 | 1 |

Drag end, then reload 100 ms later: final value restored. An edit followed by `location.reload()` in the
**same JS task** is lost with both old and new code (the async IDB write can't commit), so that's an existing limitation.
Known trade-off: closing the tab mid-drag loses that drag.

---

## Phase 4 — Stop hover from redrawing shadows [Likely] · Impact: Medium · Risk: Low

**Problem.** `Scene` subscribes to `hoveredMemberId` (`src/components/3d/Scene.tsx:75`), so every
hover re-renders it. The deps-less `useLayoutEffect` in `RenderLoop`
(`src/components/3d/renderLoop.tsx:35`) then sets `gl.shadowMap.needsUpdate = true` on each
commit, re-rendering the shadow map when only a material's emissive changed.

**Plan.**
- [x] ~~Split `RenderLoop`'s effect~~ Not needed: once hover no longer re-renders `Scene`, `RenderLoop`'s effect
   doesn't run on hover. R3F itself requests a frame on prop changes and mounts (`invalidateInstance`). Original idea:
   split `RenderLoop`'s effect: `invalidate()` on every commit (a frame is needed), but set
   `shadowMap.needsUpdate` only when `model` (or visible layers) change: pass `model` as a prop
   and use it as the effect's dependency.
- [x] Better: move hover highlighting out of `Scene`'s render into `TimberMember` (each member
   subscribes to `s.hoveredMemberId === member.id`), so a hover re-renders 2 members instead of the scene.

- [x] **Verify.** GPU frame time while sweeping the mouse over the model (Chrome Performance panel).
Shadows still update after a parameter edit and after WebGL context restore.
   **Measured** (default carport, WebGL draw calls counted per hover, 12 members):
   before **102** per hover (shadow pass included) → after **66** (no shadow pass). A `length` edit
   still draws 101–121 per change, so the shadow pass still runs. Hover highlight checked visually. 127/127 tests pass.
   Context-restore path unchanged (not re-tested).

---

## Phase 5 — Reuse member geometry [Certain] · Impact: Medium · Risk: Low

**Problem.** `useMemberGeometry` (`src/components/3d/TimberMember.tsx:31`) memoises on
`member.profile`, which is a new array after every `buildModel`, so every `ExtrudeGeometry` is
disposed and rebuilt on every edit, even for unchanged members.

**Plan.**
- [x] Memoise on a content key: `JSON.stringify(member.profile) + '|' + member.section.width`
   (or a cheap numeric hash). Unchanged members keep their geometry.
   **Done** via `src/components/3d/useKeyedGeometry.ts`, also applied to `PanelMesh` (roof, cladding,
   floor panels had the same problem). Vehicles / paved areas were fine: their data comes straight from the store.
   **Measured** (default carport, WebGL `createBuffer` calls per edit):

   | Edit | Before | After |
   |---|---|---|
   | Rename project (no geometry change) | 215 | 130 (0 with dimensions layer off) |
   | Front height ±100 mm | 210–215 | 165–170 |

   The remaining 130 come from `DimensionLines` (drei `<Line>` rebuilt on every project change): Phase 6.
   Checked visually: length 6000 → 9000 and height 2600 → 3200 resize members and roof correctly. 127/127 tests pass.
- [ ] Later, optional: a shared geometry cache with ref-counting, then `InstancedMesh` for high-count,
   non-interactive categories (use the pattern in `AnchorFixtures.tsx:45`). Needs per-instance
   selection handling, so only do it if draw calls show up as a bottleneck.

---

## Phase 6 — Narrow the `DimensionLines` selector [Certain] · Impact: Low–Med · Risk: Low

- [x] `src/components/3d/DimensionLines.tsx:53` selects the whole `project`; the memo at line 118
depends on it. Select only the fields actually read (`project.params`, …) so editing a vehicle or
a paved area doesn't rebuild every `Html` label.

**Done, and the selector turned out not to be the main issue:** `model` is also rebuilt on every
project change, so the list recomputed anyway. The real cost: `Dimension` builds new point arrays
on every render, and drei `<Line>` re-uploads its geometry when `points` changes identity.
- [x] `Dimension` wrapped in `memo` with a by-value comparator (points, offset, label, color).
  It also covers the drag rulers and paved-area dimensions that reuse it.
- [x] Selector narrowed to `s.project.params`.

**Measured** (WebGL `createBuffer` per edit, default carport, dimensions on):

| Edit | After Phase 5 | After Phase 6 |
|---|---|---|
| Rename project | 130 | **0** |
| Front height ±100 mm | 165–170 | 55–60 |

Labels checked after length/height edits (L, H1, Roof, α update and restore). 127/127 tests pass.

---

## Phase 7 — Hygiene · Risk: Low

- [x] **Stop tracking build caches [Certain].** `tsconfig.app.tsbuildinfo` and
      `tsconfig.node.tsbuildinfo` are committed. Add `*.tsbuildinfo` to `.gitignore`, then
      `git rm --cached tsconfig.*.tsbuildinfo`.
- [x] **ARIA tabs in `ResultsPanel` [Certain].** `src/components/ui/ResultsPanel.tsx:62-88`: add
      `role="tablist"` / `role="tab"` / `aria-selected`, following `ParameterSidebar.tsx:246-258`.
      Done: plus `role="tabpanel"` on the content and a translated `aria-label` ("Results sections", uk/de/pl).
      Accessibility tree checked: tablist "Results sections" with 6 tabs + tabpanel.

## Phase 8 — Tests & tooling · Risk: Low

- [x] **Pricing + BOM tests [Certain: none exist].** `src/engine/pricing/index.ts`,
      `src/engine/bom/index.ts`. Snapshot the default project and each `PROJECT_TEMPLATES` entry
      (totals, line counts, quantities), plus unit checks for area/length conversions (mm → m/m²).
      Done (`7dc1c0e`): 30 tests in `src/engine/bom.test.ts` and `src/engine/pricing.test.ts`. They check
      invariants per template instead of snapshots, so price/framing tweaks don't break them. Mutation-checked:
      a mm→m slip and a dropped hardware line each fail 4 tests.
- [x] **ESLint** with `typescript-eslint` + `eslint-plugin-react-hooks` (~~would have flagged
      the deps-less effect in Phase 4~~: it doesn't. An effect with no dependency array is legal React, so no rule catches Phase 4). Add a `lint` script.
      **Changed to oxlint** (`8564e8c`): typescript-eslint supports TypeScript ≤ 6.0 and this repo is on TS 7.
      `.oxlintrc.json`: correctness + rules-of-hooks + exhaustive-deps; `npm run lint` fails on warnings.
      React Compiler rules are off (false positives on R3F's mutable renderer objects). 3 intentional
      content-keyed hooks are annotated. Verified: removing a hook dep fails lint (exit 1).
- [x] **CI** (`.github/workflows/ci.yml`): `npm ci && npm run typecheck && npm test && npm run build`.
      The pre-commit hook (`scripts/git-hooks/pre-commit`) only bumps the version.
      Done: `.github/workflows/ci.yml` (Node 24; typecheck, lint, test, build on push to main and PRs).
      First run on push (run 36020532162) passed: typecheck, lint, test and build all green.
      Annotation: `actions/checkout@v4` / `setup-node@v4` target the deprecated Node 20 runtime; bump to v5 when convenient.

---

## Not planned (checked, low value)

- **i18n coverage:** the key types + `src/i18n/coverage.test.ts` already enforce it.
- **jsPDF bundle:** already imported lazily (`export.ts`) and split out via `manualChunks`.
- **History memory:** snapshots share structure; the 100-entry cap is fine for real projects.
- **Splitting large files** (`statics/index.ts`, `types/index.ts`, `projectStore.ts`, `ResultsPanel.tsx`):
  maintenance only, no user-visible gain. Do it opportunistically when touching those files.

---

## Suggested order

| Phase | Commit message | Depends on |
|---|---|---|
| 1 | Memoise wall frames per project | — |
| 2 | Hold statics/BOM results while dragging | 1 |
| 3 | Debounce IndexedDB persistence | — |
| 4 | Redraw shadows only on model change; hover in `TimberMember` | — |
| 5 | Content-keyed member geometry | — |
| 6 | Narrow `DimensionLines` selector | — |
| 7 | Untrack tsbuildinfo; ARIA tabs | — |
| 8 | Pricing/BOM tests, ESLint, CI | — |

After each perf commit: `npm run typecheck && npm test`, rerun the Phase 0 measurements, and
check the preview for regressions (drag, hover, shadows, PDF export, reload restores the project).

---

## Progress log

Newest first. Format: `YYYY-MM-DD · phase · what happened · commit`.

- 2026-09-24 · 8 · Pushed 8 commits; first CI run green · `94904b5`
- 2026-09-24 · 8 · BOM/pricing tests (`7dc1c0e`), oxlint instead of ESLint (`8564e8c`), GitHub Actions CI · see git log
- 2026-09-24 · 7 · `*.tsbuildinfo` untracked + ignored; ResultsPanel ARIA tabs · `fe66429`
- 2026-09-24 · 3 · Debounce rejected (lost an edit on quick reload); write filter shipped: hover 21 → 0, drag 62 → 1 IDB writes · `980a1f5`
- 2026-09-24 · 6 · `Dimension` memoised by value; no-op edit uploads 130 → 0 buffers, height edit 165 → 55 · `fdc2c42`
- 2026-09-24 · 5 · Member + panel geometry keyed on content; buffer uploads per no-op edit 215 → 130; rest is `DimensionLines` (Phase 6, raised to Med) · `f99314a`
- 2026-09-24 · 4 · Hover subscription moved from `Scene` into `TimberMember`; 102 → 66 draw calls per hover, shadow pass no longer runs on hover · `af1e074`
- 2026-09-24 · 1, 2 · Put on hold: engine timings (Phase 0 table) show ≈0.2 ms/edit of repeated framing and ≈0.5 ms per `buildModel`. At 60 drag events/s that is ≈30 ms/s: not worth the added code/cache risk. Revisit only if a browser profile shows otherwise · —
- 2026-09-24 · 0 · Engine timings measured in Node · —
- 2026-09-24 · — · Audit done, plan written · —
