import type { jsPDF } from 'jspdf';
import type { CellHookData } from 'jspdf-autotable';
import type { DerivedModel, Opening, ProjectState } from '@/types';
import { WALL_IDS } from '@/types';
import { computeAllWallFrames } from '@/engine';
import { roundMm, sectionLabel } from '@/engine/geometry';
import { applyStepOrder, assemblyProgress, buildAssemblyFrames, buildAssemblySteps, stepHardwareShares, type AssemblyStep } from '@/engine/assembly';
import { getLang, t as translate, tx as translateText, type Lang } from '@/i18n';
import { embedUnicodeFont, UNICODE_FONT } from './pdfFont';
import { createAssemblyDrawer } from './assemblyRender';

/**
 * Printable assembly guide in the style of flat-pack furniture instructions: cover drawing, what
 * you need, every part and material with a tick box, then one drawing per step with the parts and
 * fasteners it takes. Text is in the UI language with the German trade terms alongside.
 */
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const INK: [number, number, number] = [17, 24, 39];
const GREY: [number, number, number] = [107, 114, 128];
const RULE: [number, number, number] = [209, 213, 219];
const ACCENT: [number, number, number] = [245, 179, 1];
const STEPS_PER_PAGE = 2;

const TOOLS = [
  'Tape measure, carpenter square and pencil',
  'Spirit level (min. 1 m) and string line',
  'Cordless drill / driver with bits and wood drills',
  'Circular saw or hand saw, chisel',
  'Spanners or socket set, hammer',
  'Screw clamps and boards for temporary props',
  'Two stable ladders or a scaffold tower',
  'Gloves, safety glasses, sturdy shoes',
];

const NOTES = [
  'Work with at least two people: posts, purlins and rafters are heavy and long.',
  'Check the base first: the diagonals of the post layout must be equal before anything is fixed.',
  'Lay out all parts and tick them off in the parts list. Position numbers match the cutting list.',
  'Pre-drill screws near timber ends and keep every post propped until its row is braced.',
  'After the first few weeks re-tighten all bolts: timber shrinks as it dries.',
  'This guide follows a simplified model. Have the structure and its foundations checked by a qualified carpenter or engineer, and follow your local building rules.',
];

function safeName(name: string): string {
  return name.replace(/[^\w\d-]+/g, '_').replace(/^_+|_+$/g, '') || 'timber-structure';
}

export async function exportAssemblyPdf(project: ProjectState, model: DerivedModel): Promise<void> {
  (await buildAssemblyPdf(project, model)).save(`${safeName(project.name)}_assembly.pdf`);
}

