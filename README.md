# Timber Structure Designer

A client-side, zero-backend 3D parametric designer for small monopitch (Pultdach) timber
structures: carports, garden sheds, terrace roofs (Überdachungen) and similar post-and-beam
constructions. Everything – geometry, framing, statics, bill of materials, cutting list and
connector counts – is computed live in the browser and auto-saved to IndexedDB.

## Stack

| Concern | Choice |
| --- | --- |
| UI | React 19 + TypeScript (strict), Tailwind CSS 4, Lucide icons |
| 3D | three.js via `@react-three/fiber` + `@react-three/drei` |
| State | Zustand 5 with `persist` → IndexedDB (`idb-keyval`), localStorage fallback |
| Calculations | pure TypeScript modules under `src/engine` (no React dependencies) |
| Export | JSON (project), CSV (cut list), PDF (`jspdf` + `jspdf-autotable`, lazy-loaded) |

```bash
npm install
npm run dev        # http://localhost:5173 (or the port Vite picks)
npm run build      # type-check + production bundle in dist/
```

## Project layout

```
src/
  types/            domain types (params, walls, openings, members, results)
  engine/
    geometry.ts     vector / profile helpers (mm)
    framing/        roofLines, wallFrame, structure (posts, purlins, braces),
                    roof (rafters + birdsmouths), openings (rules), walls (studs, headers)
    statics/        materials (EN 338 / EN 14080), simplified EC5 checks
    bom/            BOM by category + grouped cutting list
    joinery/        connector / traditional-joint quantities
    index.ts        buildModel(project) → DerivedModel
  store/            Zustand store (persisted), templates, derived-model hooks
  components/3d/    Scene, TimberMember (extruded profiles), PanelMesh, DimensionLines,
                    OpeningsEditor (drag & drop on the wall plane), MeasureTool, CameraRig
  components/ui/    parameter sidebar, wall/opening editor, results panel, viewport controls
  utils/export.ts   JSON / CSV / PDF export
```

## Coordinate system & conventions

* Units are **millimetres** in the engine; the scene uses metres (1 unit = 1 m).
* X = length (left → right), Z = width (front → rear), Y = up.
* `L` and `W` are the **outer** dimensions of the post frame; posts are centred `post.width/2` inside.
* `H1` = top of the front purlin (high eave), `H2` = top of the rear purlin. The roof pitch follows from
  `atan((H1 − H2) / (W − post.width))`.
* Every member is described by a local frame (`start`, `direction`, `up`) plus a 2D outline (`profile`)
  in the length/height plane that already contains end cuts and notches. The renderer extrudes the
  outline by the section width – so plumb cuts, 45° brace ends, sloped stud tops and birdsmouths
  (Kerven) are modelled exactly and their lengths/angles feed the cutting list.

## Framing logic (`engine/framing`)

* **Post grid** – bays along X are `ceil((L − post) / maxPostSpacing)`; intermediate posts along Z are
  added only under sloped side rails of closed side walls.
* **Purlins** run the full roof width (`L + overhangs`) and are spliced over a post when longer than
  `maxStockLength`.
* **Rafters** are spaced `≤ maxRafterSpacing`, edge-aligned to the roof outline, with plumb cuts and a
  birdsmouth of `h/4` (20 mm ≤ t ≤ h/3) whose vertical face bears on the downhill face of each purlin.
* **Knee braces** (Kopfbänder) are 45° with vertical/horizontal end cuts; length = leg·√2 + h.
* **Closed walls** get a flat bottom plate (interrupted at doors), studs at `≤ maxStudSpacing`, and
  around every opening king studs, jack studs, a header (depth by span: 120/160/200/240) and, for
  windows, a sill with cripples. Side walls carry a sloped rail (Rähm) and studs with sloped top cuts.
* Openings are clamped to their bay (2 stud widths from posts) and below the header zone; drag them in
  3D or use the wall elevation preset for 2D positioning.
* **Partition walls** (Trennwände, `engine/framing/partitions.ts`) divide the footprint into sections.
  A partition runs either along the length (at a Z offset, level top plate) or across the width (at an
  X offset, sloped top plate like the side walls), is a stud wall of the stud depth with end studs, a
  bottom plate, a top plate 10 mm under the rafters and single-sided boarding. It is clamped clear of
  the purlins and corner posts, carries openings like an outer wall (same drag/clamp machinery, keyed
  by its id instead of a `WallId`), counts in BOM / cut list / statics headers and blocks vehicles.

## Vehicles (`engine/vehicles.ts`)

A catalogue of real vehicle sizes (city car … camper van, approximate manufacturer data incl. mirror
width) can be placed under the roof. Vehicles are dragged on the ground plane in 3D (50 mm snap),
nudged with the arrow keys (Shift 10 mm, Alt 250 mm), rotated with R or the rotation field, and are
saved with the project. For every vehicle the engine checks: coverage by the roof outline, headroom
under the lowest member above the footprint (rafters, purlin undersides, knee braces), and collisions
with posts and closed walls – all using the mirror width. Results show as a coloured footprint, a
label on the selected vehicle, and entries in the *Checks* tab.

## Post count

The number of posts per purlin row is derived from `maxPostSpacing` by default; switch the
"Post count per row: automatic" toggle off to set it explicitly (e.g. 3 posts on an 8 m row). The
resulting spacing feeds the purlin and post checks, and a warning is raised when it exceeds the
recommended maximum.

## Statics (`engine/statics`)

A simplified pre-design check following Eurocode 5 principles – **not** a substitute for an engineer:

* Loads per m² of plan: covering dead load (table) + rafter self-weight, snow `μ1(α)·s_k`
  (EN 1991-1-3 monopitch), ULS combination `1.35·G + 1.5·Q`.
* Rafters: simply supported between purlins (sloped span) with the longer overhang as cantilever;
  bending, shear (`k_cr = 0.67`), `w_inst ≤ L/300`, `w_fin ≤ L/200` with `k_def`.
* Purlins: post spacing as simply supported span (conservative for continuous beams).
* Posts: axial compression with EC5 `k_c` buckling reduction (`β_c` 0.2 solid / 0.1 glulam).
* Headers: infill-wall self-weight plus a nominal 0.5 kN/m.
* Status: green < 85 %, yellow 85–100 %, red > 100 %, with a section recommendation on failure.
  Wind, uplift, lateral stability, connections and fire are outside the scope.

## Persistence

The current project, saved presets and layer settings are written to IndexedDB on every change and
restored on load. Nothing leaves the browser.
