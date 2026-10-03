import { useState } from 'react';
import type { CompteRendu, Contact, Intemperie, Project } from '../types';
import { useStore } from '../store';
import { uid } from '../lib/ids';
import { fmtLong } from '../lib/dates';
import { CONTACT_CATEGORIE, contactLabel } from '../lib/labels';
import { ContactFields, contactsSuggeres, nouveauContact } from './Contacts';
import { toast } from './ui';
import { IconPlus, IconTrash } from './Icons';

type Setter = <K extends keyof CompteRendu>(k: K, v: CompteRendu[K]) => void;

/** Contacts groupés par catégorie, dans l'ordre agence → client → entreprises → autres. */
function parCategorie(contacts: Contact[]): [string, Contact[]][] {
  return CONTACT_CATEGORIE.map(([k, l]) => [l, contacts.filter((c) => c.categorie === k)] as [string, Contact[]]).filter(([, l]) => l.length);
}

/** Liste de contacts à cocher (présents, convoqués…). */
function ContactChecklist({ contacts, selected, onToggle }: { contacts: Contact[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="stack" style={{ gap: 10 }}>
      {parCategorie(contacts).map(([cat, list]) => (
        <div key={cat}>
          <div className="eyebrow" style={{ marginBottom: 2 }}>{cat}</div>
          <div className="list">
            {list.map((c) => (
              <label key={c.id} className="item check" style={{ cursor: 'pointer', padding: '8px 4px' }}>
                <input type="checkbox" checked={selected.includes(c.id)} onChange={() => onToggle(c.id)} />
                <span className="grow">
                  {contactLabel(c)}
                  <span className="tiny muted" style={{ display: 'block' }}>{[c.tel, c.email].filter(Boolean).join(' · ') || ' '}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const toggle = (list: string[] | undefined, id: string) => {
  const l = list || [];
  return l.includes(id) ? l.filter((x) => x !== id) : [...l, id];
};

/** Personnes présentes : annuaire du projet + ajout rapide (enregistré dans l'annuaire). */
export function PresentsCard({ p, cr, set, change }: { p: Project; cr: CompteRendu; set: Setter; change: (c: CompteRendu) => void }) {
  const store = useStore();
  const contacts = p.info.contacts || [];
  const [ajout, setAjout] = useState<Contact | null>(null);
  const sugg = contactsSuggeres(p, contacts);

  const ajouterContacts = async (nouveaux: Contact[], present: boolean) => {
    await store.update(p.id, (d) => { d.info.contacts = [...(d.info.contacts || []), ...nouveaux]; });
    if (present) change({ ...cr, presents: [...(cr.presents || []), ...nouveaux.map((c) => c.id)] });
  };

  return (
    <div className="card">
      <div className="row between wrap">
        <h2>Personnes présentes</h2>
        <div className="row wrap">
          {contacts.length > 0 && (
            <>
              <button className="btn ghost sm" onClick={() => set('presents', contacts.map((c) => c.id))}>Tous</button>
              <button className="btn ghost sm" onClick={() => set('presents', [])}>Aucun</button>
            </>
          )}
        </div>
      </div>
      {contacts.length === 0 && (
        <p className="small muted">
          Aucune personne dans l’annuaire du projet. Ajoutez-les ici (elles seront gardées pour les prochains comptes rendus) ou dans Informations.
        </p>
      )}
      <ContactChecklist contacts={contacts} selected={cr.presents || []} onToggle={(id) => set('presents', toggle(cr.presents, id))} />

      {ajout ? (
        <div className="stack" style={{ marginTop: 12, padding: 12, background: 'var(--paper)', border: '1px solid var(--line)' }}>
          <div className="eyebrow">Nouvelle personne</div>
          <ContactFields c={ajout} onChange={setAjout} />
          <div className="row wrap">
            <button className="btn ghost sm" onClick={() => setAjout(null)}>Annuler</button>
            <button
              className="btn sm"
              disabled={!ajout.nom.trim() && !ajout.societe.trim()}
              onClick={async () => {
                await ajouterContacts([ajout], true);
                setAjout(null);
                toast(`${contactLabel(ajout)} ajouté(e) et marqué(e) présent(e)`);
              }}
            >
              Ajouter et cocher présent
            </button>
          </div>
        </div>
      ) : (
        <div className="row wrap" style={{ marginTop: 12 }}>
          <button className="btn ghost sm" onClick={() => setAjout(nouveauContact())}><IconPlus /> Ajouter une personne</button>
          {sugg.length > 0 && (
            <button className="btn ghost sm" onClick={() => ajouterContacts(sugg, false)}>
              <IconPlus /> Reprendre les intervenants du projet ({sugg.length})
            </button>
          )}
        </div>
      )}

      <label className="f full" style={{ marginTop: 14 }}>
        Autres participants (texte libre, un par ligne)
        <textarea style={{ minHeight: 60 }} value={cr.participants} onChange={(e) => set('participants', e.target.value)} />
      </label>
    </div>
  );
}

/** Prochain rendez-vous (date, heure, sujet) et convocation des personnes choisies. */
export function RendezVousCard({ p, cr, set }: { p: Project; cr: CompteRendu; set: Setter }) {
  const contacts = p.info.contacts || [];
  const reunion = cr.type === 'reunion';
  const convoques = contacts.filter((c) => cr.convoques?.includes(c.id));
  const emails = convoques.map((c) => c.email?.trim()).filter((e): e is string => !!e);
  const sansEmail = convoques.filter((c) => !c.email?.trim());

  const mailto = () => {
    const quand = cr.prochaineVisite ? `${fmtLong(cr.prochaineVisite)}${cr.prochaineHeure ? ` à ${cr.prochaineHeure}` : ''}` : 'date à confirmer';
    const sujet = `Convocation — ${p.info.nom} — ${quand}`;
    const corps = [
      'Bonjour,',
      '',
      `Vous êtes convoqué(e) ${reunion ? 'à la prochaine réunion' : 'au prochain rendez-vous'} de chantier :`,
      `• Chantier : ${p.info.nom}${p.info.adresse ? ` — ${p.info.adresse}` : ''}`,
      `• Date : ${quand}`,
      cr.prochaineSujet ? `• Objet : ${cr.prochaineSujet}` : '',
      '',
      cr.convocationMessage?.trim() || '',
      '',
      'Cordialement,',
      p.info.architecte || 'atelier618',
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
    window.location.href = `mailto:${emails.map(encodeURIComponent).join(',')}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
  };

  return (
    <div className="card">
      <h2>{reunion ? 'Prochaine réunion' : 'Prochain rendez-vous'}</h2>
      <div className="form-grid">
        <label className="f">
          Date
          <input type="date" value={cr.prochaineVisite || ''} onChange={(e) => set('prochaineVisite', e.target.value || undefined)} />
        </label>
        <label className="f">
          Heure
          <input type="time" value={cr.prochaineHeure || ''} onChange={(e) => set('prochaineHeure', e.target.value || undefined)} />
        </label>
        <label className="f full">
          Sujet / ordre du jour
          <input type="text" value={cr.prochaineSujet || ''} placeholder="ex. Choix des revêtements de sol, point planning" onChange={(e) => set('prochaineSujet', e.target.value || undefined)} />
        </label>
      </div>

      <div className="eyebrow" style={{ margin: '18px 0 6px' }}>Convoquer au prochain rendez-vous</div>
      {contacts.length === 0 ? (
        <p className="small muted">Ajoutez d’abord des personnes (carte « Personnes présentes » ou Informations).</p>
      ) : (
        <>
          <div className="row wrap" style={{ marginBottom: 6 }}>
            <button className="btn ghost sm" onClick={() => set('convoques', Array.from(new Set([...(cr.convoques || []), ...(cr.presents || [])])))}>+ Les présents</button>
            <button className="btn ghost sm" onClick={() => set('convoques', contacts.map((c) => c.id))}>Tous</button>
            <button className="btn ghost sm" onClick={() => set('convoques', [])}>Aucun</button>
          </div>
          <ContactChecklist contacts={contacts} selected={cr.convoques || []} onToggle={(id) => set('convoques', toggle(cr.convoques, id))} />
        </>
      )}
      <label className="f full" style={{ marginTop: 12 }}>
        Message aux personnes convoquées
        <textarea style={{ minHeight: 70 }} value={cr.convocationMessage || ''} placeholder="ex. Merci d’apporter les échantillons de carrelage." onChange={(e) => set('convocationMessage', e.target.value || undefined)} />
      </label>
      {convoques.length > 0 && (
        <div className="row wrap" style={{ marginTop: 10 }}>
          <button className="btn sm" disabled={!emails.length} onClick={mailto}>Préparer l’e-mail de convocation ({emails.length})</button>
          {sansEmail.length > 0 && <span className="tiny muted">Sans e-mail : {sansEmail.map(contactLabel).join(', ')}</span>}
        </div>
      )}
      <p className="tiny muted" style={{ marginTop: 8 }}>La convocation figure aussi en fin de compte rendu.</p>
    </div>
  );
}

/** Intempéries : liste + case pour les inclure ou non dans le compte rendu. */
export function IntemperiesCard({ cr, set }: { cr: CompteRendu; set: Setter }) {
  const list = cr.intemperies || [];
  const upd = (l: Intemperie[]) => set('intemperies', l.length ? l : undefined);
  const total = list.reduce((n, i) => n + (i.jours || 0), 0);
  return (
    <div className="card">
      <div className="row between wrap">
        <h2>Intempéries</h2>
        <label className="check">
          <input type="checkbox" checked={cr.inclureIntemperies !== false} onChange={(e) => set('inclureIntemperies', e.target.checked)} />
          Inclure dans le compte rendu
        </label>
      </div>
      {list.length === 0 && <p className="small muted">Aucune intempérie signalée.</p>}
      <div className="stack" style={{ gap: 8 }}>
        {list.map((it, i) => (
          <div key={it.id} className="row wrap" style={{ alignItems: 'flex-end' }}>
            <label className="f" style={{ width: 160 }}>
              Date
              <input type="date" value={it.date} onChange={(e) => upd(list.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} />
            </label>
            <label className="f grow" style={{ minWidth: 180 }}>
              Nature
              <input type="text" value={it.nature} placeholder="ex. Pluie, gel, vent fort" onChange={(e) => upd(list.map((x, j) => (j === i ? { ...x, nature: e.target.value } : x)))} />
            </label>
            <label className="f" style={{ width: 120 }}>
              Jours d’arrêt
              <input type="number" min={0} step={0.5} value={it.jours ?? ''} onChange={(e) => upd(list.map((x, j) => (j === i ? { ...x, jours: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) } : x)))} />
            </label>
            <button className="btn danger sm icon" aria-label="Retirer" onClick={() => upd(list.filter((_, j) => j !== i))}><IconTrash /></button>
          </div>
        ))}
      </div>
      <div className="row between wrap" style={{ marginTop: 10 }}>
        <button className="btn ghost sm" onClick={() => upd([...list, { id: uid('i'), date: cr.date, nature: '' }])}><IconPlus /> Ajouter une intempérie</button>
        {total > 0 && <span className="small muted">Total : {total} jour{total > 1 ? 's' : ''} d’arrêt</span>}
      </div>
    </div>
  );
}

