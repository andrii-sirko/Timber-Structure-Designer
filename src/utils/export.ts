import { getLang, t, tx } from '@/i18n';
import { roundMm } from '@/engine/geometry';
import { embedUnicodeFont, UNICODE_FONT } from '@/utils/pdfFont';
import type { BomResult, ConnectionsResult, CutListItem, ProjectState, StaticsResult } from '@/types';

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

function safeName(name: string): string {
  return name.replace(/[^\w\d-]+/g, '_').replace(/^_+|_+$/g, '') || 'project';
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

export async function exportCutListPdf(
  project: ProjectState,
  cutList: CutListItem[],
  bom: BomResult,
  statics: StaticsResult,
  connections: ConnectionsResult,
): Promise<void> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  // Helvetica only covers Latin-1; Ukrainian (Cyrillic) and Polish (ą, ę, ł, ś, ż…) need an embedded font
  const font = getLang() === 'uk' || getLang() === 'pl' ? UNICODE_FONT : 'helvetica';
  if (font === UNICODE_FONT) await embedUnicodeFont(doc);
  const p = project.params;
  const lang = getLang();
  // `name (nameDe)` cell: the German term stays a secondary parenthetical unless the UI itself is German.
  const nameCell = (name: string, nameDe: string): string =>
    lang === 'de' ? nameDe : `${tx(name)} (${nameDe})`;

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

  autoTable(doc, {
    startY: 25,
    head: [[t('Pos'), t('Group'), t('Name'), t('Section'), t('Length'), t('Cut start °'), t('Cut end °'), t('Qty'), t('Notes')]],
    body: cutList.map((c) => [
      c.pos,
      tx(c.group),
      nameCell(c.name, c.nameDe),
      `${roundMm(c.section.width)}×${roundMm(c.section.height)}`,
      `${roundMm(c.length)} mm`,
      `${c.cuts.start}°`,
      `${c.cuts.end}°`,
      c.quantity,
      c.notes ? tx(c.notes) : '',
    ]),
    styles: { fontSize: 8, font },
    headStyles: { fillColor: [92, 61, 28] },
  });

  const afterCut = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(12);
  doc.text(t('Bill of materials'), 14, afterCut + 10);
  autoTable(doc, {
    startY: afterCut + 13,
    head: [[t('Category'), t('Section'), t('Pieces'), t('Length'), t('Area'), t('Volume'), t('Mass')]],
    body: [
      ...bom.lines.map((l) => [
        nameCell(l.label, l.labelDe),
        l.section ? `${l.section.width}×${l.section.height}` : '–',
        l.count,
        l.totalLengthM ? `${l.totalLengthM.toFixed(2)} m` : '–',
        l.areaM2 ? `${l.areaM2.toFixed(2)} m²` : '–',
        `${l.volumeM3.toFixed(3)} m³`,
        `${Math.round(l.massKg)} kg`,
      ]),
      [t('Total'), '', '', `${bom.totalLengthM.toFixed(1)} m`, '', `${bom.totalVolumeM3.toFixed(3)} m³`, `${Math.round(bom.totalMassKg)} kg`],
    ],
    styles: { fontSize: 8, font },
    headStyles: { fillColor: [92, 61, 28] },
  });

  if (bom.materials.length > 0) {
    const afterBom = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    doc.text(t('Other materials'), 14, afterBom + 10);
    autoTable(doc, {
      startY: afterBom + 13,
      head: [[t('Item'), t('Spec'), t('Qty'), t('Note')]],
      body: bom.materials.map((m) => [
        nameCell(m.name, m.nameDe),
        tx(m.spec),
        `${m.quantity.toFixed(m.unit === 'pcs' ? 0 : 2)} ${t(m.unit)}`,
        m.note ? tx(m.note) : '',
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
      `${c.span} mm`,
      `${c.loadUls.toFixed(2)} kN/m`,
      `${Math.round(c.stressUtil * 100)} %`,
      c.deflectionLimit ? `${c.deflection.toFixed(1)} / ${c.deflectionLimit.toFixed(1)} mm` : '–',
      `${Math.round(c.utilisation * 100)} %`,
      c.status,
    ]),
    styles: { fontSize: 8, font },
    headStyles: { fillColor: [92, 61, 28] },
  });
  const afterStatics = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.text(
    t('Connections ({mode})', { mode: connections.mode === 'hardware' ? t('mechanical connectors') : t('traditional joinery') }),
    14,
    afterStatics + 10,
  );
  autoTable(doc, {
    startY: afterStatics + 13,
    head: [[t('Item'), t('Spec'), t('Qty'), t('Note')]],
    body: [
      ...connections.hardware.map((h) => [nameCell(h.name, h.nameDe), tx(h.spec), h.quantity, h.note ? tx(h.note) : '']),
      ...connections.joinery.map((j) => [nameCell(j.name, j.nameDe), t('joint'), j.quantity, j.note ? tx(j.note) : '']),
    ],
    styles: { fontSize: 8, font },
    headStyles: { fillColor: [92, 61, 28] },
  });

  doc.save(`${safeName(project.name)}_cutlist_${lang}.pdf`);
}
