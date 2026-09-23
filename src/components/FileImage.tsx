import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import type { FileRef } from '../types';
import { fileUrl } from '../lib/files';

export function useFileUrl(ref?: FileRef): { url: string | null; loading: boolean } {
  const [state, setState] = useState<{ url: string | null; loading: boolean }>({ url: null, loading: !!ref });
  const key = ref ? ref.localId || ref.driveId : '';
  useEffect(() => {
    let alive = true;
    if (!ref) {
      setState({ url: null, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    fileUrl(ref).then((url) => alive && setState({ url, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

export function FileImage({ file, alt = '', ...rest }: { file?: FileRef } & ImgHTMLAttributes<HTMLImageElement>) {
  const { url, loading } = useFileUrl(file);
  if (!url) return <div className="ph-missing">{loading ? 'Chargement…' : 'Image indisponible hors connexion'}</div>;
  return <img src={url} alt={alt} {...rest} />;
}
