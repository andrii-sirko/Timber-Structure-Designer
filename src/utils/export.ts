import type { jsPDF } from 'jspdf';
import { getLang, t, tx } from '@/i18n';
import { roundMm } from '@/engine/geometry';
import { embedUnicodeFont, UNICODE_FONT } from '@/utils/pdfFont';
import type { CutListItem, DerivedModel, PricingLine, PricingResult, ProjectState, StockBoardOption } from '@/types';
import { renderFinished } from '@/utils/assemblyRender';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "Stock boards: 4 m – 70 pcs (offcut 6 %) · 6 m – 46 pcs (offcut 4 %)" */
export function stockBoardsText(options: StockBoardOption[]): string {
  const parts = options.map((o) => t('{length} m – {count} pcs (offcut {waste} %)', { length: o.lengthMm / 1000, count: o.count, waste: o.wastePct }));
  return `${t('Stock boards, either')}: ${parts.join(` ${t('or')} `)}`;
}

export function safeName(name: string): string {
  return name.replace(/[^\w\d-]+/g, '_').replace(/^_+|_+$/g, '') || 'project';
}

/** The finished structure, as on the assembly guide's cover, centred in the box; returns the y below it */
export function addFinishedRender(doc: jsPDF, project: ProjectState, model: DerivedModel, x: number, y: number, boxW: number, boxH: number): number {
  const render = renderFinished(project, model);
  const imageW = Math.min(boxW, boxH * render.aspect);
  const imageH = imageW / render.aspect;
  doc.addImage(render.image, 'PNG', x + (boxW - imageW) / 2, y + (boxH - imageH) / 2, imageW, imageH, undefined, 'FAST');
  return y + (boxH + imageH) / 2;
}

export function exportProjectJson(project: ProjectState): void {
  const payload = { app: 'timber-structure-designer', version: 1, exportedAt: new Date().toISOString(), project };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${safeName(project.name)}.json`);
}

export async function readProjectFile(file: File): Promise<unknown> {
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);
  if (parsed && typeof parsed === 'object' && 'project' in parsed) {
    return (parsed as { project: unknown }).project;
  }
  return parsed;
}

const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCutListCsv(project: ProjectState, cutList: CutListItem[]): void {
  const lang = getLang();
  const header = [
    t('Pos'),
    t('Group'),
    t('Name'),
    t('Name (DE)'),
    t('Width mm'),
    t('Height mm'),
    t('Length mm'),
    t('Cut start °'),
    t('Cut end °'),
    t('Qty'),
    t('Notes'),
  ];
  const rows = cutList.map((c) => [
    c.pos,
    tx(c.group),
    lang === 'de' ? c.nameDe : tx(c.name),
    c.nameDe,
    roundMm(c.section.width),
    roundMm(c.section.height),
    roundMm(c.length),
    c.cuts.start,
    c.cuts.end,
    c.quantity,
    c.notes ? tx(c.notes) : '',
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
  downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${safeName(project.name)}_cutlist.csv`);
}

