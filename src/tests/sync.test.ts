import { describe, it, expect, vi } from 'vitest';
import { prepareForFirestore } from '../store';
import { Project } from '../store';

// Mock Firebase initialization to prevent side-effects in unit tests
vi.mock('../services/firebase', () => ({
  db: {},
  handleFirestoreError: vi.fn(),
  OperationType: { READ: 'READ', WRITE: 'WRITE' }
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn()
}));

describe('prepareForFirestore Sync Serialization & Progressive Pruning', () => {
  const mockBaseProject: Project = {
    id: 'test-project-id',
    name: 'Test Project',
    createdAt: 123456789,
    stage: 'discovery',
    logoUrl: null,
    logoMimeType: 'image/svg+xml',
    svgSource: null,
    description: 'A test project description',
    brandGuide: null,
    sonicAssets: [],
    sonicPhilosophy: null,
    refinementFiles: [],
    refinementSuggestions: null,
    competitorAnalysis: null,
    ecosystemAssets: [],
    sceneGraph: [
      {
        id: 'node-1',
        type: 'rect',
        transform: { x: 10, y: 20, scaleX: 1, scaleY: 1, rotate: 0 },
        props: { width: 100, height: 100 }
      }
    ],
    sceneHistory: [
      {
        nodes: [
          {
            id: 'node-1',
            type: 'rect',
            transform: { x: 10, y: 20, scaleX: 1, scaleY: 1, rotate: 0 },
            props: { width: 100, height: 100 }
          }
        ]
      }
    ],
    sceneHistoryIndex: 0,
    comments: [],
    mockups: [],
    logoHistory: [],
    snapshots: []
  };

  it('correctly serializes sceneGraph and sceneHistory into JSON strings', () => {
    const result = prepareForFirestore(mockBaseProject);
    
    expect(typeof result.sceneGraph).toBe('string');
    expect(typeof result.sceneHistory).toBe('string');
    
    const parsedGraph = JSON.parse(result.sceneGraph);
    expect(parsedGraph).toHaveLength(1);
    expect(parsedGraph[0].id).toBe('node-1');
  });

  it('maintains non-undefined base properties', () => {
    const result = prepareForFirestore(mockBaseProject);
    
    expect(result.id).toBe('test-project-id');
    expect(result.name).toBe('Test Project');
    expect(result.stage).toBe('discovery');
  });

  it('progressively prunes heavy history steps when payload exceeds MAX_FIRESTORE_SIZE', () => {
    // Construct a project with a very large history to force pruning trigger
    const heavyHistory = Array.from({ length: 50 }, (_, i) => ({
      nodes: Array.from({ length: 100 }, (_, j) => ({
        id: `node-${i}-${j}`,
        type: 'text' as const,
        transform: { x: i * 5, y: j * 5, scaleX: 1, scaleY: 1, rotate: 0 },
        props: { textContent: 'A'.repeat(500) } // Large strings to blow up size
      }))
    }));

    const heavyProject: Project = {
      ...mockBaseProject,
      sceneHistory: heavyHistory,
      sceneHistoryIndex: 49
    };

    const result = prepareForFirestore(heavyProject);
    const parsedHistory = JSON.parse(result.sceneHistory);

    // Verify pruning reduced history entries to prevent Firestore document size limit error
    expect(parsedHistory.length).toBeLessThan(heavyHistory.length);
  });
});
