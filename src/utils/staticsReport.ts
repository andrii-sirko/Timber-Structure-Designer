import type { DerivedModel, ProjectState, StaticsCheck, StaticsCheckKind } from '@/types';
import { getLang, t, tx } from '@/i18n';
import { sanitizeParams } from '@/engine/framing';
import { MATERIALS, ROOF_COVERING_LOAD } from '@/engine/statics/materials';
import { SOILS } from '@/engine/statics/foundations';
import { hAnchorWidth, isHAnchor } from '@/engine/statics/postBase';
import { concreteTopLevel, plateBottomLevel, postBottomLevel } from '@/engine/build';
import type { jsPDF } from 'jspdf';
import { WALL_IDS, type PostBaseType, type PurlinPostConnector, type WallBase, type WallBracing, type WallId } from '@/types';
import { addFinishedRender, safeName } from '@/utils/export';
import { embedUnicodeFont, UNICODE_FONT } from '@/utils/pdfFont';

const BROWN: [number, number, number] = [92, 61, 28];
const SAND: [number, number, number] = [238, 228, 214];
const GREY: [number, number, number] = [90, 90, 90];
const STATUS_COLOR = { ok: [22, 128, 61], warning: [180, 110, 0], fail: [190, 30, 45] } as const;
const STATUS_WORD = { ok: 'Sufficient', warning: 'Near limit', fail: 'Overloaded' } as const;
const POST_BASE_LABEL: Record<PostBaseType, string> = { 'h-anchor': 'H post anchor, cast-in', 'h-anchor-reinforced': 'H post anchor, reinforced, cast-in', adjustable: 'Adjustable post base' };
const CONNECTOR_LABEL: Record<PurlinPostConnector, string> = { 'angle-brackets': '2 angle brackets 90×90×65', screws: '2 fully threaded screws 8 × 300', strap: 'Perforated strap (Lochband) over the purlin' };
const WALL_BASE_LABEL: Record<WallBase, string> = { slab: 'On the slab (±0)', curb: 'On a concrete curb', spacers: 'Bottom plate on spacers', hung: 'Studs hung from the rail, feet held sideways' };
const BRACING_LABEL: Record<WallBracing, string> = { none: 'boards only (no shear wall)', strap: 'crossed steel straps', panels: 'sheet panels' };
const SIDE_LABEL: Record<WallId, string> = { front: 'Front', rear: 'Rear', left: 'Left', right: 'Right' };


/** Order and headings of the verification chapters */
const GROUPS: { kinds: StaticsCheckKind[]; title: string }[] = [
  { kinds: ['vertical'], title: 'Members under vertical load' },
  { kinds: ['lateral'], title: 'Bracing and lateral stability' },
  { kinds: ['uplift', 'connection'], title: 'Uplift load path and joints' },
  { kinds: ['foundation'], title: 'Footings' },
];

/**
 * Structural pre-design report (A4 portrait): system, load assumptions and every check as a numbered
 * position (Pos.) with its forces, utilisation and calculation line, so an engineer can follow it.
 */
