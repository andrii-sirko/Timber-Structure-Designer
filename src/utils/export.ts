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
  const header = ['Pos', 'Group', 'Name', 'Name (DE)', 'Width mm', 'Height mm', 'Length mm', 'Cut start °', 'Cut end °', 'Qty', 'Notes'];
  const rows = cutList.map((c) => [
    c.pos,
    c.group,
    c.name,
    c.nameDe,
    c.section.width,
    c.section.height,
    c.length,
    c.cuts.start,
    c.cuts.end,
    c.quantity,
    c.notes ?? '',
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
  const p = project.params;

  doc.setFontSize(16);
  doc.text(`${project.name} – Cutting list & BOM`, 14, 14);
  doc.setFontSize(9);
  doc.text(
    `Structure ${p.length} × ${p.width} mm, H1 ${p.frontHeight} / H2 ${p.rearHeight} mm · ${p.timber.strengthClass} · generated ${new Date().toLocaleDateString()}`,
    14,
    20,
  );

  autoTable(doc, {
    startY: 25,
    head: [['Pos', 'Group', 'Name', 'Section', 'Length', 'Cut start', 'Cut end', 'Qty', 'Notes']],
    body: cutList.map((c) => [
      c.pos,
      c.group,
      `${c.name} (${c.nameDe})`,
      `${c.section.width}×${c.section.height}`,
      `${c.length} mm`,
      `${c.cuts.start}°`,
      `${c.cuts.end}°`,
      c.quantity,
      c.notes ?? '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [92, 61, 28] },
  });

  const afterCut = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(12);
  doc.text('Bill of materials', 14, afterCut + 10);
  autoTable(doc, {
    startY: afterCut + 13,
    head: [['Category', 'Section', 'Pieces', 'Length', 'Area', 'Volume', 'Mass']],
    body: [
      ...bom.lines.map((l) => [
        `${l.label} (${l.labelDe})`,
        l.section ? `${l.section.width}×${l.section.height}` : '–',
        l.count,
        l.totalLengthM ? `${l.totalLengthM.toFixed(2)} m` : '–',
        l.areaM2 ? `${l.areaM2.toFixed(2)} m²` : '–',
        `${l.volumeM3.toFixed(3)} m³`,
        `${Math.round(l.massKg)} kg`,
      ]),
      ['Total', '', '', `${bom.totalLengthM.toFixed(1)} m`, '', `${bom.totalVolumeM3.toFixed(3)} m³`, `${Math.round(bom.totalMassKg)} kg`],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [92, 61, 28] },
  });

  if (bom.materials.length > 0) {
    const afterBom = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    doc.text('Other materials', 14, afterBom + 10);
    autoTable(doc, {
      startY: afterBom + 13,
      head: [['Item', 'Spec', 'Qty', 'Note']],
      body: bom.materials.map((m) => [`${m.name} (${m.nameDe})`, m.spec, `${m.quantity.toFixed(m.unit === 'pcs' ? 0 : 2)} ${m.unit}`, m.note ?? '']),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [92, 61, 28] },
    });
  }

  doc.addPage();
  doc.setFontSize(12);
  doc.text(`Statics check (simplified EC5) – overall: ${statics.status.toUpperCase()}`, 14, 14);
  autoTable(doc, {
    startY: 18,
    head: [['Element', 'Section', 'Span', 'q_d', 'Stress', 'Deflection', 'Util.', 'Status']],
    body: statics.checks.map((c) => [
      `${c.element} (${c.elementDe})`,
      `${c.section.width}×${c.section.height}`,
      `${c.span} mm`,
      `${c.loadUls.toFixed(2)} kN/m`,
      `${Math.round(c.stressUtil * 100)} %`,
      c.deflectionLimit ? `${c.deflection.toFixed(1)} / ${c.deflectionLimit.toFixed(1)} mm` : '–',
      `${Math.round(c.utilisation * 100)} %`,
      c.status,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [92, 61, 28] },
  });
  const afterStatics = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.text(`Connections (${connections.mode})`, 14, afterStatics + 10);
  autoTable(doc, {
    startY: afterStatics + 13,
    head: [['Item', 'Spec', 'Qty', 'Note']],
    body: [
      ...connections.hardware.map((h) => [`${h.name} (${h.nameDe})`, h.spec, h.quantity, h.note ?? '']),
      ...connections.joinery.map((j) => [`${j.name} (${j.nameDe})`, 'joint', j.quantity, j.note ?? '']),
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [92, 61, 28] },
  });

  doc.save(`${safeName(project.name)}_cutlist.pdf`);
}
