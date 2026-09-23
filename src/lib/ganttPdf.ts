/**
 * Export du Gantt en PDF vectoriel, page à l'italienne (paysage).
 * Le format (A4 → A0) est choisi automatiquement selon la durée du projet,
 * puis l'échelle de temps est étirée pour remplir toute la largeur de la page.
 * Si le nombre de lignes dépasse la hauteur, le Gantt continue sur d'autres pages
 * (l'en-tête de temps est répété).
 */
import type { jsPDF as JsPDF } from 'jspdf';
import type { ISODate, Project } from '../types';
import { addDays, dayNum, fmt, fromDayNum, weekday } from './dates';
import { avancementProjet, etendue, finEstimeeProjet, formatEcart } from './planning';
import { blocBars, openObsCount, sousBlocBars, type RowBars } from './ganttModel';

export type GanttDetail = 'complet' | 'blocs';

/** Formats paysage (mm) du plus petit au plus grand. */
export const FORMATS: { nom: string; w: number; h: number }[] = [
  { nom: 'A4', w: 297, h: 210 },
  { nom: 'A3', w: 420, h: 297 },
  { nom: 'A2', w: 594, h: 420 },
  { nom: 'A1', w: 841, h: 594 },
  { nom: 'A0', w: 1189, h: 841 },
];

/**
 * Dimensions de base (format A4), multipliées par k = √(largeur / 297) :
 * sur un grand format, textes et lignes grandissent un peu, et le temps
 * profite surtout de la largeur supplémentaire.
 */
const BASE = { M: 10, LABEL_W: 66, HEAD_H: 20, SCALE_H: 10, FOOT_H: 9, ROW_MIN: 6.5, ROW_MAX: 11 };
const MIN_DAY = 0.45; // largeur minimale d'un jour (mm, à l'échelle A4) pour rester lisible

function dims(fmt: { w: number; h: number }) {
  const k = Math.sqrt(fmt.w / 297);
  return {
    k,
    M: BASE.M * k,
    LABEL_W: BASE.LABEL_W * k,
    HEAD_H: BASE.HEAD_H * k,
    SCALE_H: BASE.SCALE_H * k,
    FOOT_H: BASE.FOOT_H * k,
    ROW_MIN: BASE.ROW_MIN * k,
    ROW_MAX: BASE.ROW_MAX * k,
  };
}

/** Hauteur de ligne : on remplit la page (dans la limite ROW_MAX), puis on pagine. */
function layoutRows(fmt: { w: number; h: number }, nRows: number) {
  const d = dims(fmt);
  const avail = fmt.h - d.M - d.HEAD_H - d.SCALE_H - d.FOOT_H - d.M;
  const rowH = Math.min(d.ROW_MAX, Math.max(d.ROW_MIN, avail / Math.max(1, nRows)));
  const perPage = Math.max(1, Math.floor(avail / rowH + 1e-6));
  return { rowH, perPage, pages: Math.max(1, Math.ceil(nRows / perPage)) };
}

const C = {
  ink: '#141312',
  muted: '#847a6d',
  line: '#d6cab7',
  lineSoft: '#e9e1d4',
  sand: '#cbb899',
  sand2: '#b39f7d',
  plan: '#d8c9ae',
  blocBg: '#f1e9dc',
  weekend: '#f5efe5',
  late: '#a3412c',
  lateSoft: '#efd5cc',
  early: '#55663a',
  earlySoft: '#dde2cc',
};

/** Les polices standard des PDF ne connaissent pas certains signes typographiques. */
const txt = (s: string) => s.replace(/[’‘]/g, "'").replace(/[−–]/g, '-').replace(/→/g, '>').replace(/[«»]/g, '"').replace(/ /g, ' ');

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MOIS_C = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

export interface GanttPdfPlan {
  format: { nom: string; w: number; h: number };
  debut: ISODate;
  fin: ISODate;
  jours: number;
  pages: number;
}

interface Row {
  bloc: boolean;
  code: string;
  nom: string;
  bars: RowBars;
  obs: number;
}

function buildRows(p: Project, auj: ISODate, detail: GanttDetail): Row[] {
  const rows: Row[] = [];
  p.blocs.forEach((b, bi) => {
    const code = String(bi + 1).padStart(2, '0');
    rows.push({ bloc: true, code, nom: b.nom.toUpperCase(), bars: blocBars(b, auj), obs: openObsCount(p, { blocId: b.id }) });
    if (detail === 'complet')
      b.sousBlocs.forEach((sb, si) =>
        rows.push({ bloc: false, code: `${code}.${String(si + 1).padStart(2, '0')}`, nom: sb.nom, bars: sousBlocBars(sb, auj), obs: openObsCount(p, { sousBlocId: sb.id }) })
      );
  });
  return rows;
}

