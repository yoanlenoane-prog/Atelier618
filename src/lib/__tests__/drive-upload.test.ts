import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../google', () => ({ currentToken: () => 'jeton', invalidateToken: () => {} }));
const { uploadFile } = await import('../drive');

afterEach(() => vi.unstubAllGlobals());

describe('envoi de fichier vers Drive', () => {
  it('envoie un multipart/related construit en mémoire (métadonnées + contenu)', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'X1', name: 'a.jpg' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const f = await uploadFile(new Blob(['CONTENU'], { type: 'image/jpeg' }), { name: 'a.jpg', parents: ['P1'] });
    expect(f.id).toBe('X1');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const ct = (init.headers as Record<string, string>)['Content-Type'];
    expect(ct).toMatch(/^multipart\/related; boundary=/);
    const body = new TextDecoder().decode(init.body as Uint8Array);
    const boundary = ct.split('boundary=')[1];
    expect(body).toContain(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{"name":"a.jpg","parents":["P1"],"mimeType":"image/jpeg"}`);
    expect(body).toContain('Content-Type: image/jpeg\r\n\r\nCONTENU\r\n');
    expect(body.endsWith(`--${boundary}--`)).toBe(true);
  });

  it('réessaie après une coupure réseau (« Load failed »)', async () => {
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      if (++n === 1) throw new TypeError('Load failed');
      return new Response(JSON.stringify({ id: 'X2' }), { status: 200 });
    }));
    vi.useFakeTimers();
    const pr = uploadFile(new Blob(['x']), { name: 'b.pdf' });
    await vi.runAllTimersAsync();
    expect((await pr).id).toBe('X2');
    expect(n).toBe(2);
    vi.useRealTimers();
  });

  it('donne un message clair si la connexion échoue durablement', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Load failed'); }));
    vi.useFakeTimers();
    const pr = uploadFile(new Blob(['x']), { name: 'c.pdf' }).catch((e) => e);
    await vi.runAllTimersAsync();
    expect(String(await pr)).toMatch(/Connexion à Google Drive interrompue \(Load failed\)/);
    vi.useRealTimers();
  });
});
