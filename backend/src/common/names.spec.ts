import { describe, expect, it } from 'vitest';
import { resolveUniqueName, sanitizeName } from './names';

describe('resolveUniqueName', () => {
  it('returns the desired name when it is free', () => {
    expect(resolveUniqueName(new Set(), 'report.pdf')).toBe('report.pdf');
    expect(resolveUniqueName(new Set(['other.pdf']), 'report.pdf')).toBe('report.pdf');
  });

  it('suffixes a taken name keeping the extension', () => {
    expect(resolveUniqueName(new Set(['report.pdf']), 'report.pdf')).toBe('report (1).pdf');
  });

  it('finds the first free suffix', () => {
    const taken = new Set(['report.pdf', 'report (1).pdf', 'report (2).pdf']);
    expect(resolveUniqueName(taken, 'report.pdf')).toBe('report (3).pdf');
  });

  it('handles names without an extension', () => {
    expect(resolveUniqueName(new Set(['notes']), 'notes')).toBe('notes (1)');
  });

  it('treats a leading dot as part of the name, not an extension', () => {
    expect(resolveUniqueName(new Set(['.env']), '.env')).toBe('.env (1)');
  });

  it('keeps only the last extension for multi-dot names', () => {
    expect(resolveUniqueName(new Set(['archive.tar.gz']), 'archive.tar.gz')).toBe(
      'archive.tar (1).gz',
    );
  });
});

describe('sanitizeName', () => {
  it('trims whitespace', () => {
    expect(sanitizeName('  report.pdf  ')).toBe('report.pdf');
  });

  it('replaces path separators', () => {
    expect(sanitizeName('a/b\\c.pdf')).toBe('a-b-c.pdf');
  });

  it('caps length at 255 characters', () => {
    expect(sanitizeName('x'.repeat(300))).toHaveLength(255);
  });
});