export async function buildAssemblyPdf(project: ProjectState, model: DerivedModel): Promise<jsPDF> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableModule.default;
  const lang: Lang = getLang();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  // Always the embedded Unicode font: part specs carry symbols (→, ≥, ²) that Helvetica's Latin-1 lacks
  const font = UNICODE_FONT;
  await embedUnicodeFont(doc);

  const t = (key: string, params?: Record<string, string | number>): string => translate(key, params, lang);
  const tx = (text: string): string => translateText(text, lang);
  const german = lang === 'de';
  /** German counterpart of a UI string; empty when the guide is German already */
  const de = (key: string, params?: Record<string, string | number>): string => (german ? '' : translate(key, params, 'de'));
  const titleOf = (step: AssemblyStep, to: Lang): string =>
    translate(step.title, step.where ? { where: translateText(step.where, to) } : undefined, to);
  const nameCell = (name: string, nameDe: string): string => (german ? nameDe : `${tx(name)}\n${nameDe}`);

  const text = (value: string, x: number, y: number, size: number, style: 'normal' | 'bold' = 'normal', color = INK, align: 'left' | 'right' | 'center' = 'left'): void => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(value, x, y, { align });
  };
  /** Wrapped paragraph; returns the y below it */
  const paragraph = (value: string, x: number, y: number, width: number, size: number, color = INK, style: 'normal' | 'bold' = 'normal'): number => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(value, width) as string[];
    const lineHeight = size * 0.3528 * 1.3;
    doc.text(lines, x, y);
    return y + lines.length * lineHeight;
  };
  const rule = (y: number, weight = 0.2, color = RULE): void => {
    doc.setDrawColor(...color);
    doc.setLineWidth(weight);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  };
  /** Section heading with the German term beside it; returns the y below */
  const heading = (key: string, y: number): number => {
    text(t(key), MARGIN, y, 15, 'bold');
    const width = doc.getTextWidth(t(key));
    if (!german) text(de(key), MARGIN + width + 3, y, 9, 'normal', GREY);
    rule(y + 2.5, 0.6, INK);
    return y + 9;
  };

  const steps = applyStepOrder(buildAssemblySteps(model, project), project.assemblyOrder);
  const frames = buildAssemblyFrames(steps, model.framing.members, false);
  const shares = stepHardwareShares(steps, model.connections.hardware);
  const stepsOfMember = new Map<string, number>();
  steps.forEach((step, i) => step.memberIds.forEach((id) => stepsOfMember.set(id, i + 1)));
  const posOfMember = new Map<string, number>();
  for (const item of model.cutList) for (const id of item.memberIds) posOfMember.set(id, item.pos);
  const membersById = new Map(model.framing.members.map((m) => [m.id, m]));

  const openings: { hostKey: string; opening: Opening }[] = [
    ...WALL_IDS.filter((id) => project.walls[id].closed).flatMap((id) => project.walls[id].openings.map((opening) => ({ hostKey: id as string, opening }))),
    ...project.partitions.flatMap((p) => p.openings.map((opening) => ({ hostKey: p.id, opening }))),
  ];
  const drawer = createAssemblyDrawer(model.framing, computeAllWallFrames(project), openings);

  try {
    // ── Cover ────────────────────────────────────────────────────────────────
    const p = project.params;
    text(project.name, MARGIN, 30, 30, 'bold');
    text(t('Assembly guide'), MARGIN, 40, 14, 'normal', GREY);
    if (!german) text(de('Assembly guide'), MARGIN + doc.getTextWidth(t('Assembly guide')) + 4, 40, 10, 'normal', GREY);
    rule(45, 0.8, INK);
    const everything = new Set([...model.framing.members.map((m) => m.id), ...model.framing.panels.map((q) => q.id)]);
    const coverH = CONTENT_W / drawer.aspect;
    doc.addImage(drawer.draw({ installed: everything, current: new Set(), fixtures: 'installed', bold: true }), 'PNG', MARGIN, 58, CONTENT_W, coverH, undefined, 'FAST');
    const facts: [string, string][] = [
      ['Length × width', `${p.length} × ${p.width} mm`],
      ['Eave heights', `${p.frontHeight} / ${p.rearHeight} mm`],
      ['Roof pitch', `${model.framing.roof.pitchDeg.toFixed(1)}°`],
      ['Timber', `${p.timber.strengthClass} · ${model.bom.totalVolumeM3.toFixed(2)} m³ · ${Math.round(model.bom.totalMassKg)} kg`],
      ['Parts', String(model.framing.members.length)],
      ['Steps', String(steps.length)],
    ];
    const factsY = 58 + coverH + 16;
    const columnW = CONTENT_W / 3;
    facts.forEach(([label, value], i) => {
      const x = MARGIN + (i % 3) * columnW;
      const y = factsY + Math.floor(i / 3) * 17;
      text(t(label).toUpperCase(), x, y, 7, 'bold', GREY);
      text(value, x, y + 6, 11, 'bold');
    });
    text(new Date().toLocaleDateString(lang === 'uk' ? 'uk-UA' : lang === 'de' ? 'de-DE' : 'en-GB'), MARGIN, PAGE_H - 22, 8, 'normal', GREY);

    // ── Before you start ─────────────────────────────────────────────────────
    doc.addPage();
    let y = heading('Before you start', 24);
    drawPeople(doc, MARGIN + 4, y + 2);
    text('2×', MARGIN + 30, y + 14, 22, 'bold');
    paragraph(t(NOTES[0]), MARGIN + 50, y + 10, CONTENT_W - 50, 10);
    y += 34;
    text(t('Tools'), MARGIN, y, 11, 'bold');
    if (!german) text(de('Tools'), MARGIN + doc.getTextWidth(t('Tools')) + 3, y, 8, 'normal', GREY);
    y += 6;
    for (const tool of TOOLS) {
      tickBox(doc, MARGIN, y - 3);
      y = paragraph(t(tool), MARGIN + 7, y, CONTENT_W - 7, 9.5) + 1.5;
    }
    y += 6;
    text(t('Good to know'), MARGIN, y, 11, 'bold');
    y += 6;
    NOTES.slice(1).forEach((note, i) => {
      text(`${i + 1}`, MARGIN + 1, y, 9.5, 'bold');
      y = paragraph(t(note), MARGIN + 7, y, CONTENT_W - 7, 9.5) + 2;
    });
    y += 6;
    text(t('How to read the drawings'), MARGIN, y, 11, 'bold');
    y += 5;
    const legend: [string, 'current' | 'built' | 'sheet'][] = [
      ['Fit these parts in this step', 'current'],
      ['Already built', 'built'],
      ['Sheets already fitted (outline only, so they hide nothing)', 'sheet'],
    ];
    for (const [label, kind] of legend) {
      doc.setLineWidth(kind === 'current' ? 0.6 : 0.3);
      doc.setDrawColor(...(kind === 'current' ? INK : GREY));
      doc.setFillColor(...(kind === 'current' ? ACCENT : ([255, 255, 255] as [number, number, number])));
      if (kind === 'sheet') doc.setLineDashPattern([1, 0.8], 0);
      doc.rect(MARGIN, y - 1, 9, 5, 'FD');
      doc.setLineDashPattern([], 0);
      y = paragraph(t(label), MARGIN + 13, y + 3, CONTENT_W - 13, 9.5) + 3;
    }

    // ── Parts and materials ──────────────────────────────────────────────────
    doc.addPage();
    y = heading('Parts list', 24);
    const tableBase = {
      theme: 'plain' as const,
      margin: { left: MARGIN, right: MARGIN, top: 20, bottom: 18 },
      styles: { font, fontSize: 8.5, cellPadding: { top: 1.6, bottom: 1.6, left: 1.5, right: 1.5 }, textColor: INK, lineColor: RULE, lineWidth: { bottom: 0.15 }, valign: 'middle' as const },
      headStyles: { font, fontStyle: 'bold' as const, fontSize: 7.5, textColor: GREY, lineColor: INK, lineWidth: { bottom: 0.5 } },
      // The first column is an empty box to tick off when the part is on site
      didDrawCell: (data: CellHookData): void => {
        if (data.section === 'body' && data.column.index === 0) tickBox(doc, data.cell.x + 1.5, data.cell.y + data.cell.height / 2 - 1.75);
      },
    };
    const finalY = (): number => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    /** Start a table section, on a fresh page when too little room is left */
    const section = (key: string): number => {
      let at = finalY() + 12;
      if (at > PAGE_H - 60) {
        doc.addPage();
        at = 24;
      }
      text(t(key), MARGIN, at, 11, 'bold');
      if (!german) text(de(key), MARGIN + doc.getTextWidth(t(key)) + 3, at, 8, 'normal', GREY);
      return at + 3;
    };

    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [['', t('Pos'), t('Name'), t('Section'), t('Length'), t('Cuts'), t('Qty'), t('Step')]],
      body: model.cutList.map((c) => [
        '',
        String(c.pos),
        nameCell(c.name, c.nameDe),
        sectionLabel(c.section),
        `${roundMm(c.length)} mm`,
        c.cuts.start || c.cuts.end ? `${c.cuts.start}° / ${c.cuts.end}°` : '–',
        `${c.quantity}×`,
        [...new Set(c.memberIds.map((id) => stepsOfMember.get(id)).filter((n): n is number => n !== undefined))].sort((a, b) => a - b).join(', '),
      ]),
      columnStyles: { 0: { cellWidth: 7 }, 1: { cellWidth: 10, fontStyle: 'bold', halign: 'center' }, 6: { fontStyle: 'bold', halign: 'right', cellWidth: 12 }, 7: { cellWidth: 22 } },
    });

    const sheets = model.bom.lines.filter((l) => l.areaM2 && !l.section);
    if (sheets.length + model.bom.materials.length + model.bom.fixtures.length > 0) {
      autoTable(doc, {
        ...tableBase,
        startY: section('Sheets, doors and other materials'),
        head: [['', t('Item'), t('Spec'), t('Qty')]],
        body: [
          ...sheets.map((l) => ['', nameCell(l.label, l.labelDe), '', `${(l.areaM2 ?? 0).toFixed(2)} m²`]),
          ...model.bom.fixtures.map((f) => ['', nameCell(f.product, f.productDe), `${tx(f.wall)} · ${f.frameWidth} × ${f.frameHeight} mm`, '1×']),
          ...model.bom.materials.map((m) => ['', nameCell(m.name, m.nameDe), [tx(m.spec), m.note ? tx(m.note) : ''].filter(Boolean).join(' · '), `${m.quantity.toFixed(m.unit === 'pcs' ? 0 : 2)} ${t(m.unit)}`]),
        ],
        columnStyles: { 0: { cellWidth: 7 }, 1: { cellWidth: 62 }, 3: { fontStyle: 'bold', halign: 'right', cellWidth: 24 } },
      });
    }

    const { hardware, joinery } = model.connections;
    if (hardware.length + joinery.length > 0) {
      autoTable(doc, {
        ...tableBase,
        startY: section('Fasteners and connectors'),
        head: [['', t('Item'), t('Spec'), t('Qty')]],
        body: [
          ...hardware.map((h) => ['', nameCell(h.name, h.nameDe), [tx(h.spec), h.note ? tx(h.note) : ''].filter(Boolean).join(' · '), `${h.quantity} ${t(h.unit)}`]),
          ...joinery.map((j) => ['', nameCell(j.name, j.nameDe), j.note ? tx(j.note) : '', `${j.quantity}×`]),
        ],
        columnStyles: { 0: { cellWidth: 7 }, 1: { cellWidth: 62 }, 3: { fontStyle: 'bold', halign: 'right', cellWidth: 24 } },
      });
    }

    // ── Steps ────────────────────────────────────────────────────────────────
    const blockH = (PAGE_H - 2 * 20) / STEPS_PER_PAGE;
    const drawingW = 122;
    const drawingH = drawingW / drawer.aspect;
    const sideX = MARGIN + drawingW + 5;
    const sideW = PAGE_W - MARGIN - sideX;
    steps.forEach((step, i) => {
      if (i % STEPS_PER_PAGE === 0) doc.addPage();
      const top = 20 + (i % STEPS_PER_PAGE) * blockH;
      if (i % STEPS_PER_PAGE > 0) rule(top - 5);

      text(String(i + 1), MARGIN, top + 11, 34, 'bold');
      const titleX = MARGIN + Math.max(doc.getTextWidth(String(i + 1)), 12) + 5;
      text(titleOf(step, lang), titleX, top + 5, 13, 'bold');
      if (!german) text(titleOf(step, 'de'), titleX, top + 10.5, 9, 'normal', GREY);

      const progress = assemblyProgress(frames, i);
      const fittedBefore = steps.slice(0, i).some((s) => s.fixtures);
      const image = drawer.draw({ installed: progress.installed, current: progress.current, fixtures: step.fixtures ? 'current' : fittedBefore ? 'installed' : 'none' });
      const drawingY = top + 15;
      doc.addImage(image, 'PNG', MARGIN, drawingY, drawingW, drawingH, undefined, 'FAST');

      // Parts of the step: quantity, position number in a circle, size
      let sy = drawingY + 3;
      const groups = new Map<number | string, { pos: number | null; label: string; size: string; count: number }>();
      for (const id of step.memberIds) {
        const m = membersById.get(id);
        if (!m) continue;
        const pos = posOfMember.get(id) ?? null;
        const key = pos ?? `${m.group}|${roundMm(m.length)}`;
        const group = groups.get(key);
        if (group) group.count += 1;
        else groups.set(key, { pos, label: german ? m.nameDe : tx(/^(.*?) \(/.exec(m.group)?.[1] ?? m.group), size: `${sectionLabel(m.section)} × ${roundMm(m.length)}`, count: 1 });
      }
      const limit = drawingY + drawingH - 2;
      const rows = [...groups.values()];
      rows.some((g, n) => {
        if (sy > limit - 22 && n < rows.length - 1) {
          text(`+ ${rows.length - n} ...`, sideX, sy + 2, 8, 'normal', GREY);
          sy += 6;
          return true;
        }
        text(`${g.count}×`, sideX + 9, sy + 3, 12, 'bold', INK, 'right');
        if (g.pos !== null) {
          doc.setDrawColor(...INK);
          doc.setLineWidth(0.35);
          doc.circle(sideX + 14.5, sy + 1.6, 3.2, 'S');
          text(String(g.pos), sideX + 14.5, sy + 2.7, g.pos > 99 ? 6 : 7.5, 'bold', INK, 'center');
        }
        text(g.label, sideX + 20, sy + 1.2, 8, 'bold');
        text(`${g.size} mm`, sideX + 20, sy + 4.8, 7, 'normal', GREY);
        sy += 9;
        return false;
      });
      if (step.panelIds.length > 0 || step.fixtures) {
        text(`${step.fixtures ? openings.filter((o) => o.opening.type !== 'passage').length : step.panelIds.length}×`, sideX + 9, sy + 3, 12, 'bold', INK, 'right');
        paragraph(titleOf(step, lang), sideX + 12, sy + 2.5, sideW - 12, 8, INK, 'bold');
        sy += 9;
      }
      const fasteners = shares.get(step.key) ?? [];
      if (fasteners.length > 0 && sy < limit - 8) {
        doc.setDrawColor(...RULE);
        doc.setLineWidth(0.2);
        doc.line(sideX, sy, sideX + sideW, sy);
        sy += 4.5;
        for (const { item, quantity } of fasteners) {
          if (sy > limit) break;
          text(`~${quantity}`, sideX + 9, sy, 8, 'bold', INK, 'right');
          const label = `${german ? item.nameDe : tx(item.name)} ${tx(item.spec)}`;
          sy = paragraph(label, sideX + 12, sy, sideW - 12, 7, GREY) + 1.2;
        }
      }

      let ty = paragraph(tx(step.instruction), MARGIN, drawingY + drawingH + 6, CONTENT_W, 9.5);
      if (!german) ty = paragraph(translateText(step.instruction, 'de'), MARGIN, ty + 1.5, CONTENT_W, 7.5, GREY);
    });

    // ── Footers ──────────────────────────────────────────────────────────────
    const pages = doc.getNumberOfPages();
    for (let page = 2; page <= pages; page++) {
      doc.setPage(page);
      rule(PAGE_H - 13);
      text(project.name, MARGIN, PAGE_H - 8.5, 8, 'normal', GREY);
      text(`${page} / ${pages}`, PAGE_W - MARGIN, PAGE_H - 8.5, 8, 'bold', INK, 'right');
    }
    return doc;
  } finally {
    drawer.dispose();
  }
}

function tickBox(doc: jsPDF, x: number, y: number): void {
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.rect(x, y, 3.5, 3.5, 'S');
}

/** Two stick figures: the "two people needed" pictogram. */
function drawPeople(doc: jsPDF, x: number, y: number): void {
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.9);
  doc.setLineCap('round');
  for (const dx of [0, 12]) {
    const cx = x + 5 + dx;
    doc.circle(cx, y + 3, 2.4, 'S');
    doc.line(cx, y + 5.4, cx, y + 13);
    doc.line(cx - 4, y + 8.5, cx + 4, y + 8.5);
    doc.line(cx, y + 13, cx - 3.2, y + 19);
    doc.line(cx, y + 13, cx + 3.2, y + 19);
  }
  doc.setLineCap('butt');
}
