export function uid(prefix = ''): string {
  const rand = crypto.getRandomValues(new Uint32Array(2));
  return prefix + Date.now().toString(36) + rand[0].toString(36) + rand[1].toString(36).slice(0, 4);
}

/** 12 → « P-012 » */
export function pastilleLabel(n: number): string {
  return 'P-' + String(n).padStart(3, '0');
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
