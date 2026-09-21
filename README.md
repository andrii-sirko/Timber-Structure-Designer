# Timber Structure Designer

A 3D parametric designer for small monopitch (Pultdach) timber structures such as carports, garden
sheds, terrace roofs (Überdachungen) and similar post-and-beam constructions. It runs entirely in the
browser with no backend. Geometry, framing, statics, bill of materials, cutting list, connector counts
and a cost estimate are all computed live and auto-saved to IndexedDB.

## Features

* **Parametric frame**: footprint, eave heights, overhangs, sections and spacings. There are two roof
  schemes (level purlins, or sloped purlins for gable-entry carports), and the roof can slope towards
  any of the four walls.
* **Walls and openings**: each outer wall can be closed over its whole length or part of it. Partition
  walls, doors and windows come from a catalogue with standard sizes (DIN 18100 / 18111 rough openings)
  and are drawn as 3D fixtures. A timber floor (on a slab or on bearers) is optional.
* **Direct 3D editing**: posts, intermediate purlins, outer walls, wall extents, partitions, openings
  (move and edge-resize), vehicles and paved areas can all be dragged. Edits snap to a grid and can be
  nudged with the keyboard. Posts can also be placed freely anywhere under the roof.
* **Object catalogue**: real-size cars, vans, campers, two-wheelers, waste bins and garden equipment,
  each checked against the roof coverage, headroom and collisions.
* **Paved areas**: polygon paving with editable vertices, stone patterns and colours, and area,
  perimeter and stone-count estimates.
* **Statics**: simplified Eurocode 5 pre-design checks. An auto-fix solver sizes members up until
  every check passes, and a cost optimiser sizes them back down to the cheapest valid sections.
  Individual sections can be locked.
* **Quantities and cost**: BOM by category, grouped cutting list, connector or traditional joint
  counts, frame anchors, and a price estimate built from editable unit prices.
* **Measuring**: a measuring tool, dimension lines, and clear gap / axis distances from any member to
  its neighbours.
* **Assembly guide**: a step-by-step 3D player, plus a printable PDF with drawings of each step.
* **Export**: project JSON (import and export), cutting list as CSV and PDF, assembly guide as PDF.
* **Undo/redo** with a labelled history. Rapid repeats such as drags, typing and arrow nudges collapse
  into a single step.
* **UI in English, Ukrainian, German and Polish**, including PDFs and material names.
* **Responsive layout**: panels dock beside the viewport on desktop and float over it on tablets, with
  larger touch targets.

## Stack

| Concern | Choice |
| --- | --- |
| UI | React 19 + TypeScript (strict), Tailwind CSS 4, Lucide icons |
| 3D | three.js via `@react-three/fiber` + `@react-three/drei` |
| State | Zustand 5 with `persist` → IndexedDB (`idb-keyval`), localStorage fallback; prices in localStorage |
| Calculations | pure TypeScript modules under `src/engine` (no React dependencies) |
| Export | JSON, CSV, PDF (`jspdf` + `jspdf-autotable`, lazy-loaded, DejaVu font embedded for Cyrillic) |
| Tests | Node's built-in test runner (`node:test`), `@/` alias registered by `scripts/register-alias.mjs` |
| Build / deploy | Vite 8 (three.js and PDF code split into separate chunks), Vercel |

```bash
npm install        # also points git at scripts/git-hooks
npm run dev        # http://localhost:5173 (or the port Vite picks)
npm test           # engine, i18n and UI-helper unit tests
npm run typecheck  # tsc -b
npm run build      # type-check + production bundle in dist/
```

The `pre-commit` hook bumps the patch version on every commit. The app shows this version in the
info panel (`__APP_VERSION__`, injected by `vite.config.ts`).

## Project layout

```
src/
  types/            domain types (params, walls, openings, members, results)
  engine/
    geometry.ts     vector / profile helpers (mm)
    orientation.ts  world ↔ canonical frame for the roof direction
    framing/        roofLines, wallFrame, structure (posts, purlins, braces), roof (rafters +
                    birdsmouths), openings + openingCatalog + openingResize, walls, partitions, floor
    statics/        materials (EN 338 / EN 14080), EC5 checks, autofix, cost optimisation
    bom/            BOM by category + grouped cutting list
    joinery/        connector / traditional-joint quantities, frame anchors
    pricing/        default unit prices and cost computation
    vehicles.ts     object catalogue and coverage / headroom / collision checks
    paving.ts       paved-area polygons, areas, stone counts
    neighbours.ts   OBB-based clear gap / axis distances between members
    freePosts.ts, postOverrides.ts
                    free-standing posts and per-post position / size overrides
    *Drag.ts, wallKeyboard.ts
                    pure drag / keyboard maths for posts, purlins, walls, wall extents, partitions
    assembly.ts     assembly steps and custom step order
    index.ts        buildModel(project) → DerivedModel
  store/            Zustand stores (project, UI, prices), undo/redo history, defaults + normalisation
  i18n/             dictionary-based translations (EN / UK / DE / PL) + coverage test
  components/3d/    Scene, TimberMember (extruded profiles), PanelMesh, DimensionLines, OpeningsEditor,
                    OpeningFixtures, AnchorFixtures, VehicleMesh, FurnitureBody, PavedAreaMesh,
                    NeighbourDistances, MeasureTool, CameraRig
  components/ui/    parameter sidebar, wall editor, results / pricing / paving / vehicles / neighbour
                    / assembly panels, project menu, history controls, viewport controls
  utils/            export.ts (JSON / CSV / PDF cut list), assemblyPdf.ts + assemblyRender.ts
                    (printable guide; step drawings rendered off screen as three.js line art), pdfFont.ts
```

