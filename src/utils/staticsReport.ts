import type { DerivedModel, ProjectState, StaticsCheck, StaticsCheckKind } from '@/types';
import { getLang, t, tx } from '@/i18n';
import { sanitizeParams } from '@/engine/framing';
import { MATERIALS, ROOF_COVERING_LOAD } from '@/engine/statics/materials';
import { SOILS } from '@/engine/statics/foundations';
import { addFinishedRender, safeName } from '@/utils/export';
import { embedUnicodeFont, UNICODE_FONT } from '@/utils/pdfFont';

const BROWN: [number, number, number] = [92, 61, 28];
const SAND: [number, number, number] = [238, 228, 214];
const GREY: [number, number, number] = [90, 90, 90];
const STATUS_COLOR = { ok: [22, 128, 61], warning: [180, 110, 0], fail: [190, 30, 45] } as const;
const STATUS_WORD = { ok: 'Sufficient', warning: 'Near limit', fail: 'Overloaded' } as const;

/** Order and headings of the verification chapters */
const GROUPS: { kinds: StaticsCheckKind[]; title: string }[] = [
  { kinds: ['vertical'], title: 'Members under vertical load' },
  { kinds: ['lateral'], title: 'Bracing and lateral stability' },
  { kinds: ['uplift', 'connection'], title: 'Anchoring and joints' },
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
      [
        t('Footings'),
        footing
          ? `Ø${p.loads.postFootingDiameter} × ${p.loads.postFootingDepth} mm, ${tx(SOILS[p.loads.soil ?? 'non-cohesive'].label)}`
          : t('none (posts on a slab or bare anchors)'),
      ],
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

  // ── 3 Positions ─────────────────────────────────────────────────────────────────────
  let pos = 0;
  const positions: { pos: number; check: StaticsCheck }[] = [];
  for (const group of GROUPS) for (const check of statics.checks.filter((c) => group.kinds.includes(c.kind))) positions.push({ pos: ++pos, check });
  doc.addPage();
  doc.setFontSize(12);
  doc.setFont(font, 'bold');
  doc.text(t('3 Verification by position'), margin, 16);
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

  // ── 4 Limits ────────────────────────────────────────────────────────────────────────
  const limits = doc.splitTextToSize(
    [
      t('4 Not covered'),
      t('Fire resistance, settlement and groundwater, slopes and neighbouring buildings (snow drifts), anchoring of boarded walls to the slab, second-order effects, splices and every product with an ETA (post bases, angle brackets, rafter anchors, frame anchors) – check against the manufacturer data. Footing values come from DIN 1054 tables for undisturbed, at least medium dense / stiff soil without a site investigation.'),
    ].join('\n'),
    width,
  );
  if (y + limits.length * 4 > 285) {
    doc.addPage();
    y = 16;
  }
  doc.setFontSize(9);
  doc.setFont(font, 'bold');
  doc.text(limits[0], margin, y + 2);
  doc.setFont(font, 'normal');
  doc.setFontSize(8);
  doc.text(limits.slice(1), margin, y + 7);

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
