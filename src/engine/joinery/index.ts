import type { ConnectionsResult, FramingResult, HardwareItem, JoineryItem, ProjectState, StaticsResult } from '@/types';
import { WALL_IDS } from '@/types';
import { H_ANCHOR, hAnchorWidth, isHAnchor, postBoltLength } from '../statics/postBase';
import { wallStraps } from '../framing/straps';

/** Kammnägel at each end of a Windrispenband diagonal */
const STRAP_NAILS_PER_END = 8;
import { endStudBrackets, plateAnchors } from './anchors';
import { hasWallPosts } from '../framing/wallFrame';

/**
 * Derives connector quantities (hardware mode) or traditional carpentry joints
 * (Zimmermannsverbindungen) from the generated framing.
 */
/** `statics` adds the hardware its checks size and the model fits: roof strap crosses and hold-downs. */
export function computeConnections(project: ProjectState, framing: FramingResult, statics?: StaticsResult): ConnectionsResult {
  const { params } = project;
  const { timber } = params;
  const members = framing.members;
  const count = (pred: (m: (typeof members)[number]) => boolean): number => members.filter(pred).length;

  const nPosts = count((m) => m.category === 'post');
  const nRowPosts = framing.grid.rows.reduce((s, r) => s + r.positions.length, 0);
  const nPurlinRows = framing.grid.rows.length;
  const slopedPurlins = framing.grid.scheme === 'sloped-purlins';
  /** Rafter bearings: every rafter seats on every purlin row */
  const nBearings = framing.roof.rafterCount * nPurlinRows;
  const nSidePosts = nPosts - nRowPosts;
  const nBraces = count((m) => m.category === 'brace');
  const nStuds = count((m) => m.category === 'stud');
  const nPlateAnchors = plateAnchors(members).length;
  const nEndStudBrackets = endStudBrackets(members).length;
  const nHeaders = count((m) => m.category === 'header');
  const nSills = count((m) => m.category === 'sill');
  const nPurlinPieces = count((m) => m.group.startsWith('Purlin'));
  const nSplices = Math.max(nPurlinPieces - nPurlinRows, 0);
  const nRails = count((m) => m.group.startsWith('Side rail'));
  const claddingArea = framing.panels.filter((p) => p.kind === 'cladding').reduce((s, p) => s + p.areaM2, 0);
  const roofArea = framing.roof.areaM2;

  const hardware: HardwareItem[] = [];
  const joinery: JoineryItem[] = [];
  const hw = (id: string, name: string, nameDe: string, spec: string, quantity: number, note?: string): void => {
    if (quantity > 0) hardware.push({ id, name, nameDe, spec, quantity: Math.ceil(quantity), unit: 'pcs', note });
  };
  const hwm = (id: string, name: string, nameDe: string, spec: string, metres: number, note?: string): void => {
    if (metres > 0) hardware.push({ id, name, nameDe, spec, quantity: Math.ceil(metres * 10) / 10, unit: 'm', note });
  };
  const jn = (id: string, name: string, nameDe: string, quantity: number, note?: string): void => {
    if (quantity > 0) joinery.push({ id, name, nameDe, quantity: Math.ceil(quantity), note });
  };

  const build = params.build;
  const postBase = params.loads.postBase ?? 'adjustable';
  const pw = Math.min(timber.post.width, timber.post.height);

  // ── Post bases (both modes; timber must not touch concrete) – pinned in every check ──
  if (isHAnchor(postBase)) {
    const reinforced = postBase === 'h-anchor-reinforced';
    hw(
      reinforced ? 'post-base-h-reinforced' : 'post-base-h',
      reinforced ? 'H post anchor, reinforced, cast-in, hot-dip galvanised' : 'H post anchor, cast-in, hot-dip galvanised',
      reinforced ? 'H-Pfostenanker verstärkt, zum Einbetonieren' : 'H-Pfostenanker zum Einbetonieren',
      `${hAnchorWidth(pw)} mm clear, flat steel ${H_ANCHOR.flat[reinforced ? 'h-anchor-reinforced' : 'h-anchor']}`,
      nPosts,
      `${H_ANCHOR.concreteEmbed} mm cast into the foundation, post ${build.baseGap} mm above the concrete`,
    );
    hw('post-bolt', 'Hex bolt with nut and 2 washers', 'Sechskantschraube mit Mutter und 2 Scheiben', `M12 × ${postBoltLength(pw)} mm`, nPosts * 2, '2 per post anchor');
  } else {
    hw('post-base', 'Adjustable post base, hot-dip galvanised', 'Pfostenträger höhenverstellbar', `for ${timber.post.width}×${timber.post.height} mm`, nPosts);
    hw('anchor', 'Heavy-duty concrete anchor', 'Schwerlastanker', 'M16 × 145 mm', nPosts, '1 per post base, min. 100 mm embedment');
    hw('post-bolt', 'Hex bolt with nut and 2 washers', 'Sechskantschraube mit Mutter und 2 Scheiben', `M12 × ${postBoltLength(pw)} mm`, nPosts * 2, '2 per post base');
  }

  // ── Uplift chain: rafter → purlin, purlin → post ──
  if (params.connectionMode === 'hardware') {
    const perBearing = build.rafterAnchorsPerBearing;
    hw('rafter-anchor', 'Rafter–purlin anchor', 'Sparrenpfettenanker', '170 mm, left/right alternating', nBearings * perBearing, `${perBearing} per rafter bearing`);
    hw('rafter-anchor-nails', 'Connector nails', 'Kammnägel', '4.0 × 50 mm', nBearings * perBearing * 12, '12 per anchor');
  } else {
    hw('rafter-screw', slopedPurlins ? 'Rafter screws (secures seat)' : 'Rafter screws (secures birdsmouth)', 'Sparrenschrauben', '8 × 280 mm', nBearings, '1 per rafter bearing');
  }
  if (build.purlinPostConnector === 'angle-brackets') {
    hw('bracket', 'Angle bracket with rib 90×90×65', 'Winkelverbinder mit Rippe', '90×90×65×2.5 mm', nRowPosts * 2, '2 per post–purlin joint');
    hw('bracket-nails', 'Connector nails', 'Kammnägel', '4.0 × 40 mm', nRowPosts * 2 * 20, '20 per bracket');
  } else if (build.purlinPostConnector === 'screws') {
    hw('purlin-screws', 'Fully threaded screws, purlin → post', 'Vollgewindeschrauben Pfette → Pfosten', '8 × 300 mm', nRowPosts * 2, '2 per post–purlin joint, from the purlin top');
  } else {
    const strapLength = (2 * 300 + timber.beam.width + 2 * timber.beam.height) / 1000;
    hwm('purlin-strap', 'Perforated steel strap over the purlin', 'Lochband über die Pfette', '40 × 2 mm, galvanised', nRowPosts * strapLength * 1.1, '1 per post–purlin joint, nailed to both post faces');
    hw('purlin-strap-nails', 'Connector nails', 'Kammnägel', '4.0 × 40 mm', nRowPosts * 12, '6 per strap leg');
  }

  // ── Knee braces ──
  if (params.connectionMode === 'hardware') {
    if (build.braceConnector === 'bolt') {
      hw('brace-bolt', 'Hex bolt with nut and 2 washers (knee brace)', 'Sechskantschraube mit Mutter und 2 Scheiben (Kopfband)', `M12 × ${Math.ceil((timber.brace.width + pw + 30) / 10) * 10} mm`, nBraces * 2, '1 per brace end');
    } else {
      hw('brace-screws', 'Structural screws, countersunk', 'Konstruktionsschrauben', '8 × 200 mm', nBraces * 4, '2 per brace end');
    }
    hw('side-post-screws', 'Structural screws (side posts → rail)', 'Konstruktionsschrauben', '8 × 200 mm', nSidePosts * 2 + nRails * 4);
    hw('stud-screws', 'Wood screws (toe-screwed studs)', 'Holzbauschrauben', '6 × 140 mm', nStuds * 4, '2 per stud end');
    hw('header-screws', 'Structural screws (headers & sills)', 'Konstruktionsschrauben', '8 × 200 mm', nHeaders * 6 + nSills * 4);
    hw('splice-bolt', 'Splice bolts with washers', 'Stoßverschraubung', 'M12 × 200 mm', nSplices * 2);
    hw('splice-plate', 'Flat connector plates', 'Flachverbinder', '300 × 40 × 3 mm', nSplices * 2);
  } else {
    jn('tenon-post', 'Mortise & tenon post → purlin', 'Zapfenverbindung Pfosten–Pfette', nRowPosts, 'Tenon 40 mm thick, 60 mm long, secured with oak peg');
    jn('peg-post', 'Oak pegs Ø 20 mm', 'Holznägel', nRowPosts + nBraces * 2);
    if (slopedPurlins) jn('seat', 'Bevelled seat (level rafter on sloped purlin)', 'Auflager geschrägt', nBearings, `${framing.roof.pitchDeg.toFixed(1)}° bevel`);
    else jn('birdsmouth', 'Birdsmouth seat (rafter on purlin)', 'Kerve', nBearings, `${framing.roof.birdsmouthDepth} mm deep`);
    jn('brace-tenon', 'Knee brace tenons (both ends)', 'Kopfband-Zapfen', nBraces * 2, 'Stub tenon with peg');
    jn('scarf', 'Hooked scarf joint (purlin splice)', 'Hakenblatt', nSplices, 'Located over a post, bolted M12');
    jn('lap-rail', 'Half-lap side rail → post', 'Überblattung Rähm–Pfosten', nRails * 2 + nSidePosts);
    jn('stud-tenon', 'Stud tenons into plate & rail', 'Ständerzapfen', nStuds * 2);
    jn('housing', 'Housed headers & sills', 'Eingelassene Stürze/Riegel', nHeaders * 2 + nSills * 2);
    hw('splice-bolt', 'Scarf joint bolts', 'Stoßverschraubung', 'M12 × 200 mm', nSplices * 2);
  }

  // ── Wall base (both modes): concrete screws through the bottom plate, or lateral holders for hung studs ──
  if (build.wallBase === 'hung') {
    hw('stud-foot-holder', 'Angle bracket holding the stud foot sideways (no tension)', 'Winkel als seitliche Fußhalterung', '70×70×55 mm + concrete screws', nStuds, '1 per stud, studs hang from the rail');
  } else {
    hw(
      'plate-anchor',
      'Concrete screws (bottom plate → base)',
      'Betonschrauben',
      `7.5 × ${build.wallBase === 'spacers' ? 100 + build.plateSpacer : 100} mm`,
      nPlateAnchors,
      `Max. 800 mm apart, 150 mm from plate ends${build.wallBase === 'spacers' ? `, through ${build.plateSpacer} mm spacers` : ''}`,
    );
    hw('plate-spacer', 'Plastic spacer pads under the bottom plate', 'Kunststoff-Unterlegplatten', `${build.plateSpacer} mm`, build.wallBase === 'spacers' ? nPlateAnchors : 0, '1 at every concrete screw');
  }
  hw('end-stud-bracket', 'Angle brackets with concrete screws (end stud → base)', 'Winkelverbinder mit Betonschrauben', '70×70×55 mm', nEndStudBrackets, '1 per free wall end, on the open stud face');

  // ── Crossed steel straps of braced walls ──
  let strapLength = 0;
  let diagonals = 0;
  let strapNails = 0;
  for (const id of WALL_IDS) {
    const straps = wallStraps(id, project.walls[id], params);
    if (!straps) continue;
    strapLength += straps.totalLength;
    for (const c of straps.crosses) {
      diagonals += 2;
      const crossings = Math.max(0, Math.ceil((c.end - c.start) / Math.max(params.maxStudSpacing, 200)) - 1);
      strapNails += 2 * (2 * STRAP_NAILS_PER_END + 2 * crossings);
    }
  }
  // strap crosses in the roof plane (roof diaphragm) – same strap, sized by the statics
  const fittings = statics?.checks.flatMap((c) => c.fittings ?? []) ?? [];
  for (const f of fittings) {
    if (f.kind !== 'roof-straps') continue;
    strapLength += f.length;
    diagonals += f.diagonals * f.strapsPerDiagonal;
    // both ends of every strap, plus 2 nails where it crosses a rafter
    const rafterCrossings = Math.ceil(f.length / Math.max(framing.roof.rafterSpacing, 300));
    strapNails += f.diagonals * f.strapsPerDiagonal * 2 * f.nailsPerEnd + 2 * rafterCrossings;
  }
  hwm('wind-strap', 'Wind bracing strap (Windrispenband), crossed diagonals', 'Windrispenband', '40 × 2 mm, galvanised', (strapLength / 1000) * 1.1, `${diagonals} diagonals + 10 %`);
  hw('wind-strap-tensioner', 'Strap tensioner', 'Windrispenband-Spanner', 'for 40 × 2 mm', diagonals, '1 per diagonal');
  hw('wind-strap-nails', 'Connector nails', 'Kammnägel', '4.0 × 40 mm', strapNails, `${STRAP_NAILS_PER_END} per strap end + 2 per stud crossing`);

  // ── Hold-downs at the ends of braced walls (tension from the statics) ──
  const holdDowns = fittings.filter((f) => f.kind === 'hold-down');
  if (holdDowns.length > 0) {
    const tension = Math.max(...holdDowns.map((f) => f.tension));
    hw('hold-down', 'Hold-down anchor (end stud → foundation)', 'Zuganker', `T_d ≥ ${tension.toFixed(1)} kN per ETA, with anchor bolt into the foundation`, holdDowns.reduce((n, f) => n + f.count, 0), '2 per braced wall, at the ends of its braced stretch');
  }

  // ── Cladding (both modes): 2 stainless screws at every stud / batten crossing ──
  const claddingCrossings = framing.panels
    .filter((p) => p.kind === 'cladding' && p.cladding)
    .reduce((sum, p) => {
      const c = p.cladding!;
      const spacing = p.boards && p.screen ? build.screenBattenSpacing : Math.max(params.maxStudSpacing, 200);
      if (c.orientation !== 'horizontal') return sum + p.areaM2 * 12.5; // vertical boards: ≈ 25 screws per m² on the rails
      const boards = p.boards ?? [];
      const along = (b: { u: number }[]) => Math.max(...b.map((q) => q.u)) - Math.min(...b.map((q) => q.u));
      return sum + (boards.length > 0 ? boards.reduce((n, b) => n + along(b) / spacing + 1, 0) : (p.areaM2 / ((c.boardWidth + c.gap) / 1000)) / spacing * 1000);
    }, 0);
  if (claddingArea > 0) {
    hw('cladding-screws', 'Stainless cladding screws', 'Fassadenschrauben A2', '4.5 × 50 mm', claddingCrossings * 2, '2 per stud / batten crossing');
  }

  // ── Roofing (both modes) ──
  if (roofArea > 0) {
    if (params.loads.roofCovering === 'trapezoidal-sheet') {
      // edge and corner zones: strips one tenth of the roof dimension along every edge (36 % of the area)
      const edgeArea = roofArea * 0.36;
      const fieldArea = roofArea - edgeArea;
      hw('roof-screws', 'Roofing screws with timber thread and EPDM washer', 'Dachschrauben mit Holzgewinde und EPDM-Dichtscheibe', `${build.roofScrewDiameter} × ${build.roofScrewLength} mm`, fieldArea * build.roofScrewsField + edgeArea * build.roofScrewsEdge, `${build.roofScrewsField} per m² in the field, ${build.roofScrewsEdge} per m² in the edge and corner zones`);
      const battenRows = members.filter((m) => m.group.startsWith('Roof batten')).length;
      if (battenRows > 0) {
        const bh = Math.min(build.battenSection.width, build.battenSection.height);
        hw('batten-screws', 'Batten screws (batten → rafter)', 'Holzbauschrauben Lattung', `6 × ${Math.ceil((bh + 60) / 10) * 10} mm`, framing.roof.rafterCount * new Set(members.filter((m) => m.group.startsWith('Roof batten')).map((m) => Math.round(m.start.z))).size, '1 per batten–rafter crossing');
      }
    } else if (params.loads.roofCovering === 'polycarbonate') {
      hw('roof-screws', 'Panel fixings with sealing caps', 'Stegplatten-Befestiger', '5 × 60 mm', roofArea * 6, '≈ 6 per m²');
    } else if (params.loads.roofCovering === 'bitumen-shingles') {
      hw('roof-nails', 'Roofing nails, galvanised', 'Dachpappnägel', '2.8 × 25 mm', roofArea * 50, '≈ 50 per m²');
      hw('deck-screws', 'OSB deck screws', 'Holzbauschrauben', '4.5 × 60 mm', roofArea * 15);
    } else {
      hw('deck-screws', 'OSB deck screws', 'Holzbauschrauben', '4.5 × 60 mm', roofArea * 15, params.loads.roofCovering === 'roof-tiles' ? 'Battens & counter battens: see other materials' : undefined);
    }
    if (params.loads.roofCovering === 'roof-tiles') {
      hw('batten-nails', 'Batten nails, galvanised', 'Lattennägel', '3.1 × 80 mm', (roofArea / 0.33) * 2 + roofArea * 4, '2 per batten crossing');
    }
  }

  // Timber floor (both modes)
  const floor = framing.floor;
  if (floor) {
    const bearers = floor.support === 'bearers';
    if (bearers) {
      hw('floor-footing', 'Point foundation with adjustable beam support', 'Punktfundament mit U-Stützenfuß', '40×40×80 cm concrete + U-support', floor.supportCount, '1 per bearer support');
      hw('joist-screws', 'Structural screws (joist → bearer)', 'Konstruktionsschrauben', `6 × ${Math.round((params.floor.joist.height + 40) / 20) * 20} mm`, floor.crossings * 2, '2 per crossing');
    } else {
      hw('floor-pad', 'Rubber levelling pads', 'Terrassenpads / Unterlegplatten', '90×60×10 mm', floor.supportCount, '1 per sleeper support');
      hw('sleeper-anchor', 'Angle brackets with concrete screws (sleeper → slab)', 'Winkelverbinder mit Betonschrauben', '70×70×55 mm', floor.joistCount * 2, '2 per sleeper');
    }
    const deckScrewsPerM2 =
      floor.decking === 'osb' ? 12 : Math.ceil((2 * 1000) / Math.max(floor.joistSpacing, 1) / 0.14);
    if (floor.decking === 'larch-decking') {
      hw('decking-screws-a2', 'Stainless decking screws', 'Terrassenschrauben A2', '5 × 60 mm', floor.areaM2 * deckScrewsPerM2, '2 per board per joist');
    } else {
      hw('floor-screws', floor.decking === 'osb' ? 'Flooring panel screws' : 'Floorboard screws', 'Dielenschrauben', '4.5 × 60 mm', floor.areaM2 * deckScrewsPerM2, floor.decking === 'osb' ? '≈ 12 per m²' : '2 per board per joist');
    }
  }

  // Door & window fitting kits (closed walls and partitions)
  const openings = [...Object.values(project.walls).filter(hasWallPosts).flatMap((w) => w.openings), ...project.partitions.flatMap((p) => p.openings)];
  hw('door-fitting-kit', 'Door fitting kit', 'Türmontage-Set', 'Compression tape, PU foam, frame screws, threshold, drip cap', openings.filter((o) => o.type === 'door').length, '1 per door');
  hw('window-fitting-kit', 'Window fitting kit', 'Fenstermontage-Set', 'Compression tape, PU foam, frame screws, sills, drip cap, cover strips', openings.filter((o) => o.type === 'window').length, '1 per window');

  return { mode: params.connectionMode, hardware, joinery };
}
