import type { ConnectionsResult, FramingResult, HardwareItem, JoineryItem, ProjectState } from '@/types';
import { plateAnchors } from './anchors';

/**
 * Derives connector quantities (hardware mode) or traditional carpentry joints
 * (Zimmermannsverbindungen) from the generated framing.
 */
export function computeConnections(project: ProjectState, framing: FramingResult): ConnectionsResult {
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
  const jn = (id: string, name: string, nameDe: string, quantity: number, note?: string): void => {
    if (quantity > 0) joinery.push({ id, name, nameDe, quantity: Math.ceil(quantity), note });
  };

  // Post bases are needed in both modes (timber must not touch concrete)
  hw('post-base', 'Adjustable post base, hot-dip galvanised', 'Pfostenträger höhenverstellbar', `for ${timber.post.width}×${timber.post.height} mm`, nPosts);
  hw('anchor', 'Heavy-duty concrete anchor', 'Schwerlastanker', 'M16 × 145 mm', nPosts, '1 per post base, min. 100 mm embedment');
  hw('post-bolt', 'Hex bolt with nut & washers', 'Sechskantschraube', `M12 × ${timber.post.width + 40} mm`, nPosts * 2, '2 per post base');

  if (params.connectionMode === 'hardware') {
    hw('bracket', 'Angle bracket with rib 90×90×65', 'Winkelverbinder mit Rippe', '90×90×65×2.5 mm', nRowPosts * 2, '2 per post–purlin connection');
    hw('bracket-nails', 'Connector nails', 'Kammnägel', '4.0 × 40 mm', nRowPosts * 2 * 20);
    hw('rafter-anchor', 'Rafter–purlin anchor', 'Sparrenpfettenanker', '170 mm, left/right alternating', nBearings, '1 per rafter bearing');
    hw('rafter-anchor-nails', 'Connector nails', 'Kammnägel', '4.0 × 50 mm', nBearings * 12);
    hw('brace-screws', 'Structural screws, countersunk', 'Konstruktionsschrauben', '8 × 240 mm', nBraces * 4, '2 per brace end');
    hw('side-post-screws', 'Structural screws (side posts → rail)', 'Konstruktionsschrauben', '8 × 200 mm', nSidePosts * 2 + nRails * 4);
    hw('stud-screws', 'Wood screws (toe-screwed studs)', 'Holzbauschrauben', '6 × 140 mm', nStuds * 4, '2 per stud end');
    hw('header-screws', 'Structural screws (headers & sills)', 'Konstruktionsschrauben', '8 × 200 mm', nHeaders * 6 + nSills * 4);
    hw('plate-anchor', 'Frame anchors (bottom plate → slab)', 'Rahmendübel', '10 × 135 mm', nPlateAnchors, 'Max. 800 mm apart, 150 mm from plate ends');
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
    hw('rafter-screw', slopedPurlins ? 'Rafter screws (secures seat)' : 'Rafter screws (secures birdsmouth)', 'Sparrenschrauben', '8 × 280 mm', nBearings, '1 per rafter bearing');
    hw('splice-bolt', 'Scarf joint bolts', 'Stoßverschraubung', 'M12 × 200 mm', nSplices * 2);
    hw('plate-anchor', 'Frame anchors (bottom plate → slab)', 'Rahmendübel', '10 × 135 mm', nPlateAnchors, 'Max. 800 mm apart, 150 mm from plate ends');
  }

  // Cladding & roofing fixings (both modes)
  if (claddingArea > 0) {
    hw('cladding-screws', 'Stainless cladding screws', 'Fassadenschrauben A2', '4.5 × 50 mm', claddingArea * 25, '≈ 25 per m²');
  }
  if (roofArea > 0) {
    if (params.loads.roofCovering === 'trapezoidal-sheet') {
      hw('roof-screws', 'Self-drilling sheet screws with EPDM washer', 'Bohrschrauben mit Dichtscheibe', '6.3 × 45 mm', roofArea * 8, '≈ 8 per m²');
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
  const openings = [...Object.values(project.walls).filter((w) => w.closed).flatMap((w) => w.openings), ...project.partitions.flatMap((p) => p.openings)];
  hw('door-fitting-kit', 'Door fitting kit', 'Türmontage-Set', 'Compression tape, PU foam, frame screws, threshold, drip cap', openings.filter((o) => o.type === 'door').length, '1 per door');
  hw('window-fitting-kit', 'Window fitting kit', 'Fenstermontage-Set', 'Compression tape, PU foam, frame screws, sills, drip cap, cover strips', openings.filter((o) => o.type === 'window').length, '1 per window');

  return { mode: params.connectionMode, hardware, joinery };
}