## Coordinate system & conventions

* The engine works in **millimetres**. The scene uses metres (1 unit = 1 m).
* X = length (left → right), Z = width (front → rear), Y = up.
* `L` and `W` are the **outer** dimensions of the post frame. Posts are centred `post.width/2` inside.
* `H1` = top of the high-eave purlin, `H2` = top of the low-eave purlin. The roof pitch follows from
  `atan((H1 − H2) / (W − post.width))`.
* Every member is described by a local frame (`start`, `direction`, `up`) and a 2D outline (`profile`)
  in the length/height plane. The outline already contains the end cuts and notches, and the renderer
  extrudes it by the section width. Plumb cuts, 45° brace ends, sloped stud tops and birdsmouths
  (Kerven) are therefore modelled exactly, and their lengths and angles feed the cutting list.

## Roof orientation & schemes

The framing engine knows a single **canonical** layout: the roof slopes down from the front purlin (H1)
to the rear purlin (H2) along +Z. `roofDirection` names the world wall that carries the low eave.
`orientation.ts` rotates a world project into the canonical frame (`canonicalizeProject`) and rotates
the generated geometry back (`framingToWorld`).

`roofScheme` chooses between two framing layouts:

* `classic`: level purlins along X on the front and rear post rows, with rafters running down the slope
  (Pfettendach).
* `sloped-purlins`: post rows run down the slope on stepped posts and carry sloped purlins, with level
  rafters spanning across. The knee braces stand along the slope, so a car can drive in through either
  eave without hitting a brace.

## Framing logic (`engine/framing`)

* **Post grid**: bays along X number `ceil((L − post) / maxPostSpacing)`. Alternatively, set the post
  count per row explicitly by switching off "Post count per row: automatic". A warning appears when the
  resulting spacing exceeds the recommended maximum. Intermediate posts along Z are added only under the
  sloped side rails of closed side walls. Individual posts can be moved or resized through overrides.
* **Free posts** (`freePosts.ts`) can be placed with a click anywhere under the roof outline. Within a
  purlin's width of a row axis they carry the purlin; elsewhere they carry the rafters.
* **Purlins** run the full roof width (`L + overhangs`). A purlin longer than `maxStockLength` is
  spliced over a post. Intermediate purlin rows can be dragged across the slope.
* **Rafters** are spaced at most `maxRafterSpacing` apart and aligned to the edges of the roof outline.
  They have plumb cuts and a birdsmouth of `h/4` (20 mm ≤ t ≤ h/3) whose vertical face bears on the
  downhill face of each purlin.
* **Knee braces** (Kopfbänder) are set at 45° with vertical and horizontal end cuts; length = leg·√2 + h.
* **Closed walls** get a flat bottom plate (interrupted at doors) and studs at no more than
  `maxStudSpacing`. Every opening is framed with king studs, jack studs and a header (depth by span:
  120/160/200/240). Windows also get a sill with cripples. Side walls carry a sloped rail (Rähm) and
  studs with sloped top cuts. An outer wall can be closed over only part of its length; drag the end
  studs to change that stretch.
* **Openings** come from a door/window catalogue that supplies the frame size, rough opening, default
  sill height and purchase items. Custom sizes are also possible. Each opening is clamped to its bay
  (2 stud widths from the posts) and kept below the header zone. Openings can be dragged or
  edge-resized in 3D, or positioned in the 2D wall elevation.
* **Partition walls** (Trennwände, `partitions.ts`) divide the footprint into sections. A partition
  runs either along the length (at a Z offset, with a level top plate) or across the width (at an X
  offset, with a sloped top plate like the side walls). It is a stud wall of the stud depth with end
  studs, a bottom plate, a top plate 10 mm under the rafters, and boarding on one side. It is kept
  clear of the purlins and corner posts and carries openings like an outer wall. Dragging the body
  moves the partition; dragging its end studs resizes it. Partitions count in the BOM, cut list and
  statics headers, and they block vehicles.
* **Floor** (`floor.ts`): joists on a slab or on bearers over pads, with spruce boards, OSB or larch
  decking, and imposed-load presets (EN 1991-1-1 categories, simplified).
* **Anchors** (`joinery/anchors.ts`): post bases, frame anchors along the bottom plates (ends inset,
  evenly spaced), and angle brackets at the free end studs of walls.

## Objects (`engine/vehicles.ts`)

