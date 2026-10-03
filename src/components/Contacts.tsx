import type { Contact, Project } from '../types';
import { uid } from '../lib/ids';
import { CONTACT_CATEGORIE } from '../lib/labels';
import { IconPlus, IconTrash } from './Icons';

export function nouveauContact(init: Partial<Contact> = {}): Contact {
  return { id: uid('c'), categorie: 'entreprise', societe: '', nom: '', ...init };
}

/** Contacts proposés à partir des informations du projet (architecte, maître d'ouvrage, entreprises). */
export function contactsSuggeres(p: Project, existants: Contact[]): Contact[] {
  const deja = new Set(existants.map((c) => c.societe.trim().toLowerCase()));
  const out: Contact[] = [];
  const add = (c: Partial<Contact>) => {
    const k = (c.societe || '').trim().toLowerCase();
    if (k && !deja.has(k)) {
      deja.add(k);
      out.push(nouveauContact(c));
    }
  };
  if (p.info.architecte) add({ categorie: 'agence', societe: p.info.architecte });
  if (p.info.maitreOuvrage) add({ categorie: 'client', societe: p.info.maitreOuvrage });
  else if (p.info.client) add({ categorie: 'client', societe: p.info.client });
  for (const e of p.info.entreprises) if (e.nom) add({ categorie: 'entreprise', societe: e.nom, nom: e.contact && !/[0-9@]/.test(e.contact) ? e.contact : '' });
  return out;
}

/** Ligne d'édition d'un contact. */
export function ContactFields({ c, onChange, onRemove }: { c: Contact; onChange: (c: Contact) => void; onRemove?: () => void }) {
  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => onChange({ ...c, [k]: v });
  return (
    <div className="contact-row">
      <label className="f">
        Catégorie
        <select value={c.categorie} onChange={(e) => set('categorie', e.target.value as Contact['categorie'])}>
          {CONTACT_CATEGORIE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="f">
        {c.categorie === 'agence' ? 'Agence' : c.categorie === 'entreprise' ? 'Entreprise' : c.categorie === 'client' ? 'Client' : 'Société'}
        <input type="text" value={c.societe} onChange={(e) => set('societe', e.target.value)} />
      </label>
      <label className="f">
        {c.categorie === 'entreprise' ? 'Personne qui suit le chantier' : 'Nom de la personne'}
        <input type="text" value={c.nom} onChange={(e) => set('nom', e.target.value)} />
      </label>
      <label className="f">
        E-mail
        <input type="email" inputMode="email" value={c.email || ''} onChange={(e) => set('email', e.target.value || undefined)} />
      </label>
      <label className="f">
        Téléphone
        <input type="tel" inputMode="tel" value={c.tel || ''} onChange={(e) => set('tel', e.target.value || undefined)} />
      </label>
      {onRemove && (
        <button className="btn danger sm icon" aria-label="Retirer" onClick={onRemove} style={{ alignSelf: 'flex-end', marginBottom: 4 }}>
          <IconTrash />
        </button>
      )}
    </div>
  );
}

/** Édition de l'annuaire des contacts du projet. */
export function ContactsEditor({ p, contacts, onChange }: { p: Project; contacts: Contact[]; onChange: (list: Contact[]) => void }) {
  const sugg = contactsSuggeres(p, contacts);
  return (
    <div className="stack">
      {contacts.length === 0 && <p className="muted small">Aucune personne. Ajoutez l’agence, le client, les entreprises (avec la personne qui suit le chantier) et les autres prestataires.</p>}
      {contacts.map((c, i) => (
        <ContactFields key={c.id} c={c} onChange={(n) => onChange(contacts.map((x, j) => (j === i ? n : x)))} onRemove={() => onChange(contacts.filter((_, j) => j !== i))} />
      ))}
      <div className="row wrap">
        <button className="btn ghost sm" onClick={() => onChange([...contacts, nouveauContact()])}><IconPlus /> Ajouter une personne</button>
        {sugg.length > 0 && (
          <button className="btn ghost sm" onClick={() => onChange([...contacts, ...sugg])}>
            <IconPlus /> Reprendre les intervenants du projet ({sugg.length})
          </button>
        )}
      </div>
    </div>
  );
}
