import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import useDocumentTitle from './usedocumenttitle';

describe('useDocumentTitle', () => {
  beforeEach(() => {
    document.title = 'Initial Title';
  });

  it('should set the document title', () => {
    renderHook(() => useDocumentTitle('New Title'));
    expect(document.title).toBe('New Title');
  });

  it('should update the document title when the prop changes', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'First Title' }
    });

    expect(document.title).toBe('First Title');

    rerender({ title: 'Second Title' });

    expect(document.title).toBe('Second Title');
  });
});
