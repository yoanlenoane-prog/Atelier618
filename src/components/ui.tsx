import { useEffect, useState, type ReactNode } from 'react';
import { IconClose } from './Icons';

export function Modal({ title, onClose, children, footer, size }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'lg' }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal ' + (size || '')} role="dialog" aria-modal>
        <header>
          <h2>{title}</h2>
          <button className="btn ghost sm icon" onClick={onClose} aria-label="Fermer">
            <IconClose />
          </button>
        </header>
        <div className="body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}

let pushToast: ((msg: string) => void) | null = null;
export function toast(msg: string) {
  pushToast?.(msg);
}
export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: number;
    pushToast = (m) => {
      setMsg(m);
      window.clearTimeout(t);
      t = window.setTimeout(() => setMsg(null), 3200);
    };
    return () => {
      pushToast = null;
    };
  }, []);
  return msg ? <div className="toast">{msg}</div> : null;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="serif">{title}</span>
      {children}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress" aria-label={`${value} %`}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map(([v, l]) => (
        <button key={v} type="button" className={v === value ? 'on' : ''} onClick={() => onChange(v)} role="radio" aria-checked={v === value}>
          {l}
        </button>
      ))}
    </div>
  );
}

/** Renvoie la date du jour et se met à jour automatiquement à minuit. */
export function useToday(): string {
  const compute = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [t, setT] = useState(compute);
  useEffect(() => {
    const iv = window.setInterval(() => setT(compute()), 60_000);
    const vis = () => setT(compute());
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.clearInterval(iv);
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);
  return t;
}

export function confirmAction(msg: string): boolean {
  return window.confirm(msg);
}
