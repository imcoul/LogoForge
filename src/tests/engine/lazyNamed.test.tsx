/**
 * Tests for the code-splitting helpers (Phase 4).
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { lazyNamed, ChunkFallback, ChunkBoundary } from '../../lazyNamed';

const Hello: React.FC<{ name?: string }> = ({ name = 'world' }) => <div>hello {name}</div>;

describe('lazyNamed', () => {
  it('resolves a named export', async () => {
    const Lazy = lazyNamed(async () => ({ Hello }), 'Hello');

    render(
      <ChunkBoundary>
        <Lazy />
      </ChunkBoundary>,
    );

    await waitFor(() => expect(screen.getByText('hello world')).toBeTruthy());
  });

  it('falls back to the default export when the named one is absent', async () => {
    const Lazy = lazyNamed(async () => ({ default: Hello }), 'Missing');

    render(
      <ChunkBoundary>
        <Lazy />
      </ChunkBoundary>,
    );

    await waitFor(() => expect(screen.getByText('hello world')).toBeTruthy());
  });

  it('forwards props to the loaded component', async () => {
    const Lazy = lazyNamed<typeof Hello>(async () => ({ Hello }), 'Hello');

    render(
      <ChunkBoundary>
        <Lazy name="forgel" />
      </ChunkBoundary>,
    );

    await waitFor(() => expect(screen.getByText('hello forgel')).toBeTruthy());
  });

  it('shows the fallback until the chunk resolves', async () => {
    let release!: (m: Record<string, unknown>) => void;
    const pending = new Promise<Record<string, unknown>>((resolve) => {
      release = resolve;
    });
    const Lazy = lazyNamed(() => pending, 'Hello');

    render(
      <ChunkBoundary label="editor">
        <Lazy />
      </ChunkBoundary>,
    );

    expect(screen.getByText('Loading editor…')).toBeTruthy();

    release({ Hello });
    await waitFor(() => expect(screen.getByText('hello world')).toBeTruthy());
  });
});

describe('ChunkFallback', () => {
  it('renders a generic message with no label', () => {
    render(<ChunkFallback />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('names what is loading when given a label', () => {
    render(<ChunkFallback label="analytics" />);
    expect(screen.getByText('Loading analytics…')).toBeTruthy();
  });

  it('announces itself to assistive technology', () => {
    // A silent swap would leave screen-reader users with no indication anything is happening.
    const { container } = render(<ChunkFallback />);
    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('aria-live')).toBe('polite');
  });
});