export async function exportCutListPdf(project: ProjectState, model: DerivedModel): Promise<void> {
  const { cutList, bom, statics, connections } = model;
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  // Helvetica only covers Latin-1; Ukrainian (Cyrillic) and Polish (ą, ę, ł, ś, ż…) need an embedded font
  const font = getLang() === 'uk' || getLang() === 'pl' ? UNICODE_FONT : 'helvetica';
  if (font === UNICODE_FONT) await embedUnicodeFont(doc);
  const p = project.params;
  const lang = getLang();
  // Helvetica's WinAnsi encoding has no '≈', '→', '≤', '≥'; a single unsupported glyph garbles the whole cell
  const pdfText = (s: string): string =>
    font === UNICODE_FONT ? s : s.replace(/≈/g, '~').replace(/→/g, '>').replace(/≤/g, '<=').replace(/≥/g, '>=');
  // `name (nameDe)` cell: the German term stays a secondary parenthetical unless the UI itself is German.
  const nameCell = (name: string, nameDe: string): string =>
    pdfText(lang === 'de' ? nameDe : `${tx(name)} (${nameDe})`);

  doc.setFontSize(16);
  doc.text(t('{name} – Cutting list & BOM', { name: project.name }), 14, 14);
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
    14,
    20,
  );

  // The finished structure on its own page below the title
  addFinishedRender(doc, project, model, 14, 25, 297 - 28, 210 - 25 - 14);
  doc.addPage();

  // One block per group and section (e.g. all 140×140 posts), headed by its piece count and total length
  const sectionOf = (c: CutListItem): string => `${roundMm(c.section.width)}×${roundMm(c.section.height)}`;
  const cutGroups = new Map<string, CutListItem[]>();
  for (const c of cutList) {
    const key = `${c.group}|${sectionOf(c)}`;
    cutGroups.set(key, [...(cutGroups.get(key) ?? []), c]);
  }
  const groupHeadStyle = { fontStyle: 'bold' as const, fillColor: [238, 228, 214] as [number, number, number] };
  autoTable(doc, {
    startY: 14,
    head: [[t('Pos'), t('Name'), t('Section'), t('Target length'), t('Order length'), t('Cut start °'), t('Cut end °'), t('Qty'), t('Notes')]],
    body: [...cutGroups.values()].flatMap((items) => {
      const pieces = items.reduce((s, c) => s + c.quantity, 0);
      const totalM = items.reduce((s, c) => s + c.quantity * c.length, 0) / 1000;
      return [
        [
          { content: `${tx(items[0].group)} · ${sectionOf(items[0])}`, colSpan: 7, styles: groupHeadStyle },
          { content: pieces, styles: groupHeadStyle },
          { content: `${t('Total')} ${totalM.toFixed(2)} m`, styles: groupHeadStyle },
        ],
        ...items.map((c) => [
          c.pos,
          nameCell(c.name, c.nameDe),
          sectionOf(c),
          `${roundMm(c.length)} mm`,
          c.orderLength ? `${roundMm(c.orderLength)} mm` : '',
          `${c.cuts.start}°`,
          `${c.cuts.end}°`,
          c.quantity,
          c.notes ? pdfText(tx(c.notes)) : '',
        ]),
      ];
    }),
    styles: { fontSize: 8, font },
    headStyles: { fillColor: [92, 61, 28] },
  });

  const afterCut = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const heading = (text: string, y: number): number => {
    let at = y;
    if (at > 185) {
      doc.addPage();
      at = 14;
    }
    doc.setFontSize(12);
    doc.text(text, 14, at);
    return at + 3;
  };

  // ── Timber: one order at the timber yard (framing by section in stock lengths, cladding boards) ──
  autoTable(doc, {
    startY: heading(t('Timber – one supplier order'), afterCut + 10),
    head: [[t('Section'), t('Order lengths'), t('Pieces'), t('Volume'), t('Offcut')]],
    body: [
      ...bom.timberOrder.map((o) => [
        `${o.section.width}×${o.section.height}${o.glulam ? ' BSH' : ''}`,
        [...o.stock.map((st) => `${st.count} × ${(st.lengthMm / 1000).toFixed(1)} m`), ...o.special.map((l) => `1 × ${(l / 1000).toFixed(1)} m ${t('to length')}`)].join(' + '),
        o.pieces.length,
        `${o.volumeM3.toFixed(3)} m³`,
        `${o.offcutPct.toFixed(1)} %`,
      ]),
      ...bom.lines
        .filter((l) => l.category === 'sheathing' || l.category === 'flooring')
        .flatMap((l) => [
          [nameCell(l.label, l.labelDe), l.stockBoards?.length ? stockBoardsText(l.stockBoards) : l.areaM2 ? `${l.areaM2.toFixed(2)} m²` : '', l.count, `${l.volumeM3.toFixed(3)} m³`, ''],
        ]),
      [t('Total'), '', '', `${(bom.timberOrder.reduce((sum, o) => sum + o.volumeM3, 0) + bom.lines.filter((l) => l.category === 'sheathing' || l.category === 'flooring').reduce((sum, l) => sum + l.volumeM3, 0)).toFixed(3)} m³`, ''],
    ],
    styles: { fontSize: 8, font },
    headStyles: { fillColor: [92, 61, 28] },
  });

  // ── Roof covering ──
  const roofing = bom.lines.find((l) => l.category === 'roofing');
  if (roofing) {
    autoTable(doc, {
      startY: heading(t('Roof covering'), lastY() + 10),
      head: [[t('Item'), t('Spec'), t('Qty')]],
      body: [
        [
          nameCell(roofing.label, roofing.labelDe),
          roofing.sheets
            ? t('{count} sheets × {length} mm, cover width {cover} mm, ribs along the fall line, one piece per run (no cross joint), anti-condensation coating', { count: roofing.sheets.count, length: roofing.sheets.length, cover: roofing.sheets.coverWidth })
            : `${(roofing.areaM2 ?? 0).toFixed(2)} m²`,
          roofing.sheets ? `${roofing.sheets.count} ${t('pcs')}` : `${(roofing.areaM2 ?? 0).toFixed(2)} m²`,
        ],
      ],
      styles: { fontSize: 8, font },
      headStyles: { fillColor: [92, 61, 28] },
    });
  }

  // ── Fittings & small parts ──
  autoTable(doc, {
    startY: heading(t('Fittings & small parts'), lastY() + 10),
    head: [[t('Item'), t('Spec'), t('Qty'), t('Note')]],
    body: [
      ...connections.hardware.map((h) => [nameCell(h.name, h.nameDe), pdfText(tx(h.spec)), `${h.unit === 'm' ? h.quantity.toFixed(1) : h.quantity} ${t(h.unit)}`, h.note ? pdfText(tx(h.note)) : '']),
      ...connections.joinery.map((j) => [nameCell(j.name, j.nameDe), t('joint'), j.quantity, j.note ? pdfText(tx(j.note)) : '']),
    ],
    styles: { fontSize: 8, font },
    headStyles: { fillColor: [92, 61, 28] },
  });

  if (bom.materials.length > 0) {
    autoTable(doc, {
      startY: heading(t('Other materials'), lastY() + 10),
      head: [[t('Item'), t('Spec'), t('Qty'), t('Note')]],
      body: bom.materials.map((m) => [
        nameCell(m.name, m.nameDe),
        tx(m.spec),
        `${m.quantity.toFixed(m.unit === 'pcs' ? 0 : m.unit === 'm³' ? 3 : 2)} ${t(m.unit)}`,
        m.note ? pdfText(tx(m.note)) : '',
      ]),
      styles: { fontSize: 8, font },
      headStyles: { fillColor: [92, 61, 28] },
    });
  }

  doc.addPage();
  doc.setFontSize(12);
  doc.text(t('Statics check (simplified EC5) – overall: {status}', { status: statics.status.toUpperCase() }), 14, 14);
  autoTable(doc, {
    startY: 18,
    head: [[t('Element'), t('Section'), t('Span'), 'q_d', t('Stress'), t('Deflection'), t('Util.'), t('Status')]],
    body: statics.checks.map((c) => [
      nameCell(c.element, c.elementDe),
      `${c.section.width}×${c.section.height}`,
      c.span && c.kind !== 'uplift' && c.kind !== 'connection' ? `${c.span} mm` : '–',
      `${c.loadUls.toFixed(2)} kN/m`,
      `${Math.round(c.stressUtil * 100)} %`,
      c.deflectionLimit ? `${c.deflection.toFixed(1)} / ${c.deflectionLimit.toFixed(1)} mm` : '–',
      `${Math.round(c.utilisation * 100)} %`,
      c.status,
    ]),
    styles: { fontSize: 8, font },
    headStyles: { fillColor: [92, 61, 28] },
  });
  autoTable(doc, {
    startY: lastY() + 8,
    head: [[t('Not checked')]],
    body: statics.notChecked.map((n) => [`• ${pdfText(tx(n))}`]),
    styles: { fontSize: 8, font },
    headStyles: { fillColor: [92, 61, 28] },
  });

  doc.save(`${safeName(project.name)}_cutlist_${lang}.pdf`);
}

