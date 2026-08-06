/**
 * CHARACTERIZATION TESTS — cloud sync data loss.
 *
 * `prepareForFirestore` exists because an entire project is written as a single Firestore
 * document, which is capped at ~1 MB. When a project exceeds that, the serializer applies
 * nine progressive degradation steps — the later ones DESTROY user assets, replacing binary
 * data with a placeholder string.
 *
 * These tests pin that destructive behaviour so Phase 2 (move binary assets to object
 * storage, delete the degradation ladder) can be verified as a real change. When Phase 2
 * lands, these tests SHOULD fail — assets must survive — and must then be rewritten to
 * assert preservation instead.
 *
 * See plans/2026-08-05-000000--forgel-mobile-first-design-tool-roadmap.md sections 1.5 and Phase 2.
 */
import { describe, it, expect, vi } from 'vitest';
import { prepareForFirestore, type Project } from '../../store';

vi.mock('../../services/firebase', () => ({
  db: {},
  handleFirestoreError: vi.fn(),
  OperationType: { READ: 'READ', WRITE: 'WRITE' },
}));

vi.mock('firebase/auth', () => ({ getAuth: vi.fn() }));

/** Firestore's per-document ceiling, minus the buffer the serializer reserves. */
const MAX_FIRESTORE_SIZE = 950000;

const baseProject = (): Project => ({
  id: 'p1',
  name: 'Test Project',
  createdAt: 1,
  stage: 'discovery',
  logoUrl: null,
  logoMimeType: 'image/svg+xml',
  svgSource: null,
  description: '',
  brandGuide: null,
  sonicAssets: [],
  sonicPhilosophy: null,
  refinementFiles: [],
  refinementSuggestions: null,
  competitorAnalysis: null,
  ecosystemAssets: [],
  sceneGraph: [],
  sceneHistory: [{ nodes: [] }],
  sceneHistoryIndex: 0,
  comments: [],
  mockups: [],
  logoHistory: [],
  snapshots: [],
});

/** A base64-ish blob of a given size. */
const blob = (chars: number) => 'A'.repeat(chars);

describe('prepareForFirestore — small projects are untouched', () => {
  it('preserves a mockup that fits within the document budget', () => {
    const project = baseProject();
    project.mockups = [
      { id: 'm1', name: 'card', base64Data: blob(1000), mimeType: 'image/png' },
    ];

    const out = prepareForFirestore(project);
    expect(out.mockups[0].base64Data).toBe(blob(1000));
    expect(out.mockups[0].base64Data).not.toContain('omitted for Cloud Sync');
  });

  it('serializes sceneGraph and sceneHistory as JSON strings', () => {
    const out = prepareForFirestore(baseProject());
    expect(typeof out.sceneGraph).toBe('string');
    expect(typeof out.sceneHistory).toBe('string');
  });

  it('does not mutate the project it was given', () => {
    const project = baseProject();
    project.mockups = [
      { id: 'm1', name: 'big', base64Data: blob(1_000_000), mimeType: 'image/png' },
    ];

    prepareForFirestore(project);

    // The caller's in-memory copy must keep the real asset even though the cloud copy loses it.
    expect(project.mockups[0].base64Data).toBe(blob(1_000_000));
  });
});

describe('prepareForFirestore — DATA LOSS on oversized projects', () => {
  it('DESTROYS oversized mockup binary data, replacing it with a placeholder', () => {
    const project = baseProject();
    project.mockups = [
      { id: 'm1', name: 'billboard', base64Data: blob(1_000_000), mimeType: 'image/png' },
    ];

    const out = prepareForFirestore(project);

    expect(out.mockups[0].base64Data).toContain('Large mockup asset omitted for Cloud Sync');
    expect(out.mockups[0].base64Data).toContain('1000000');
    // The pixels are gone from the cloud copy entirely.
    expect(out.mockups[0].base64Data).not.toContain(blob(100));
  });

  it('DESTROYS oversized sonic asset data', () => {
    const project = baseProject();
    project.sonicAssets = [
      { name: 'jingle', base64Data: blob(1_000_000), mimeType: 'audio/mp3' },
    ];

    const out = prepareForFirestore(project);
    expect(out.sonicAssets[0].base64Data).toContain('Large sonic asset omitted for Cloud Sync');
  });

  it('DESTROYS oversized refinement file data', () => {
    const project = baseProject();
    project.refinementFiles = [
      { name: 'brief.pdf', base64Data: blob(1_000_000), mimeType: 'application/pdf' },
    ];

    const out = prepareForFirestore(project);
    expect(out.refinementFiles[0].base64Data).toContain(
      'Large refinement asset omitted for Cloud Sync',
    );
  });

  it('preserves small assets while destroying large ones in the same project', () => {
    const project = baseProject();
    project.mockups = [
      { id: 'small', name: 'small', base64Data: blob(1000), mimeType: 'image/png' },
      { id: 'big', name: 'big', base64Data: blob(1_000_000), mimeType: 'image/png' },
    ];

    const out = prepareForFirestore(project);

    // The 25KB threshold decides survival.
    expect(out.mockups[0].base64Data).toBe(blob(1000));
    expect(out.mockups[1].base64Data).toContain('omitted for Cloud Sync');
  });

  it('replaces an oversized base64 logoUrl with a stub SVG', () => {
    const project = baseProject();
    project.logoUrl = `data:image/png;base64,${blob(1_000_000)}`;

    const out = prepareForFirestore(project);

    expect(out.logoUrl).toContain('Omitted for cloud space');
    expect(out.logoUrl).not.toContain(blob(100));
  });

  it('prunes undo history before touching assets', () => {
    const project = baseProject();
    // 40 history entries, each carrying a heavy node payload.
    project.sceneHistory = Array.from({ length: 40 }, () => ({
      nodes: [
        {
          id: 'n1',
          type: 'path' as const,
          transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 },
          props: { pathData: blob(30_000) },
        },
      ],
    }));
    project.sceneHistoryIndex = 39;

    const out = prepareForFirestore(project);
    const history = JSON.parse(out.sceneHistory);

    // History is sacrificed first, before any asset is destroyed.
    expect(history.length).toBeLessThanOrEqual(5);
  });

  it('keeps the final payload under the Firestore ceiling', () => {
    const project = baseProject();
    project.mockups = [
      { id: 'm1', name: 'a', base64Data: blob(2_000_000), mimeType: 'image/png' },
      { id: 'm2', name: 'b', base64Data: blob(2_000_000), mimeType: 'image/png' },
    ];
    project.sonicAssets = [{ name: 's', base64Data: blob(2_000_000), mimeType: 'audio/mp3' }];

    const out = prepareForFirestore(project);
    expect(JSON.stringify(out).length).toBeLessThan(MAX_FIRESTORE_SIZE);
  });

  it('documents the cross-device consequence: the cloud copy alone cannot restore assets', () => {
    // `restoreOmittedFields` repairs a project only from the SAME device's local cache.
    // A second device receives exactly this payload — the assets are unrecoverable there.
    const project = baseProject();
    project.mockups = [
      { id: 'm1', name: 'hero', base64Data: blob(1_000_000), mimeType: 'image/png' },
    ];

    const cloudCopy = prepareForFirestore(project);

    const recoverable = !cloudCopy.mockups[0].base64Data.includes('omitted for Cloud Sync');
    expect(recoverable).toBe(false);
  });
});