The catalogue holds real-size objects based on approximate manufacturer data, including mirror width.
It covers cars, vans and campers, a motorcycle and a bicycle, waste bins and containers, and lawn
mowers. Place objects with the "Add object" picker, then:

* drag them on the ground plane (50 mm snap);
* nudge them with the arrow keys (Shift = 10 mm, Alt = 250 mm);
* rotate them with R or the rotation field.

For every object, using the mirror width, the engine checks:

* whether the roof outline covers it;
* headroom under the lowest member above its footprint (rafters, purlin undersides, knee braces);
* collisions with posts, closed walls and partitions.

Results appear as a coloured footprint, as a label on the selected object and as entries in the
*Checks* tab.

## Paved areas (`engine/paving.ts`)

Paved floors are ground polygons. The default is a rectangle covering the roof plan. Vertices can be
dragged, and a new vertex is inserted at an edge midpoint. A polygon that intersects itself is flagged.
Each area has a stone pattern, stone size, joint width and colour. The panel reports area, perimeter
and an estimated stone count.

## Statics (`engine/statics`)

These are simplified pre-design checks that follow Eurocode 5 (EN 1995-1-1) principles. They are
**not** a substitute for a structural engineer.

* **Loads** per m² of plan:
  * dead load from the roof covering (trapezoidal sheet, polycarbonate, bitumen shingles, tiles or
    green roof) plus self-weight;
  * snow `μ1(α)·s_k` (EN 1991-1-3, monopitch);
  * wind as canopy pressure and suction.
* **ULS combinations** (EN 1990 6.10): snow leading, wind leading, and snow leading with accompanying
  wind (ψ₀). All use `k_mod` / `γ_M` design strengths.
* **Rafters and purlins**: bending, shear (`k_cr = 0.67`), and deflection `w_inst ≤ L/300`,
  `w_fin ≤ L/200` with `k_def` (cantilevers checked as 2a). Knee braces count as an elastic support
  for purlins.
* **Posts**: compression with EC5 `k_c` buckling reduction (`β_c` 0.2 for solid timber, 0.1 for
  glulam). The buckling length in each direction follows the actual bracing system.
* **Lateral stability** is checked per direction, depending on the bracing:
  * knee braces act as compression struts;
  * boarded walls act as shear walls;
  * without either, the posts act as cantilevers under combined compression and bending, with a
    notional sway load added.
* **Uplift**: roof suction is compared with the dead load, giving the net anchor tension per post.
* **Headers**: infill-wall self-weight plus a nominal 0.5 kN/m. **Floor**: joist and bearer spans.
* **Status**: green below 85 %, yellow 85–100 %, red above 100 %. A failing member gets a section
  recommendation.
* **Auto-fix** (`autofix.ts`) steps the governing parameters up the standard size ladders until every
  check passes or no lever is left. The levers are deeper sections, closer rafter spacing, more posts,
  and enabling or enlarging braces. **Cost optimisation** finds the smallest lower sections that still
  pass. Sections listed in `lockedSections` are never changed.
* **Out of scope**: connections, fire, foundations and second-order effects.

## Pricing (`engine/pricing`)

Default unit prices (EUR incl. VAT) are based on list prices in the Berlin/Potsdam region and cover
timber, roofing, cladding, decking, doors and windows, and hardware. Timber is stored in EUR/m³, so
the price stays correct when a section changes. It is shown and edited in EUR per running metre for
the current section, which is how timber yards quote. All prices can be edited in the Pricing tab and
are saved per browser.

## Assembly guide (`engine/assembly.ts`)

`buildAssemblySteps` groups the generated members and panels into build steps, in this order:

1. post-and-purlin rows, one at a time (posts → purlin → knee braces);
2. rafters;
3. roof;
4. infill walls, per wall and partition (bottom plate → studs → top rail → opening framing);
5. floor;
6. cladding;
7. doors and windows.

Step keys come from wall ids, purlin row keys and partition ids. They never come from member ids,
because those are renumbered on every parameter change. A custom order saved in
`project.assemblyOrder` therefore survives edits: `applyStepOrder` keeps the saved sequence and slots
new steps in after their default predecessor.

The viewport player (`AssemblyPanel`) walks through whole steps or single pieces (bottom-up, then along
the step) and shows later parts as ghosts. The same steps feed the printable PDF guide.

## Internationalisation (`src/i18n`)

The English source strings serve as keys, and each dictionary entry carries the Ukrainian, German and
Polish text. `t(key, params)` interpolates `{name}` placeholders. `tx(text)` translates strings the
engine has already built (for example "Post front 2") by matching them against the templates.
Anything without an entry stays in English. `coverage.test.ts` builds models from every project
template and roof direction, including auto-fix and cost optimisation, and fails if any shown engine
string or catalogue entry has no translation.

## Persistence

The current project, saved presets and layer settings are written to IndexedDB on every change and
restored on load. Unit prices are stored separately in localStorage. Projects can also be exported and imported as JSON; an imported project
passes through `normalizeProject`. Nothing leaves the browser.
