import { useState } from 'react';
import { useStore } from '../store';
import { href, navigate } from '../router';
import { avancementProjet, isOpen, sousBlocsEnRetard } from '../lib/planning';
import { fmt } from '../lib/dates';
import { PROJECT_STATUS_LABEL } from '../lib/labels';
import { blocsFromModele, emptyInfo, newProject } from '../lib/factory';
import { createSample } from '../lib/sample';
import { Modal, Progress, toast, useToday } from '../components/ui';
import { IconPlus } from '../components/Icons';
import { SyncPill } from '../components/SyncPill';
import { InfoFields } from './ProjectInfo';
import type { ProjectInfo } from '../types';

export function Home() {
  const store = useStore();
  const auj = useToday();
  const [creating, setCreating] = useState(false);
  const nextNum = Math.max(0, ...store.projects.map((p) => p.info.numero)) + 1;

  return (
    <div>
      <div className="hero">
        <div>
          <div className="eyebrow">Suivi de chantier</div>
          <h1>
            Atelier <em>618</em>
          </h1>
        </div>
        <div className="row wrap">
          <SyncPill />
          <button className="btn" onClick={() => setCreating(true)}>
            <IconPlus /> Nouveau projet
          </button>
        </div>
      </div>

      <div className="section-title">
        <h2>Mes projets</h2>
        <span className="muted small">{store.projects.length} projet{store.projects.length > 1 ? 's' : ''}</span>
      </div>

      <div className="grid c3">
        {store.projects.map((p) => {
          const pct = avancementProjet(p, auj);
          const ouvertes = p.observations.filter(isOpen).length;
          const retards = sousBlocsEnRetard(p, auj).length;
          return (
            <a key={p.id} className="proj-card" href={href(`/p/${p.id}`)}>
              <div className="row between">
                <span className="num">N° {String(p.info.numero).padStart(2, '0')}</span>
                <span className="tag line">{PROJECT_STATUS_LABEL[p.info.statut]}</span>
              </div>
              <div>
                <div className="serif t">{p.info.nom || 'Sans nom'}</div>
                <div className="muted small">{p.info.adresse || p.info.client || ' '}</div>
              </div>
              <div className="row between" style={{ alignItems: 'flex-end' }}>
                <div>
                  <div className="eyebrow">Avancement</div>
                  <div className="pct">{pct} %</div>
                </div>
                <div className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
                  <span className={'tag ' + (ouvertes ? 'late' : '')}>
                    {ouvertes} observation{ouvertes > 1 ? 's' : ''} ouverte{ouvertes > 1 ? 's' : ''}
                  </span>
                  {retards > 0 && <span className="tag late">{retards} en retard</span>}
                </div>
              </div>
              <Progress value={pct} />
              <div className="tiny muted">Fin prévue : {fmt(p.info.dateFinPrevue)}</div>
            </a>
          );
        })}
        <button className="newcard" onClick={() => setCreating(true)}>
          <IconPlus width={22} /> Nouveau projet
        </button>
      </div>

      {store.projects.length === 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h2>Bienvenue</h2>
          <p className="muted">
            Créez votre premier projet, ou chargez un projet d’exemple pour découvrir le Gantt, les plans à pastilles et les comptes rendus.
            Pour enregistrer vos données dans Google Drive, rendez-vous dans <a href={href('/reglages')}>Réglages</a>.
          </p>
          <div className="row wrap">
            <button
              className="btn sand"
              onClick={async () => {
                const p = await createSample(nextNum);
                await store.create(p);
                toast('Projet exemple créé');
                navigate(`/p/${p.id}`);
              }}
            >
              Charger un projet exemple
            </button>
            <a className="btn ghost" href={href('/aide')}>Lire la notice</a>
          </div>
        </div>
      )}

      {creating && <NewProject numero={nextNum} onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewProject({ numero, onClose }: { numero: number; onClose: () => void }) {
  const store = useStore();
  const [info, setInfo] = useState<ProjectInfo>(emptyInfo(numero));
  const [modele, setModele] = useState(true);
  const submit = async () => {
    if (!info.nom.trim()) return toast('Indiquez le nom du projet');
    const p = newProject({ ...info, nom: info.nom.trim() }, modele ? blocsFromModele() : []);
    await store.create(p);
    onClose();
    navigate(`/p/${p.id}`);
  };
  return (
    <Modal
      title="Nouveau projet"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn" onClick={submit}>Créer le projet</button>
        </>
      }
    >
      <div className="stack">
        <InfoFields info={info} onChange={setInfo} compact />
        <label className="check">
          <input type="checkbox" checked={modele} onChange={(e) => setModele(e.target.checked)} />
          Pré-remplir la structure type (Gros œuvre / Second œuvre / Finitions)
        </label>
      </div>
    </Modal>
  );
}