export async function exportStaticsReportPdf(project: ProjectState, model: DerivedModel): Promise<void> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  // The calculation lines need Greek letters and ≤ / ≥, which Helvetica lacks in every language
  await embedUnicodeFont(doc);
  const font = UNICODE_FONT;
  const lang = getLang();
  const p = sanitizeParams(project.params);
  const { statics, framing } = model;
  const L = statics.loads;
  const name = (en: string, de: string): string => (lang === 'de' ? de : `${tx(en)} (${de})`);
  const finalY = (): number => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const pageW = 210;
  const margin = 14;
  const width = pageW - 2 * margin;
  const tableStyle = { styles: { fontSize: 8, font, cellPadding: 1.4 }, headStyles: { fillColor: BROWN, font }, margin: { left: margin, right: margin } };

  doc.setFontSize(15);
  doc.setFont(font, 'bold');
  doc.text(t('{name} – Structural pre-design', { name: project.name }), margin, 16);
  doc.setFont(font, 'normal');
  doc.setFontSize(9);
  doc.text(
    t('Structure {length} × {width} mm, H1 {frontHeight} / H2 {rearHeight} mm · {strengthClass} · generated {date}', {
      length: p.length,
      width: p.width,
      frontHeight: p.frontHeight,
      rearHeight: p.rearHeight,
      strengthClass: p.timber.strengthClass,
      date: new Date().toLocaleDateString(),
    }),
    margin,
    22,
  );
  // Disclaimer first: this is the one thing nobody may miss
  doc.setFillColor(253, 236, 200);
  const disclaimer = doc.splitTextToSize(
    t('Simplified pre-design to EN 1995-1-1, EN 1991 and DIN 1054. It does not replace a checkable structural calculation (prüffähige Statik): have the design confirmed by a structural engineer before building or applying for a permit.'),
    width - 6,
  );
  doc.rect(margin, 26, width, disclaimer.length * 4 + 4, 'F');
  doc.setFont(font, 'bold');
  doc.text(disclaimer, margin + 3, 30.5);
  doc.setFont(font, 'normal');
  const afterRender = addFinishedRender(doc, project, model, margin, 30 + disclaimer.length * 4 + 4, width, 85);

  // ── 1 System ────────────────────────────────────────────────────────────────────────
  const sec = (s: { width: number; height: number }) => `${s.width}×${s.height} mm`;
  const footing = (p.loads.postFootingDepth ?? 0) > 0 && (p.loads.postFootingDiameter ?? 0) > 0;
  const b = p.build;
  const wallSummary = WALL_IDS.filter((id) => project.walls[id].closed || project.walls[id].screen || project.walls[id].rail)
    .map((id) => {
      const w = project.walls[id];
      const kind = w.closed ? t(BRACING_LABEL[w.bracing ?? 'none']) : w.screen ? t('slat screen') : t('rail only');
      return `${t(SIDE_LABEL[id])}: ${kind}${w.closed && w.screenPart ? ` + ${t('slat screen')}` : ''}${w.rail ? `, ${t('rail for knee braces')}` : ''}`;
    })
    .join('; ');
  autoTable(doc, {
    ...tableStyle,
    startY: afterRender + 6,
    head: [[{ content: t('1 System'), colSpan: 2 }]],
    body: [
      [t('Plan (posts)'), `${p.length} × ${p.width} mm, ${t('overhangs')} ${p.overhangs.front} / ${p.overhangs.rear} / ${p.overhangs.left} / ${p.overhangs.right} mm`],
      [t('Heights'), `H1 ${p.frontHeight} mm, H2 ${p.rearHeight} mm, ${t('roof pitch')} ${framing.roof.pitchDeg.toFixed(1)}°`],
      [t('Timber'), `${p.timber.strengthClass} (${p.timber.strengthClass.startsWith('GL') ? 'EN 14080' : 'EN 338'}) · ${t('service class')} ${p.loads.serviceClass}`],
      [
        t('Sections'),
        `${name('Post', 'Pfosten')} ${sec(p.timber.post)}, ${name('Purlin', 'Pfette')} ${sec(p.timber.beam)}, ${name('Rafter', 'Sparren')} ${sec(p.timber.rafter)} @ ${framing.roof.rafterSpacing} mm${p.braces ? `, ${name('Knee brace', 'Kopfband')} ${sec(p.timber.brace)}` : ''}`,
      ],
      [t('Joints'), p.connectionMode === 'hardware' ? t('Mechanical connectors (brackets, anchors, screws)') : t('Traditional joinery (Zapfen, Kerve, Hakenblatt)')],
      [t('Post base'), `${t(POST_BASE_LABEL[p.loads.postBase ?? 'adjustable'])}${isHAnchor(p.loads.postBase ?? 'adjustable') ? `, ${hAnchorWidth(Math.min(p.timber.post.width, p.timber.post.height))} mm` : ''} – ${t('pinned in every check')}`],
      [
        t('Footings'),
        footing
          ? `${b.footingShape === 'round' ? `Ø${p.loads.postFootingDiameter}` : `${p.loads.postFootingDiameter} × ${p.loads.postFootingDiameter}`} × ${p.loads.postFootingDepth} mm, ${tx(SOILS[p.loads.soil ?? 'non-cohesive'].label)}`
          : t('none (posts on a slab or bare anchors)'),
      ],
      [t('Walls'), wallSummary || t('none')],
    ],
    columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold' } },
  });

  // ── 2 Loads ─────────────────────────────────────────────────────────────────────────
  const covering = ROOF_COVERING_LOAD[p.loads.roofCovering];
  const f2 = (v: number) => v.toFixed(2);
  const snowSite = p.loads.snowZone ? t('zone {zone}, {altitude} m above sea level', { zone: p.loads.snowZone, altitude: p.loads.altitude ?? 0 }) : t('typed in');
  autoTable(doc, {
    ...tableStyle,
    startY: finalY() + 5,
    head: [[{ content: t('2 Load assumptions (characteristic)'), colSpan: 2 }]],
    body: [
      [t('Dead load g'), `${tx(covering.label)} ${f2(covering.load)} kN/m² ${t('roof surface')} + ${t('rafters')} → ${f2(L.deadLoad)} kN/m² ${t('plan')}`],
      [t('Site'), `${b.site} · ${t('wind zone')} ${b.windZone}, ${t('terrain category')} ${b.terrainCategory}`],
      [t('Snow s'), `s_k = ${f2(L.groundSnowLoad)} kN/m² (${snowSite}, DIN EN 1991-1-3/NA), μ₁ = ${f2(L.snowShape)} → s = ${f2(L.snowLoadRoof)} kN/m²`],
      ...(L.exceptionalSnow !== undefined
        ? [[t('Exceptional snow'), `s_Ad = 2.3 · s_k = ${f2(L.exceptionalSnow)} kN/m² ${t('(North German Plain, accidental combination)')}`]]
        : []),
      [t('Wind'), `q_p = ${f2(L.windPressure)} kN/m² (≈ ${Math.round(L.gustSpeed)} m/s), ${t('canopy')} c_f = +${f2(L.canopyForce.down)} / ${f2(L.canopyForce.up)} (EN 1991-1-4 ${t('Table 7.6')}, φ = 0)`],
      [
        t('Wind, local'),
        `c_p,net ${t('interior')} A: +${f2(L.canopyLocal.interior.down)} / ${f2(L.canopyLocal.interior.up)}, ${t('edge strips')} B/C: +${f2(L.canopyLocal.edge.down)} / ${f2(L.canopyLocal.edge.up)}`,
      ],
      [t('Wind force'), `W_k = ${L.windForce.x.toFixed(1)} kN (X) / ${L.windForce.z.toFixed(1)} kN (Z), ${t('uplift')} ${f2(L.upliftPressure)} kN/m²`],
      [
        t('Safety factors'),
        `γ_G = 1.35 (1.0 ${t('favourable')}), γ_Q = 1.5, ψ₀ ${t('snow')} 0.5 / ${t('wind')} 0.6, γ_M ${t('timber')} ${MATERIALS[p.timber.strengthClass].gammaM}, ${t('joints')} 1.3`,
      ],
      [t('Timber'), `k_mod ${L.kmod} (${t('snow')}) / ${L.kmod < 0.75 ? 0.7 : 0.9} (${t('wind')}), k_def ${L.kdef}`],
    ],
    columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold' } },
  });

  // ── 3 Build assumptions (every input the checks and quantities rely on) ────────────
  const mm = (v: number) => `${v} mm`;
  const secTxt = (s: { width: number; height: number }) => `${s.width}×${s.height} mm`;
  autoTable(doc, {
    ...tableStyle,
    startY: finalY() + 5,
    head: [[{ content: t('3 Build assumptions'), colSpan: 2 }]],
    rowPageBreak: 'avoid',
    body: [
      [t('Levels'), `${t('concrete top')} ${mm(concreteTopLevel(p))}, ${t('post bottom')} ${mm(postBottomLevel(p))} (${t('base gap')} ${mm(b.baseGap)}), ${t('bottom plate')} ${mm(plateBottomLevel(p))} – ${t('above ±0 (finished floor / paving)')}`],
      [t('Posts'), `${t('order length = target length +')} ${mm(b.cutReserve)} ${t('cut reserve, cut on site after levelling')}`],
      [t('Uplift chain'), `${b.rafterAnchorsPerBearing} × ${t('Sparrenpfettenanker per bearing')}, R_k ${b.rafterAnchorRk} kN; ${t('purlin → post')}: ${t(CONNECTOR_LABEL[b.purlinPostConnector])}${b.purlinPostConnector === 'angle-brackets' ? `, R_k ${b.angleBracketRk} kN` : ''}`],
      [t('Knee braces'), `${secTxt(p.timber.brace)}, 45°, ${t('leg')} ${mm(p.braceLeg)}, ${t(b.braceConnector === 'bolt' ? '1 bolt M12' : '2 structural screws 8 × 200')} ${t('per end')}`],
      [t('Walls'), `${t(WALL_BASE_LABEL[b.wallBase])}${b.wallBase === 'curb' ? ` ${b.curbWidth} × ${b.curbHeight} mm, ${t('top')} +${b.curbTop}` : b.wallBase === 'spacers' || b.wallBase === 'hung' ? ` ${mm(b.plateSpacer)}` : ''}; ${t('installation gap')} ${mm(b.installGap)} ${t('per side')}; ${t('facade boards')}: ${t(b.claddingSpecies === 'larch' ? 'Larch' : 'Spruce')}`],
      [t('Studs & battens in wind'), `c_p ${t('screen')} ${b.screenCp}, c_p ${t('closed wall')} ${b.wallCp}, w ≤ L/${b.studDeflectionLimit}; ${t('screen battens')} ${secTxt(b.screenBatten)} @ ≤ ${mm(b.screenBattenSpacing)}`],
      [t('Roof sheeting'), `${t('cover width')} ${mm(b.sheetCoverWidth)}, ${t('profile')} ${mm(b.sheetProfileHeight)}, ${t('longest sheet')} ${mm(b.maxSheetLength)}, ${t('max. span')} ${mm(b.sheetMaxSpan)}; ${t('battens')} ${secTxt(b.battenSection)}; ${t('screws')} ${b.roofScrewDiameter} × ${b.roofScrewLength} mm, ${b.roofScrewsField} / ${b.roofScrewsEdge} ${t('per m² (field / edges)')}; ${t('min. slope')} ${b.minSlope}° + ${b.slopeTolerance}°`],
      [t('Ordering'), `${t('stock lengths')} ${b.stockLengths.map((l) => l / 1000).join(' / ')} m; ${t('BGF threshold')} ${b.bgfLimit} m²; ${t('concrete')} ${b.concreteBagLitres} l ${t('per 25 kg bag')}`],
    ],
    columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold' } },
  });
  drawLevels(doc, font, margin, finalY() + 6, project, t);

  // ── 4 Positions ─────────────────────────────────────────────────────────────────────
  let pos = 0;
  const positions: { pos: number; check: StaticsCheck }[] = [];
  for (const group of GROUPS) for (const check of statics.checks.filter((c) => group.kinds.includes(c.kind))) positions.push({ pos: ++pos, check });
  doc.addPage();
  doc.setFontSize(12);
  doc.setFont(font, 'bold');
  doc.text(t('4 Verification by position'), margin, 16);
  doc.setFont(font, 'normal');
  doc.setFontSize(8);
  doc.text(t('Overall: {status}', { status: t(STATUS_WORD[statics.status]) }), margin, 21);
  let y = 24;
  for (const group of GROUPS) {
    const rows = positions.filter((r) => group.kinds.includes(r.check.kind));
    if (rows.length === 0) continue;
    // A group heading must not be left alone at the foot of a page
    if (y > 255) {
      doc.addPage();
      y = 16;
    }
    autoTable(doc, {
      ...tableStyle,
      startY: y,
      head: [[{ content: t(group.title), colSpan: 4 }]],
      body: rows.flatMap(({ pos, check }) => {
        const colour = STATUS_COLOR[check.status] as unknown as [number, number, number];
        const spanLabel = check.kind === 'connection' ? t('Fastener') : check.kind === 'foundation' ? t('Depth') : t('Span');
        return [
          [
            { content: `Pos. ${pos}`, styles: { fontStyle: 'bold' as const, fillColor: SAND } },
            { content: name(check.element, check.elementDe), styles: { fontStyle: 'bold' as const, fillColor: SAND } },
            { content: `${sec(check.section)}${check.span ? ` · ${spanLabel} ${check.span} mm` : ''}`, styles: { fillColor: SAND } },
            { content: `${Math.round(check.utilisation * 100)} % · ${t(STATUS_WORD[check.status])}`, styles: { fontStyle: 'bold' as const, fillColor: SAND, textColor: colour, halign: 'right' as const } },
          ],
          [{ content: tx(check.detail), colSpan: 4, styles: { textColor: GREY } }],
          ...(check.recommendation ? [[{ content: `→ ${tx(check.recommendation)}`, colSpan: 4, styles: { textColor: [150, 90, 0] as [number, number, number] } }]] : []),
        ];
      }),
      columnStyles: { 0: { cellWidth: 16 }, 2: { cellWidth: 46 }, 3: { cellWidth: 36 } },
      rowPageBreak: 'avoid',
    });
    y = finalY() + 4;
  }

  // ── 5 Not checked ───────────────────────────────────────────────────────────────────
  if (y > 240) {
    doc.addPage();
    y = 16;
  }
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    head: [[t('5 Not checked')]],
    body: statics.notChecked.map((n) => [`• ${tx(n)}`]),
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...GREY);
    doc.text(`${project.name} · ${t('Structural pre-design')} · ${i} / ${pages}`, margin, 291);
    doc.setTextColor(0, 0, 0);
  }

  doc.save(`${safeName(project.name)}_statics_${lang}.pdf`);
}