/** Calcule le format retenu et la pagination (affiché avant l'export). */
export function planGanttPdf(p: Project, auj: ISODate, detail: GanttDetail): GanttPdfPlan {
  const e = etendue(p, auj);
  const debut = addDays(e.debut, -3);
  const fin = addDays(e.fin, 12); // place pour les étiquettes d'écart
  const jours = dayNum(fin) - dayNum(debut) + 1;
  const format =
    FORMATS.find((f) => {
      const d = dims(f);
      return (f.w - 2 * d.M - d.LABEL_W) / jours >= MIN_DAY * d.k;
    }) ?? FORMATS[FORMATS.length - 1];
  const { pages } = layoutRows(format, buildRows(p, auj, detail).length);
  return { format, debut, fin, jours, pages };
}

export async function ganttPdf(p: Project, auj: ISODate, detail: GanttDetail): Promise<{ blob: Blob; name: string; plan: GanttPdfPlan }> {
  const { jsPDF } = await import('jspdf');
  const plan = planGanttPdf(p, auj, detail);
  const { w: W, h: H } = plan.format;
  const doc: JsPDF = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H], compress: true });
  doc.setProperties({ title: txt(`Planning - ${p.info.nom}`), creator: 'Atelier 618' });

  const rows = buildRows(p, auj, detail);
  const { k, M, LABEL_W, HEAD_H, SCALE_H } = dims(plan.format);
  const { rowH, perPage, pages } = layoutRows(plan.format, rows.length);
  const u = (n: number) => n * k; // longueur à l'échelle du format
  const fs = (pt: number) => doc.setFontSize(pt * k);
  const x0 = M + LABEL_W;
  const start = dayNum(plan.debut);
  const end = start + plan.jours;
  const dayW = (W - M - x0) / plan.jours;
  const X = (d: number) => x0 + (d - start) * dayW;
  const rowsTop = M + HEAD_H + SCALE_H;
  const sTop = M + HEAD_H;
  const pct = avancementProjet(p, auj);
  const finEst = finEstimeeProjet(p, auj);
  const midY = (y: number) => y + rowH / 2 + u(1);

  for (let page = 0; page < pages; page++) {
    if (page > 0) doc.addPage([W, H], 'landscape');
    const slice = rows.slice(page * perPage, (page + 1) * perPage);
    const rowsBottom = rowsTop + slice.length * rowH;

    // — En-tête —
    doc.setTextColor(C.ink);
    doc.setFont('helvetica', 'bold');
    fs(16);
    doc.text(txt(p.info.nom || 'Projet'), M, M + u(6));
    doc.setFont('helvetica', 'normal');
    fs(8.5);
    doc.setTextColor(C.muted);
    const infos = [
      `Planning édité le ${fmt(auj)}`,
      `Avancement estimé ${pct} %`,
      p.info.dateFinPrevue ? `Fin prévue ${fmt(p.info.dateFinPrevue)}` : '',
      finEst ? `Fin estimée ${fmt(finEst)}` : '',
      p.info.adresse,
    ].filter(Boolean);
    doc.text(txt(infos.join('   ·   ')), M, M + u(12));
    doc.setFont('helvetica', 'bold');
    fs(9);
    doc.setTextColor(C.ink);
    doc.text(txt(p.info.architecte || 'Atelier 618'), W - M, M + u(6), { align: 'right' });
    doc.setDrawColor(C.ink);
    doc.setLineWidth(u(0.5));
    doc.line(M, M + u(15), W - M, M + u(15));

    // — Fonds : échelle, lignes de blocs, week-ends —
    doc.setFillColor('#f6f1e8');
    doc.rect(M, sTop, W - 2 * M, SCALE_H, 'F');
    slice.forEach((r, i) => {
      if (!r.bloc) return;
      doc.setFillColor(C.blocBg);
      doc.rect(M, rowsTop + i * rowH, W - 2 * M, rowH, 'F');
    });
    if (dayW >= u(2))
      for (let d = start; d < end; d++) {
        const wd = weekday(fromDayNum(d));
        if (wd === 0 || wd === 6) {
          doc.setFillColor(C.weekend);
          slice.forEach((r, i) => !r.bloc && doc.rect(X(d), rowsTop + i * rowH, dayW, rowH, 'F'));
        }
      }
    slice.forEach((_, i) => {
      doc.setDrawColor(C.lineSoft);
      doc.setLineWidth(u(0.15));
      doc.line(M, rowsTop + (i + 1) * rowH, W - M, rowsTop + (i + 1) * rowH);
    });

    // — Mois —
    fs(7.5);
    for (let d = start; d < end; d++) {
      const [y, m, dd] = fromDayNum(d).split('-').map(Number);
      if (dd !== 1 && d !== start) continue;
      const next = dayNum(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`);
      const w = (Math.min(next, end) - d) * dayW;
      doc.setDrawColor(C.line);
      doc.setLineWidth(u(0.2));
      doc.line(X(d), sTop, X(d), rowsBottom);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(C.ink);
      const full = txt(`${MOIS[m - 1]} ${y}`);
      const short = txt(`${MOIS_C[m - 1]} ${String(y).slice(2)}`);
      const label = doc.getTextWidth(full) + u(2) < w ? full : doc.getTextWidth(short) + u(1.5) < w ? short : '';
      if (label) doc.text(label, X(d) + u(1), sTop + u(3.8));
    }
    // — Semaines (lundis) —
    if (dayW * 7 >= u(4.5)) {
      doc.setFont('helvetica', 'normal');
      fs(6);
      doc.setTextColor(C.muted);
      for (let d = start; d < end; d++) {
        const iso = fromDayNum(d);
        if (weekday(iso) !== 1) continue;
        doc.setDrawColor(C.lineSoft);
        doc.setLineWidth(u(0.15));
        doc.line(X(d), sTop + u(5.5), X(d), sTop + SCALE_H);
        doc.text(iso.slice(8), X(d) + u(0.6), sTop + u(8.8));
      }
    }
    doc.setDrawColor(C.line);
    doc.setLineWidth(u(0.3));
    doc.line(M, sTop + SCALE_H, W - M, sTop + SCALE_H);
    doc.line(x0, sTop, x0, rowsBottom);
    doc.setFont('helvetica', 'bold');
    fs(6.5);
    doc.setTextColor(C.muted);
    doc.text('BLOCS / SOUS-BLOCS', M + u(1), sTop + u(8.5));

    // — Ligne « Aujourd'hui » (sous les barres et les étiquettes) —
    const tx = X(dayNum(auj)) + dayW / 2;
    const showToday = tx > x0 && tx < W - M;
    if (showToday) {
      doc.setDrawColor(C.late);
      doc.setLineWidth(u(0.5));
      doc.line(tx, sTop + SCALE_H, tx, rowsBottom);
    }

    // — Lignes : libellés, pastilles d'observations, barres —
    slice.forEach((r, i) => {
      const y = rowsTop + i * rowH;
      const indent = u(r.bloc ? 1 : 4);
      fs(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(C.muted);
      doc.text(r.code, M + indent, midY(y));
      const codeW = doc.getTextWidth(r.code) + u(1.5);
      doc.setFont('helvetica', r.bloc ? 'bold' : 'normal');
      doc.setTextColor(C.ink);
      const badge = r.obs > 0 ? String(r.obs) : '';
      const maxW = LABEL_W - indent - codeW - u(badge ? 8 : 2);
      let nom = txt(r.nom);
      if (doc.getTextWidth(nom) > maxW) {
        while (nom.length > 1 && doc.getTextWidth(nom + '...') > maxW) nom = nom.slice(0, -1);
        nom = nom.trimEnd() + '...';
      }
      doc.text(nom, M + indent + codeW, midY(y));
      if (badge) {
        // pastille rouge = observations non résolues sur la ligne
        const bh = u(3.7);
        doc.setFillColor(C.late);
        doc.roundedRect(x0 - u(7), y + (rowH - bh) / 2, u(5.5), bh, u(1.8), u(1.8), 'F');
        doc.setTextColor('#ffffff');
        doc.setFont('helvetica', 'bold');
        fs(6.5);
        doc.text(badge, x0 - u(4.25), y + rowH / 2 + u(0.8), { align: 'center' });
      }
      drawBars(doc, r, y, rowH, X, k);
    });

    // — Étiquette « Aujourd'hui » —
    if (showToday) {
      const lbl = txt(`AUJOURD'HUI ${fmt(auj).slice(0, 5)}`);
      doc.setFont('helvetica', 'bold');
      fs(6);
      const lw = doc.getTextWidth(lbl) + u(2.4);
      const lx = Math.min(tx, W - M - lw);
      doc.setFillColor(C.late);
      doc.rect(lx, sTop + SCALE_H - u(3.6), lw, u(3.4), 'F');
      doc.setTextColor('#ffffff');
      doc.text(lbl, lx + u(1.2), sTop + SCALE_H - u(1.2));
    }

    // — Pied de page : légende + pagination —
    drawLegend(doc, M, H - M - u(2), k);
    doc.setFont('helvetica', 'normal');
    fs(7);
    doc.setTextColor(C.muted);
    doc.text(txt(`Format ${plan.format.nom} paysage · page ${page + 1}/${pages}`), W - M, H - M - u(2), { align: 'right' });
  }

  const blob = doc.output('blob');
  const safe = (p.info.nom || 'Projet').replace(/[\\/:*?"<>|]/g, '-');
  return { blob, name: `Planning - ${safe} - ${auj}.pdf`, plan: { ...plan, pages } };
}

function drawBars(doc: JsPDF, r: Row, y: number, rowH: number, X: (d: number) => number, k: number) {
  const u = (n: number) => n * k;
  const h = Math.min(u(2.6), rowH * 0.3);
  const gap = (rowH - 2 * h) / 3;
  const yPlan = y + gap;
  const yReal = y + 2 * gap + h;
  const dash = () => doc.setLineDashPattern([u(0.8), u(0.6)], 0);
  for (const s of r.bars.segments) {
    const x = X(s.start);
    const w = Math.max(u(0.4), X(s.end) - x);
    doc.setLineDashPattern([], 0);
    switch (s.kind) {
      case 'plan':
        doc.setFillColor(r.bloc ? C.sand2 : C.plan);
        doc.setDrawColor(C.sand2);
        doc.setLineWidth(u(0.15));
        doc.rect(x, yPlan, w, h, 'FD');
        break;
      case 'real':
      case 'early':
      case 'over':
        doc.setFillColor(s.kind === 'real' ? C.ink : s.kind === 'early' ? C.early : C.late);
        doc.rect(x, yReal, w, h, 'F');
        break;
      case 'proj':
      case 'projLate':
        doc.setDrawColor(s.kind === 'proj' ? C.ink : C.late);
        doc.setLineWidth(u(0.25));
        dash();
        doc.rect(x, yReal, w, h, 'S');
        break;
    }
  }
  doc.setLineDashPattern([], 0);
  const e = r.bars.ecart;
  if (e !== undefined) {
    const label = txt(`${e > 0 ? 'Retard ' : e < 0 ? 'Avance ' : ''}${formatEcart(e)}${r.bars.ecartDefinitif ? '' : ' (est.)'}`);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6 * k);
    doc.setTextColor(e > 0 ? C.late : e < 0 ? C.early : C.muted);
    doc.text(label, X(r.bars.rightMost) + u(1.2), y + rowH / 2 + u(0.9));
  }
}

function drawLegend(doc: JsPDF, x: number, y: number, k: number) {
  const u = (n: number) => n * k;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7 * k);
  const bar = (lx: number, color: string) => {
    doc.setFillColor(color);
    doc.rect(lx, y - u(2), u(6), u(1.9), 'F');
  };
  const items: [string, (lx: number) => void][] = [
    ['Prévu', (lx) => { doc.setFillColor(C.plan); doc.setDrawColor(C.sand2); doc.setLineWidth(u(0.15)); doc.rect(lx, y - u(2), u(6), u(1.9), 'FD'); }],
    ['Réel', (lx) => bar(lx, C.ink)],
    ['Dépassement', (lx) => bar(lx, C.late)],
    ['Terminé en avance', (lx) => bar(lx, C.early)],
    ['Projection', (lx) => { doc.setDrawColor(C.ink); doc.setLineWidth(u(0.25)); doc.setLineDashPattern([u(0.8), u(0.6)], 0); doc.rect(lx, y - u(2), u(6), u(1.9), 'S'); doc.setLineDashPattern([], 0); }],
    ["Aujourd'hui", (lx) => { doc.setDrawColor(C.late); doc.setLineWidth(u(0.5)); doc.line(lx + u(3), y - u(3), lx + u(3), y + u(0.5)); }],
    ['Observations non résolues', (lx) => { doc.setFillColor(C.late); doc.roundedRect(lx, y - u(2.6), u(5.5), u(3.2), u(1.5), u(1.5), 'F'); }],
  ];
  let cx = x;
  for (const [label, draw] of items) {
    draw(cx);
    doc.setTextColor(C.ink);
    doc.text(txt(label), cx + u(7.5), y);
    cx += u(7.5) + doc.getTextWidth(txt(label)) + u(5);
  }
}
