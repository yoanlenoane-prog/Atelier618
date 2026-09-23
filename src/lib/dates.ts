import type { ISODate } from '../types';

const DAY = 86_400_000;

/** Date du jour au format AAAA-MM-JJ (fuseau local). Recalculée à chaque appel. */
export function today(): ISODate {
  return toISO(new Date());
}

export function toISO(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${j}`;
}

/** Nombre de jours depuis l'époque (calcul en UTC pour éviter les soucis d'heure d'été). */
export function dayNum(iso: ISODate): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
}

export function fromDayNum(n: number): ISODate {
  const d = new Date(n * DAY);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function addDays(iso: ISODate, n: number): ISODate {
  return fromDayNum(dayNum(iso) + n);
}

/** b − a, en jours. */
export function diffDays(a: ISODate, b: ISODate): number {
  return dayNum(b) - dayNum(a);
}

export function fmt(iso?: ISODate): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function fmtShort(iso?: ISODate): string {
  if (!iso) return '—';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function fmtLong(iso?: ISODate): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MOIS[m - 1]} ${y}`;
}

export function monthLabel(iso: ISODate, short = false): string {
  const [y, m] = iso.split('-').map(Number);
  return `${(short ? MOIS_COURT : MOIS)[m - 1]} ${y}`;
}

export function weekday(iso: ISODate): number {
  return new Date(dayNum(iso) * DAY).getUTCDay();
}

export function isISODate(s: unknown): s is ISODate {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
