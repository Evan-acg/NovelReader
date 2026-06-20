import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('构建产物 userscript metadata', () => {
  const distPath = resolve(__dirname, '../dist/novel-reader.user.js');

  it('构建产物应存在', () => {
    expect(() => readFileSync(distPath, 'utf-8')).not.toThrow();
  });

  it('前 40 行每行 @description 应独占一行', () => {
    const content = readFileSync(distPath, 'utf-8');
    const lines = content.split('\n').slice(0, 40);
    const descLines = lines.filter((l) => l.startsWith('// @description'));
    for (const line of descLines) {
      expect(line).not.toContain('@license');
      expect(line).not.toContain('@match');
      expect(line).not.toContain('@name');
    }
  });

  it('前 40 行每行 @license 应独占一行', () => {
    const content = readFileSync(distPath, 'utf-8');
    const lines = content.split('\n').slice(0, 40);
    const licenseLines = lines.filter((l) => l.startsWith('// @license'));
    for (const line of licenseLines) {
      expect(line).not.toContain('@description');
      expect(line).not.toContain('@match');
      expect(line).not.toContain('@name');
    }
  });

  it('前 40 行每行 @match 应独占一行', () => {
    const content = readFileSync(distPath, 'utf-8');
    const lines = content.split('\n').slice(0, 40);
    const matchLines = lines.filter((l) => l.startsWith('// @match'));
    for (const line of matchLines) {
      expect(line).not.toContain('@description');
      expect(line).not.toContain('@license');
      expect(line).not.toContain('@connect');
    }
  });

  it('应包含 booklink.me 裸域和子域名的 match', () => {
    const content = readFileSync(distPath, 'utf-8');
    expect(content).toContain('*://booklink.me/*');
    expect(content).toContain('*://*.booklink.me/*');
  });
});
