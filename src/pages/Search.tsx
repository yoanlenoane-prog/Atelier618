import { useState } from 'react';
import type { Project } from '../types';
import { href, navigate } from '../router';
import { fmt } from '../lib/dates';
import { pastilleLabel } from '../lib/ids';
import { OBS_STATUS_LABEL } from '../lib/labels';
import { codeBloc, codeSousBloc } from '../lib/planning';

interface Hit {
  kind: string;
  title: string;
  sub?: string;
  link: string;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function searchProject(p: Project, q: string): Hit[] {
  const t = norm(q.trim());
  if (!t) return [];
  const has = (...s: (string | undefined)[]) => s.some((x) => x && norm(x).includes(t));
  const dateHit = (d?: string) => !!d && (fmt(d).includes(q.trim()) || d.includes(q.trim()));
  const num = t.match(/^p-?0*(\d+)$/)?.[1];
  const hits: Hit[] = [];

  for (const o of p.observations) {
    const texts = o.contenu.map((c) => (c.type === 'texte' ? c.texte : c.legende));
    const bloc = p.blocs.find((b) => b.id === o.blocId);
    const sb = bloc?.sousBlocs.find((s) => s.id === o.sousBlocId);
    if ((num && Number(num) === o.numero) || has(o.titre, o.entreprise, o.actionDemandee, bloc?.nom, sb?.nom, ...texts, ...o.historique.map((h) => h.texte)) || dateHit(o.date))
      hits.push({ kind: 'Pastille', title: `${pastilleLabel(o.numero)} — ${o.titre || 'Sans titre'}`, sub: `${OBS_STATUS_LABEL[o.statut]} · ${fmt(o.date)}${sb ? ' · ' + sb.nom : ''}`, link: `/p/${p.id}/obs/${o.id}` });
  }
  for (const c of p.comptesRendus) {
    const obsMatch = c.observationIds.some((id) => {
      const o = p.observations.find((x) => x.id === id);
      return o && ((num && Number(num) === o.numero) || has(o.titre));
    });
    if (has(c.participants, c.notesGenerales, c.meteo, ...Object.values(c.rubriques), `cr ${c.numero}`) || dateHit(c.date) || obsMatch || t === `cr${c.numero}`)
      hits.push({ kind: 'Compte rendu', title: `CR n°${String(c.numero).padStart(3, '0')}`, sub: fmt(c.date), link: `/p/${p.id}/cr/${c.id}` });
  }
  for (const b of p.blocs) {
    if (has(b.nom)) hits.push({ kind: 'Bloc', title: `${codeBloc(p, b.id)} — ${b.nom}`, link: `/p/${p.id}/obs?bloc=${b.id}` });
    for (const s of b.sousBlocs)
      if (has(s.nom, s.entreprise) || dateHit(s.debutPrevu) || dateHit(s.finPrevue) || dateHit(s.debutReel) || dateHit(s.finReelle))
        hits.push({ kind: 'Sous-bloc', title: `${codeSousBloc(p, s.id)} — ${s.nom}`, sub: `${b.nom}${s.entreprise ? ' · ' + s.entreprise : ''}`, link: `/p/${p.id}/obs?sb=${s.id}` });
  }
  for (const pl of p.plans) if (has(pl.nom)) hits.push({ kind: 'Plan', title: pl.nom, link: `/p/${p.id}/plans/${pl.id}` });
  for (const e of p.info.entreprises) if (has(e.nom, e.lot, e.contact)) hits.push({ kind: 'Entreprise', title: e.nom, sub: [e.lot, e.contact].filter(Boolean).join(' · '), link: `/p/${p.id}/infos` });
  for (const d of p.documents) if (has(d.nom, d.categorie) || dateHit(d.date)) hits.push({ kind: 'Document', title: d.nom, sub: `${d.categorie} · ${fmt(d.date)}`, link: `/p/${p.id}/docs` });
  return hits;
}

export function Search({ p, query }: { p: Project; query: URLSearchParams }) {
  const [q, setQ] = useState(query.get('q') || '');
  const hits = searchProject(p, q);
  const kinds = Array.from(new Set(hits.map((h) => h.kind)));
  return (
    <div className="stack lg">
      <input
        type="search"
        autoFocus
        placeholder="Pastille (P-021), mot, entreprise, bloc, date (23/09/2026)…"
        value={q}
        style={{ fontSize: 18, padding: '14px 16px' }}
        onChange={(e) => {
          setQ(e.target.value);
          history.replaceState(null, '', href(`/p/${p.id}/recherche?q=${encodeURIComponent(e.target.value)}`));
        }}
        onKeyDown={(e) => e.key === 'Enter' && hits[0] && navigate(hits[0].link)}
      />
      {q.trim() && hits.length === 0 && <div className="muted">Aucun résultat pour « {q} ».</div>}
      {kinds.map((k) => (
        <div className="card" key={k} style={{ padding: '12px 16px' }}>
          <h3>{k}{hits.filter((h) => h.kind === k).length > 1 ? 's' : ''}</h3>
          <div className="list">
            {hits.filter((h) => h.kind === k).map((h, i) => (
              <a key={i} className="item" href={href(h.link)}>
                <div className="grow">
                  <div>{h.title}</div>
                  {h.sub && <div className="tiny muted">{h.sub}</div>}
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