export async function exportPriceListPdf(project: ProjectState, model: DerivedModel, pricing: PricingResult): Promise<void> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const lang = getLang();
  const font = lang === 'uk' || lang === 'pl' ? UNICODE_FONT : 'helvetica';
  if (font === UNICODE_FONT) await embedUnicodeFont(doc);
  const p = project.params;
  const eur = (n: number): string => `${n.toFixed(2)} €`;

  doc.setFontSize(16);
  doc.text(t('{name} – Price list', { name: project.name }), 14, 14);
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
    14,
    20,
  );

  // The finished structure above the prices, the table continuing below it
  const tableY = addFinishedRender(doc, project, model, 14, 25, 210 - 28, 110) + 6;

  const sectionHeadStyle = { fontStyle: 'bold' as const, fillColor: [238, 228, 214] as [number, number, number] };
  const totalStyle = { fontStyle: 'bold' as const };
  const row = (l: PricingLine) => [
    lang === 'de' && l.labelDe ? l.labelDe : l.labelDe ? `${tx(l.label)} (${l.labelDe})` : tx(l.label),
    l.unit === '%' ? eur(l.quantity) : `${l.quantity.toFixed(l.unit === 'pcs' ? 0 : 2)} ${t(l.unit)}`,
    l.unit === '%' ? `${l.unitPrice.toFixed(2)} %` : l.unit === 'pcs' ? eur(l.unitPrice) : `${eur(l.unitPrice)}/${t(l.unit)}`,
    { content: eur(l.lineTotal), styles: { halign: 'right' as const } },
  ];
  const sections: [string, PricingLine[], string, number][] = [
    [t('Timber, boards & roofing'), pricing.timberLines, t('Timber subtotal'), pricing.timberLines.reduce((s, l) => s + l.lineTotal, 0)],
    [t('Other materials'), pricing.otherLines, t('Other materials subtotal'), pricing.otherLines.reduce((s, l) => s + l.lineTotal, 0)],
    [t('Doors & windows'), pricing.fixtureLines, t('Doors & windows subtotal'), pricing.fixtureTotal],
    [t('Hardware & fixings'), pricing.hardwareLines, t('Hardware subtotal'), pricing.hardwareTotal],
    [t('Delivery & surcharges'), pricing.deliveryLines, t('Delivery subtotal'), pricing.deliveryTotal],
  ];
  autoTable(doc, {
    startY: tableY,
    head: [[t('Item'), t('Qty'), t('Unit price'), { content: t('Total'), styles: { halign: 'right' } }]],
    body: [
      ...sections
        .filter(([, lines]) => lines.length > 0)
        .flatMap(([title, lines, subtotalLabel, subtotal]) => [
          [{ content: title, colSpan: 4, styles: sectionHeadStyle }],
          ...lines.map(row),
          [{ content: subtotalLabel, colSpan: 3, styles: totalStyle }, { content: eur(subtotal), styles: { ...totalStyle, halign: 'right' as const } }],
        ]),
      [
        { content: t('Grand total'), colSpan: 3, styles: { ...totalStyle, fontSize: 10 } },
        { content: eur(pricing.grandTotal), styles: { ...totalStyle, fontSize: 10, halign: 'right' as const } },
      ],
    ],
    columnStyles: { 1: { halign: 'right', cellWidth: 24 }, 2: { halign: 'right', cellWidth: 26 }, 3: { cellWidth: 24 } },
    styles: { fontSize: 8, font },
    headStyles: { fillColor: [92, 61, 28] },
  });

  const after = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(8);
  doc.text(doc.splitTextToSize(t('Prices in EUR incl. 19 % VAT. Estimate only — check current prices with your suppliers.'), 182), 14, after + 8);

  doc.save(`${safeName(project.name)}_pricelist_${lang}.pdf`);
}
