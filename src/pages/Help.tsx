import type { ReactNode } from 'react';
import notice from '../../docs/NOTICE.md?raw';

/** Rendu minimal du Markdown de la notice (titres, listes, citations, gras, code). */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    out.push(t.startsWith('**') ? <strong key={m.index}>{t.slice(2, -2)}</strong> : <code key={m.index}>{t.slice(1, -1)}</code>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderMarkdown(md: string): ReactNode[] {
  const lines = md.split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith('# ')) { i++; continue; } // le titre principal est déjà affiché
    if (l.startsWith('## ')) { out.push(<h2 key={i}>{inline(l.slice(3))}</h2>); i++; continue; }
    if (l.startsWith('### ')) { out.push(<h3 key={i}>{inline(l.slice(4))}</h3>); i++; continue; }
    if (l.startsWith('> ')) { out.push(<p key={i} className="tip">{inline(l.slice(2))}</p>); i++; continue; }
    if (/^(- |\d+\. )/.test(l)) {
      const ordered = /^\d+\. /.test(l);
      const items: ReactNode[] = [];
      const start = i;
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) {
        items.push(<li key={i}>{inline(lines[i].replace(/^(- |\d+\. )/, ''))}</li>);
        i++;
      }
      out.push(ordered ? <ol key={start}>{items}</ol> : <ul key={start}>{items}</ul>);
      continue;
    }
    const start = i;
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#|> |- |\d+\. )/.test(lines[i])) para.push(lines[i++]);
    out.push(<p key={start}>{inline(para.join(' '))}</p>);
  }
  return out;
}

export function Help() {
  return (
    <div className="doc">
      <div className="eyebrow">Atelier 618</div>
      <h1 className="serif" style={{ fontSize: 44, lineHeight: 1 }}>Notice d’utilisation</h1>
      {renderMarkdown(notice)}
    </div>
  );
}