/**
 * Section sketch of the levels: ±0, concrete top, post foot, curb / bottom plate, purlin
 * underside at H2 and H1 – so the reference plane of every height is visible.
 */
function drawLevels(doc: jsPDF, font: string, x: number, y: number, project: ProjectState, t: (k: string, p?: Record<string, string | number>) => string): void {
  const p = project.params;
  const h = 46;
  if (y + h + 12 > 285) return;
  const top = Math.max(p.frontHeight, p.rearHeight);
  const depth = p.loads.postFootingDepth ?? 0;
  const lowest = Math.min(concreteTopLevel(p) - depth, 0);
  const scale = h / (top - lowest);
  const yAt = (mm: number) => y + 6 + (top - mm) * scale;
  doc.setFontSize(9);
  doc.setFont(font, 'bold');
  doc.text(t('Levels (section)'), x, y + 3);
  doc.setFont(font, 'normal');
  doc.setFontSize(7);
  const gx = x + 30;
  const lines: { mm: number; label: string }[] = [
    { mm: 0, label: t('finished floor / paving') },
    { mm: concreteTopLevel(p), label: t('concrete top') },
    { mm: postBottomLevel(p), label: t('post bottom') },
    ...(p.build.wallBase === 'curb' ? [{ mm: p.build.curbTop, label: t('curb top / bottom plate') }] : []),
    { mm: p.rearHeight - p.timber.beam.height, label: `H2 − ${t('purlin')}` },
    { mm: p.frontHeight - p.timber.beam.height, label: `H1 − ${t('purlin')}` },
  ];
  // ground, footing, post and curb
  doc.setDrawColor(150, 150, 150);
  doc.line(gx - 10, yAt(0), gx + 70, yAt(0));
  doc.setFillColor(210, 210, 210);
  if (depth > 0) doc.rect(gx + 5, yAt(concreteTopLevel(p)), 14, (depth) * scale, 'F');
  doc.setFillColor(222, 196, 150);
  doc.rect(gx + 9, yAt(p.frontHeight - p.timber.beam.height), 6, (p.frontHeight - p.timber.beam.height - postBottomLevel(p)) * scale, 'F');
  if (p.build.wallBase === 'curb') {
    doc.setFillColor(210, 210, 210);
    doc.rect(gx + 40, yAt(p.build.curbTop), 8, p.build.curbHeight * scale, 'F');
  }
  // one label per level (equal levels share it), stacked top-down at least 3 mm apart
  const byLevel = new Map<number, string[]>();
  for (const l of lines) byLevel.set(Math.round(l.mm), [...(byLevel.get(Math.round(l.mm)) ?? []), l.label]);
  let lastY = -Infinity;
  for (const [mmLevel, labels] of [...byLevel.entries()].sort((a, c) => c[0] - a[0])) {
    const yy = yAt(mmLevel);
    doc.setDrawColor(92, 61, 28);
    doc.line(gx - 6, yy, gx + 60, yy);
    const ly = Math.max(yy + 1, lastY + 3);
    lastY = ly;
    doc.text(`${mmLevel > 0 ? '+' : mmLevel < 0 ? '' : '±'}${mmLevel} mm  ${labels.join(' / ')}`, gx + 72, ly);
  }
}
