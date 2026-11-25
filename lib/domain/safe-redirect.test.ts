import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-redirect';

describe('safeNextPath', () => {
  it('acepta rutas internas', () => {
    expect(safeNextPath('/es')).toBe('/es');
    expect(safeNextPath('/en/explore?q=1')).toBe('/en/explore?q=1');
  });

  it('usa "/" si falta', () => {
    expect(safeNextPath(null)).toBe('/');
    expect(safeNextPath('')).toBe('/');
  });

  it('rechaza redirecciones abiertas', () => {
    expect(safeNextPath('https://evil.com')).toBe('/');
    expect(safeNextPath('//evil.com')).toBe('/');
    expect(safeNextPath('/\\evil.com')).toBe('/');
    expect(safeNextPath('evil.com')).toBe('/');
    expect(safeNextPath('/%2F%2Fevil.com')).toBe('/%2F%2Fevil.com');
  });
});
