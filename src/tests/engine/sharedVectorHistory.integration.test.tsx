import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SVGPathEditor } from '../../components/SVGPathEditor';
import { ToastProvider } from '../../components/Toast';
import { WhiteboardCanvas } from '../../components/WhiteboardCanvas';
import { listEditablePaths, replacePathDataById } from '../../engine/pathEditorBridge';
import { createSharedVectorHistoryController } from '../../engine/sharedVectorHistory';
import { useAppStore, type Project } from '../../store';
import type { WhiteboardSketch } from '../../types';

const makeProject = (): Project => ({
  id: 'integration-project',
  name: 'Shared history integration',
  createdAt: 1,
  stage: 'drafting',
  logoUrl: null,
  logoMimeType: 'image/svg+xml',
  svgSource: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><path id="existing" d="M0 0 L5 5" /></svg>',
  description: '',
  brandGuide: null,
  sonicAssets: [],
  sonicPhilosophy: null,
  refinementFiles: [],
  refinementSuggestions: null,
  competitorAnalysis: null,
  ecosystemAssets: [],
  sceneGraph: [],
  sceneHistory: [],
  sceneHistoryIndex: 0,
  comments: [],
  mockups: [],
  whiteboardSketches: [],
});

const commitToStore = async (updates: Partial<Project>) => {
  const projectId = useAppStore.getState().activeProjectId;
  if (!projectId) throw new Error('Test project is not active');
  useAppStore.setState((state) => ({
    projects: state.projects.map((project) =>
      project.id === projectId ? { ...project, ...updates } : project,
    ),
  }));
};

const getProject = () => {
  const state = useAppStore.getState();
  return state.projects.find((project) => project.id === state.activeProjectId)!;
};

const EditorPair: React.FC<{
  history: ReturnType<typeof createSharedVectorHistoryController>;
  showWhiteboard?: boolean;
  updateSharedPath?: (nodeId: string, candidateSvg: string, baseSvg?: string, throttleCloud?: boolean) => Promise<boolean>;
}> = ({ history, showWhiteboard = true, updateSharedPath }) => {
  const { projects, activeProjectId } = useAppStore();
  const project = projects.find((candidate) => candidate.id === activeProjectId);

  return (
    <>
      {showWhiteboard && (
        <WhiteboardCanvas
          fullscreen={false}
          setFullscreen={() => undefined}
          onUpdateAndSync={commitToStore}
          onCreateSharedPath={history.addWhiteboardPath}
          onSharedUndo={history.undo}
          onSharedRedo={history.redo}
          canUndoShared={history.canUndo()}
          canRedoShared={history.canRedo()}
        />
      )}
      <SVGPathEditor
        svgSource={project?.svgSource}
          onUpdateSvg={(svg) => commitToStore({ svgSource: svg })}
          onLinkExistingPathToWhiteboard={history.addExistingPathToWhiteboard}
          onDeleteSharedPath={history.deleteSharedWhiteboardPath}
          onUpdateSharedPath={updateSharedPath ?? history.updateSharedWhiteboardPath}
          onSharedUndo={history.undo}
        onSharedRedo={history.redo}
        canUndoShared={history.canUndo()}
        canRedoShared={history.canRedo()}
      />
    </>
  );
};

describe('shared vector history editor integration', () => {
  beforeEach(() => {
    useAppStore.setState({
      projects: [makeProject()],
      activeProjectId: 'integration-project',
      sharedVectorHistoryByProject: {},
    });
  });

  it('renders persisted Whiteboard sketches through shared Nodes and preserves legacy fallback', async () => {
    const project = makeProject();
    project.whiteboardSketches = [
      {
        id: 'render-rect',
        name: 'Rendered rectangle',
        type: 'rectangle',
        props: { x: 12, y: 34, width: 56, height: 78, rx: 4 },
        color: '#123456',
        strokeWidth: 4,
        fillColor: '#abcdef',
        fillOpacity: 0.35,
        strokeDashArray: '5 2',
      },
      {
        id: 'render-ellipse',
        name: 'Rendered ellipse',
        type: 'circle',
        props: { cx: 200, cy: 110, rx: 18, ry: 10 },
        color: '#224466',
        strokeWidth: 3,
        fillColor: 'none',
      },
      {
        id: 'render-line',
        name: 'Rendered line',
        type: 'line',
        props: { x1: 250, y1: 20, x2: 280, y2: 50 },
        color: '#884422',
        strokeWidth: 5,
      },
      {
        id: 'render-path',
        name: 'Rendered path',
        type: 'path',
        path: 'M 150,150 Q 160,170 180,180',
        color: '#118833',
        strokeWidth: 2,
        fillColor: 'none',
      },
      {
        id: 'render-mask-source',
        name: 'Mask source',
        type: 'rectangle',
        props: { x: 10, y: 180, width: 80, height: 80, rx: 0 },
        color: '#334455',
        strokeWidth: 3,
        fillColor: '#778899',
      },
      {
        id: 'render-mask-target',
        name: 'Masked ellipse',
        type: 'circle',
        props: { cx: 330, cy: 300, rx: 20, ry: 12 },
        color: '#123123',
        strokeWidth: 2,
        fillColor: '#abcdef',
        maskId: 'render-mask-source',
        maskType: 'hide',
      },
      {
        id: 'legacy-fallback',
        name: 'Legacy fallback',
        type: 'unsupported',
        path: 'M 5,6 L 7,8',
      } as unknown as WhiteboardSketch,
    ];
    useAppStore.setState({ projects: [project], activeProjectId: project.id });
    const history = createSharedVectorHistoryController(commitToStore);
    const { container } = render(
      <ToastProvider>
        <EditorPair history={history} />
      </ToastProvider>,
    );

    const whiteboardSvg = container.querySelector<SVGSVGElement>('svg.touch-none');
    expect(whiteboardSvg).not.toBeNull();
    const nodeLayer = await waitFor(() => {
      const layer = whiteboardSvg!.querySelector('[data-logoforge-node-id="whiteboard-render-rect"]');
      expect(layer).not.toBeNull();
      return layer!;
    });
    const rect = nodeLayer.querySelector('rect');
    expect(rect?.getAttribute('x')).toBe('12');
    expect(rect?.getAttribute('y')).toBe('34');
    expect(rect?.getAttribute('fill')).toBe('#abcdef');
    expect(rect?.getAttribute('stroke')).toBe('#123456');
    expect(rect?.getAttribute('stroke-width')).toBe('4');
    expect(rect?.getAttribute('fill-opacity')).toBe('0.35');
    expect(rect?.getAttribute('stroke-dasharray')).toBe('5 2');
    expect(Array.from(whiteboardSvg!.querySelectorAll('path')).some(
      (path) => path.getAttribute('d') === 'M 5,6 L 7,8',
    )).toBe(true);

    expect(whiteboardSvg!.querySelector('[data-logoforge-whiteboard-id="render-ellipse"] ellipse')).not.toBeNull();
    expect(whiteboardSvg!.querySelector('[data-logoforge-whiteboard-id="render-line"] line')).not.toBeNull();
    expect(whiteboardSvg!.querySelector('[data-logoforge-whiteboard-id="render-path"] path')?.getAttribute('d'))
      .toBe('M 150,150 Q 160,170 180,180');
    const maskedEllipse = whiteboardSvg!.querySelector('[data-logoforge-whiteboard-id="render-mask-target"] ellipse');
    expect(maskedEllipse?.getAttribute('mask')).toBe('url(#mask-render-mask-source)');
    expect(whiteboardSvg!.querySelector('[data-logoforge-whiteboard-id="render-mask-source"]')).toBeNull();

    fireEvent.mouseDown(whiteboardSvg!, { clientX: 20, clientY: 190 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 40, clientY: 210 });
    const selectedMask = await waitFor(() => {
      const layer = whiteboardSvg!.querySelector('[data-logoforge-whiteboard-id="render-mask-source"]');
      expect(layer).not.toBeNull();
      expect(layer?.getAttribute('transform')).toBe('translate(20, 20)');
      return layer!;
    });
    expect(selectedMask.getAttribute('class')).toContain('opacity-50');
    expect(selectedMask.getAttribute('class')).toContain('drop-shadow-sm');
    expect(selectedMask.querySelector('rect')?.getAttribute('fill-opacity')).toBe('0.45');
    expect(selectedMask.querySelector('rect')?.getAttribute('stroke-dasharray')).toBe('4 4');
  });

  it('resizes rectangles and ellipses through Node geometry after a prior handled gesture', async () => {
    const project = makeProject();
    project.whiteboardSketches = [
      {
        id: 'rect-resize',
        name: 'Resizable rectangle',
        type: 'rectangle',
        path: undefined,
        props: { x: '50', y: '60', width: '100', height: '80', rx: 8, customProp: 'rect-kept' },
        color: '#123456',
        customLegacyField: 'rectangle-kept',
      } as WhiteboardSketch,
      {
        id: 'ellipse-resize',
        name: 'Resizable ellipse',
        type: 'circle',
        path: undefined,
        props: { cx: '260', cy: '220', rx: '40', ry: '30', customProp: 'ellipse-kept' },
        color: '#654321',
        customLegacyField: 'ellipse-kept',
      } as WhiteboardSketch,
    ];
    useAppStore.setState({ projects: [project], activeProjectId: project.id });
    const history = createSharedVectorHistoryController(commitToStore);
    const { container } = render(
      <ToastProvider>
        <EditorPair history={history} />
      </ToastProvider>,
    );
    const whiteboardSvg = container.querySelector<SVGSVGElement>('svg.touch-none');
    const rectangle = whiteboardSvg?.querySelector<SVGRectElement>('[data-logoforge-whiteboard-id="rect-resize"] rect');
    expect(rectangle).not.toBeNull();

    fireEvent.mouseDown(rectangle!, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 100, clientY: 100 });
    const rectangleHandle = whiteboardSvg!.querySelector<SVGRectElement>(
      '[data-logoforge-resize-handle="rect-resize:br"]',
    );
    expect(rectangleHandle).not.toBeNull();
    expect(rectangleHandle?.getAttribute('x')).toBe('128');
    expect(rectangleHandle?.getAttribute('y')).toBe('118');
    fireEvent.mouseDown(rectangleHandle!, { clientX: 150, clientY: 140 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 180, clientY: 170 });
    expect(whiteboardSvg!.querySelector('[data-logoforge-whiteboard-id="rect-resize"] rect')?.getAttribute('width'))
      .toBe('130');
    expect(getProject().whiteboardSketches?.[0].props.width).toBe('100');
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 180, clientY: 170 });
    expect(whiteboardSvg!.querySelector('[data-logoforge-whiteboard-id="rect-resize"] rect')?.getAttribute('width'))
      .toBe('130');

    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[0].props).toMatchObject({
        x: '50', y: '60', width: '130', height: '110', rx: 8, customProp: 'rect-kept',
      });
    });
    expect((getProject().whiteboardSketches?.[0] as WhiteboardSketch & { customLegacyField?: string }).customLegacyField)
      .toBe('rectangle-kept');
    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => expect(getProject().whiteboardSketches?.[0].props.width).toBe('100'));
    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => expect(getProject().whiteboardSketches?.[0].props.width).toBe('130'));

    const ellipse = whiteboardSvg!.querySelector<SVGEllipseElement>(
      '[data-logoforge-whiteboard-id="ellipse-resize"] ellipse',
    );
    expect(ellipse).not.toBeNull();
    fireEvent.mouseDown(ellipse!, { clientX: 260, clientY: 220 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 260, clientY: 220 });
    const ellipseHandle = whiteboardSvg!.querySelector<SVGCircleElement>(
      '[data-logoforge-resize-handle="ellipse-resize:right"]',
    );
    expect(ellipseHandle).not.toBeNull();
    expect(ellipseHandle?.getAttribute('cx')).toBe('300');
    expect(whiteboardSvg!.querySelector<SVGCircleElement>(
      '[data-logoforge-resize-handle="ellipse-resize:bottom"]',
    )?.getAttribute('cy')).toBe('250');
    fireEvent.mouseDown(ellipseHandle!, { clientX: 300, clientY: 220 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 320, clientY: 220 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 320, clientY: 220 });

    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[1].props).toMatchObject({
        cx: '260', cy: '220', rx: '60', ry: '30', customProp: 'ellipse-kept',
      });
    });
    expect((getProject().whiteboardSketches?.[1] as WhiteboardSketch & { customLegacyField?: string }).customLegacyField)
      .toBe('ellipse-kept');
  });

  it('reshapes Node-backed straight, quadratic, and elbow line handles with numeric-safe geometry', async () => {
    const project = makeProject();
    project.whiteboardSketches = [
      {
        id: 'native-line-resize',
        name: 'Native endpoint line',
        type: 'line',
        props: { x1: '100', y1: '100', x2: '200', y2: '200', customProp: 'line-kept' },
        color: '#123456',
        customLegacyField: 'native-line-kept',
      } as WhiteboardSketch,
      {
        id: 'quadratic-line-resize',
        name: 'Quadratic path line',
        type: 'line',
        path: 'M 220,100 Q 270,80 320,160',
        props: { x1: '220', y1: '100', x2: '320', y2: '160', lineStyle: 'curved' },
      },
      {
        id: 'elbow-line-resize',
        name: 'Elbow path line',
        type: 'line',
        path: 'M 30,200 L 70,200 L 70,250',
        props: { lineStyle: 'elbow' },
      },
    ];
    useAppStore.setState({ projects: [project], activeProjectId: project.id });
    const history = createSharedVectorHistoryController(commitToStore);
    const { container } = render(
      <ToastProvider>
        <EditorPair history={history} />
      </ToastProvider>,
    );
    const whiteboardSvg = container.querySelector<SVGSVGElement>('svg.touch-none');
    expect(whiteboardSvg).not.toBeNull();

    const nativeLine = whiteboardSvg!.querySelector<SVGLineElement>(
      '[data-logoforge-whiteboard-id="native-line-resize"] line',
    );
    expect(nativeLine).not.toBeNull();
    fireEvent.mouseDown(nativeLine!, { clientX: 150, clientY: 150 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 150, clientY: 150 });
    const nativeEnd = await waitFor(() => {
      const handle = whiteboardSvg!.querySelector<SVGCircleElement>(
        '[data-logoforge-resize-handle="native-line-resize:end"]',
      );
      expect(handle).not.toBeNull();
      return handle!;
    });
    fireEvent.mouseDown(nativeEnd, { clientX: 200, clientY: 200 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 210, clientY: 230 });
    expect(nativeLine!.getAttribute('x2')).toBe('210');
    expect(nativeLine!.getAttribute('y2')).toBe('230');
    expect(getProject().whiteboardSketches?.[0].props.x2).toBe('200');
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 210, clientY: 230 });
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[0].props).toMatchObject({ x1: '100', y1: '100', x2: '210', y2: '230' });
    });
    expect((getProject().whiteboardSketches?.[0] as WhiteboardSketch & { customLegacyField?: string }).customLegacyField)
      .toBe('native-line-kept');
    const nativeStart = whiteboardSvg!.querySelector<SVGCircleElement>(
      '[data-logoforge-resize-handle="native-line-resize:start"]',
    );
    expect(nativeStart).not.toBeNull();
    fireEvent.mouseDown(nativeStart!, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 90, clientY: 90 });
    expect(nativeLine!.getAttribute('x1')).toBe('90');
    expect(nativeLine!.getAttribute('y1')).toBe('90');
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 90, clientY: 90 });
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[0].props).toMatchObject({ x1: '90', y1: '90', x2: '210', y2: '230' });
    });

    const quadraticPath = whiteboardSvg!.querySelector<SVGPathElement>(
      '[data-logoforge-whiteboard-id="quadratic-line-resize"] path',
    );
    expect(quadraticPath).not.toBeNull();
    fireEvent.mouseDown(quadraticPath!, { clientX: 270, clientY: 100 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 270, clientY: 100 });
    const curveHandle = await waitFor(() => {
      const handle = whiteboardSvg!.querySelector<SVGCircleElement>(
        '[data-logoforge-resize-handle="quadratic-line-resize:curve"]',
      );
      expect(handle).not.toBeNull();
      return handle!;
    });
    expect(curveHandle.getAttribute('cx')).toBe('270');
    expect(curveHandle.getAttribute('cy')).toBe('80');
    fireEvent.mouseDown(curveHandle, { clientX: 270, clientY: 80 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 280, clientY: 90 });
    expect(quadraticPath!.getAttribute('d')).toBe('M220,100 Q280,90,320,160');
    expect(getProject().whiteboardSketches?.[1].path).toBe('M 220,100 Q 270,80 320,160');
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 280, clientY: 90 });
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[1].path).toBe('M220,100 Q280,90,320,160');
      expect(getProject().whiteboardSketches?.[1].props).toMatchObject({ curveX: 280, curveY: 90 });
    });
    const quadraticEnd = whiteboardSvg!.querySelector<SVGCircleElement>(
      '[data-logoforge-resize-handle="quadratic-line-resize:end"]',
    );
    expect(quadraticEnd).not.toBeNull();
    fireEvent.mouseDown(quadraticEnd!, { clientX: 320, clientY: 160 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 330, clientY: 170 });
    expect(quadraticPath!.getAttribute('d')).toBe('M220,100 Q280,90,330,170');
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 330, clientY: 170 });
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[1].path).toBe('M220,100 Q280,90,330,170');
      expect(getProject().whiteboardSketches?.[1].props).toMatchObject({ x2: '330', y2: '170' });
    });

    const elbowPath = whiteboardSvg!.querySelector<SVGPathElement>(
      '[data-logoforge-whiteboard-id="elbow-line-resize"] path',
    );
    expect(elbowPath).not.toBeNull();
    fireEvent.mouseDown(elbowPath!, { clientX: 50, clientY: 200 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 50, clientY: 200 });
    const elbowStart = await waitFor(() => {
      const handle = whiteboardSvg!.querySelector<SVGCircleElement>(
        '[data-logoforge-resize-handle="elbow-line-resize:start"]',
      );
      expect(handle).not.toBeNull();
      return handle!;
    });
    fireEvent.mouseDown(elbowStart, { clientX: 30, clientY: 200 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 20, clientY: 190 });
    expect(elbowPath!.getAttribute('d')).toBe('M20,190 L70,190 L70,250');
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 20, clientY: 190 });
    await waitFor(() => expect(getProject().whiteboardSketches?.[2].path).toBe('M20,190 L70,190 L70,250'));
    const elbowEnd = whiteboardSvg!.querySelector<SVGCircleElement>(
      '[data-logoforge-resize-handle="elbow-line-resize:end"]',
    );
    expect(elbowEnd).not.toBeNull();
    fireEvent.mouseDown(elbowEnd!, { clientX: 70, clientY: 250 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 80, clientY: 260 });
    expect(elbowPath!.getAttribute('d')).toBe('M20,190 L80,190 L80,260');
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 80, clientY: 260 });
    await waitFor(() => expect(getProject().whiteboardSketches?.[2].path).toBe('M20,190 L80,190 L80,260'));
  });

  it('preserves an in-flight quadratic line preview through a shared edit and release without another move', async () => {
    const project = makeProject();
    const curveLine: WhiteboardSketch = {
      id: 'quadratic-line-sync',
      name: 'Quadratic line with concurrent update',
      type: 'line',
      path: 'M 100,100 Q 150,60 200,200',
      props: { x1: '100', y1: '100', x2: '200', y2: '200', lineStyle: 'curved' },
    };
    const sharedPath: WhiteboardSketch = {
      id: 'shared-wb-concurrent-line',
      name: 'Shared line-sync path',
      type: 'path',
      path: 'M 10 10 L 30 30',
      locked: true,
    };
    project.whiteboardSketches = [curveLine, sharedPath];
    useAppStore.setState({ projects: [project], activeProjectId: project.id });
    const history = createSharedVectorHistoryController(commitToStore);
    const { container } = render(
      <ToastProvider>
        <EditorPair history={history} />
      </ToastProvider>,
    );
    const whiteboardSvg = container.querySelector<SVGSVGElement>('svg.touch-none');
    const curvePath = whiteboardSvg?.querySelector<SVGPathElement>(
      '[data-logoforge-whiteboard-id="quadratic-line-sync"] path',
    );
    expect(curvePath).not.toBeNull();
    fireEvent.mouseDown(curvePath!, { clientX: 150, clientY: 100 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 150, clientY: 100 });
    const curveHandle = await waitFor(() => {
      const handle = whiteboardSvg!.querySelector<SVGCircleElement>(
        '[data-logoforge-resize-handle="quadratic-line-sync:curve"]',
      );
      expect(handle).not.toBeNull();
      return handle!;
    });
    fireEvent.mouseDown(curveHandle, { clientX: 150, clientY: 60 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 180, clientY: 80 });
    expect(curvePath!.getAttribute('d')).toBe('M100,100 Q180,80,200,200');
    expect(getProject().whiteboardSketches?.[0].path).toBe('M 100,100 Q 150,60 200,200');

    act(() => {
      useAppStore.setState((state) => ({
        projects: state.projects.map((item) => item.id === project.id
          ? {
            ...item,
            whiteboardSketches: item.whiteboardSketches?.map((sketch) =>
              sketch.id === sharedPath.id ? { ...sketch, path: 'M 12 12 L 34 34' } : sketch,
            ),
          }
          : item),
      }));
    });
    await waitFor(() => {
      expect(curvePath!.getAttribute('d')).toBe('M100,100 Q180,80,200,200');
      expect(whiteboardSvg!.querySelector(
        '[data-logoforge-whiteboard-id="shared-wb-concurrent-line"] path',
      )?.getAttribute('d')).toBe('M 12 12 L 34 34');
    });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 180, clientY: 80 });

    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[0].path).toBe('M100,100 Q180,80,200,200');
      expect(getProject().whiteboardSketches?.[0].props).toMatchObject({ curveX: 180, curveY: 80 });
      expect(getProject().whiteboardSketches?.[1].path).toBe('M 12 12 L 34 34');
    });
    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[0].path).toBe('M 100,100 Q 150,60 200,200');
      expect(getProject().whiteboardSketches?.[1].path).toBe('M 12 12 L 34 34');
    });
    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[0].path).toBe('M100,100 Q180,80,200,200');
      expect(getProject().whiteboardSketches?.[1].path).toBe('M 12 12 L 34 34');
    });
  });

  it('cancels a line handle drag when its sketch is removed, without saving or undo-resurrecting it', async () => {
    const project = makeProject();
    const line: WhiteboardSketch = {
      id: 'quadratic-line-removed-during-drag',
      name: 'Line removed during active handle drag',
      type: 'line',
      path: 'M 100,100 Q 150,60 200,200',
      props: { x1: '100', y1: '100', x2: '200', y2: '200', lineStyle: 'curved' },
    };
    project.whiteboardSketches = [line];
    useAppStore.setState({ projects: [project], activeProjectId: project.id });
    const updateAndSync = vi.fn(async (updates: Partial<Project>) => commitToStore(updates));
    const { container } = render(
      <ToastProvider>
        <WhiteboardCanvas fullscreen={false} setFullscreen={() => undefined} onUpdateAndSync={updateAndSync} />
      </ToastProvider>,
    );
    const whiteboardSvg = container.querySelector<SVGSVGElement>('svg.touch-none');
    const path = whiteboardSvg?.querySelector<SVGPathElement>(
      '[data-logoforge-whiteboard-id="quadratic-line-removed-during-drag"] path',
    );
    expect(path).not.toBeNull();
    fireEvent.mouseDown(path!, { clientX: 150, clientY: 100 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 150, clientY: 100 });
    const curveHandle = await waitFor(() => {
      const handle = whiteboardSvg!.querySelector<SVGCircleElement>(
        '[data-logoforge-resize-handle="quadratic-line-removed-during-drag:curve"]',
      );
      expect(handle).not.toBeNull();
      return handle!;
    });
    fireEvent.mouseDown(curveHandle, { clientX: 150, clientY: 60 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 180, clientY: 80 });
    expect(path!.getAttribute('d')).toBe('M100,100 Q180,80,200,200');
    expect(updateAndSync).not.toHaveBeenCalled();

    act(() => {
      useAppStore.setState((state) => ({
        projects: state.projects.map((item) => item.id === project.id
          ? { ...item, whiteboardSketches: item.whiteboardSketches?.filter((sketch) => sketch.id !== line.id) }
          : item),
      }));
    });
    await waitFor(() => expect(whiteboardSvg!.querySelector(
      '[data-logoforge-whiteboard-id="quadratic-line-removed-during-drag"]',
    )).toBeNull());
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 180, clientY: 80 });
    await waitFor(() => expect(getProject().whiteboardSketches).toEqual([]));
    expect(updateAndSync).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => expect(getProject().whiteboardSketches).toEqual([]));
    expect(updateAndSync).not.toHaveBeenCalled();
  });

  it('cancels a line handle drag on project switch even when the next project reuses the sketch ID', async () => {
    const firstProject = makeProject();
    firstProject.id = 'handle-switch-project-a';
    const firstLine: WhiteboardSketch = {
      id: 'reused-line-id',
      name: 'First project line',
      type: 'line',
      path: 'M 100,100 Q 150,60 200,200',
      props: { x1: '100', y1: '100', x2: '200', y2: '200', lineStyle: 'curved' },
    };
    firstProject.whiteboardSketches = [firstLine];
    const secondProject = makeProject();
    secondProject.id = 'handle-switch-project-b';
    const secondLine: WhiteboardSketch = {
      ...firstLine,
      name: 'Second project line',
      path: 'M 300,300 Q 350,250 400,400',
      props: { x1: '300', y1: '300', x2: '400', y2: '400', lineStyle: 'curved' },
    };
    secondProject.whiteboardSketches = [secondLine];
    useAppStore.setState({ projects: [firstProject, secondProject], activeProjectId: firstProject.id });
    const updateAndSync = vi.fn(async (updates: Partial<Project>) => commitToStore(updates));
    const { container } = render(
      <ToastProvider>
        <WhiteboardCanvas fullscreen={false} setFullscreen={() => undefined} onUpdateAndSync={updateAndSync} />
      </ToastProvider>,
    );
    const whiteboardSvg = container.querySelector<SVGSVGElement>('svg.touch-none');
    const firstPath = whiteboardSvg?.querySelector<SVGPathElement>(
      '[data-logoforge-whiteboard-id="reused-line-id"] path',
    );
    expect(firstPath).not.toBeNull();
    fireEvent.mouseDown(firstPath!, { clientX: 150, clientY: 100 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 150, clientY: 100 });
    const curveHandle = await waitFor(() => {
      const handle = whiteboardSvg!.querySelector<SVGCircleElement>(
        '[data-logoforge-resize-handle="reused-line-id:curve"]',
      );
      expect(handle).not.toBeNull();
      return handle!;
    });
    fireEvent.mouseDown(curveHandle, { clientX: 150, clientY: 60 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 180, clientY: 80 });
    expect(firstPath!.getAttribute('d')).toBe('M100,100 Q180,80,200,200');

    act(() => useAppStore.setState({ activeProjectId: secondProject.id }));
    await waitFor(() => {
      expect(getProject().id).toBe(secondProject.id);
      expect(whiteboardSvg!.querySelector(
        '[data-logoforge-whiteboard-id="reused-line-id"] path',
      )?.getAttribute('d')).toBe('M 300,300 Q 350,250 400,400');
    });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 180, clientY: 80 });
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[0].path).toBe('M 300,300 Q 350,250 400,400');
      expect(useAppStore.getState().projects.find((project) => project.id === firstProject.id)
        ?.whiteboardSketches?.[0].path).toBe('M 100,100 Q 150,60 200,200');
    });
    expect(updateAndSync).not.toHaveBeenCalled();
  });

  it('rebases an in-flight resize onto concurrent shared mirror edits and removals', async () => {
    const project = makeProject();
    const rectangle: WhiteboardSketch = {
      id: 'resize-with-shared-change',
      name: 'Resizable rectangle',
      type: 'rectangle',
      props: { x: 50, y: 60, width: 100, height: 80 },
    };
    const sharedPath: WhiteboardSketch = {
      id: 'shared-wb-concurrent-resize',
      name: 'Concurrent shared path',
      type: 'path',
      path: 'M 10 10 L 30 30',
      color: '#123456',
      strokeWidth: 2,
      locked: true,
    };
    project.whiteboardSketches = [rectangle, sharedPath];
    useAppStore.setState({ projects: [project], activeProjectId: project.id });
    const history = createSharedVectorHistoryController(commitToStore);
    const { container } = render(
      <ToastProvider>
        <EditorPair history={history} />
      </ToastProvider>,
    );
    const whiteboardSvg = container.querySelector<SVGSVGElement>('svg.touch-none');
    const rectangleShape = whiteboardSvg?.querySelector<SVGRectElement>(
      '[data-logoforge-whiteboard-id="resize-with-shared-change"] rect',
    );
    expect(rectangleShape).not.toBeNull();

    fireEvent.mouseDown(rectangleShape!, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 100, clientY: 100 });
    const firstHandle = whiteboardSvg!.querySelector<SVGRectElement>(
      '[data-logoforge-resize-handle="resize-with-shared-change:br"]',
    );
    expect(firstHandle).not.toBeNull();
    fireEvent.mouseDown(firstHandle!, { clientX: 150, clientY: 140 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 180, clientY: 170 });

    const editedSharedPath = { ...sharedPath, path: 'M 12 12 L 34 34' };
    act(() => {
      useAppStore.setState((state) => ({
        projects: state.projects.map((item) => item.id === project.id
          ? { ...item, whiteboardSketches: [rectangle, editedSharedPath] }
          : item),
      }));
    });
    await waitFor(() => {
      expect(whiteboardSvg!.querySelector(
        '[data-logoforge-whiteboard-id="shared-wb-concurrent-resize"] path',
      )?.getAttribute('d')).toBe('M 12 12 L 34 34');
      expect(whiteboardSvg!.querySelector(
        '[data-logoforge-whiteboard-id="resize-with-shared-change"] rect',
      )?.getAttribute('width')).toBe('130');
    });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 180, clientY: 170 });

    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[0].props.width).toBe(130);
      expect(getProject().whiteboardSketches?.[1].path).toBe('M 12 12 L 34 34');
    });
    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[0].props.width).toBe(100);
      expect(getProject().whiteboardSketches?.[1].path).toBe('M 12 12 L 34 34');
    });
    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => expect(getProject().whiteboardSketches?.[0].props.width).toBe(130));

    const secondHandle = whiteboardSvg!.querySelector<SVGRectElement>(
      '[data-logoforge-resize-handle="resize-with-shared-change:br"]',
    );
    expect(secondHandle).not.toBeNull();
    fireEvent.mouseDown(secondHandle!, { clientX: 180, clientY: 170 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 200, clientY: 190 });
    act(() => {
      useAppStore.setState((state) => ({
        projects: state.projects.map((item) => item.id === project.id
          ? { ...item, whiteboardSketches: item.whiteboardSketches?.filter((sketch) => sketch.id !== sharedPath.id) }
          : item),
      }));
    });
    await waitFor(() => {
      expect(whiteboardSvg!.querySelector(
        '[data-logoforge-whiteboard-id="shared-wb-concurrent-resize"]',
      )).toBeNull();
      expect(whiteboardSvg!.querySelector(
        '[data-logoforge-whiteboard-id="resize-with-shared-change"] rect',
      )?.getAttribute('width')).toBe('150');
    });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 200, clientY: 190 });

    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[0].props.width).toBe(150);
      expect(getProject().whiteboardSketches?.some((sketch) => sketch.id === sharedPath.id)).toBe(false);
    });
    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[0].props.width).toBe(130);
      expect(getProject().whiteboardSketches?.some((sketch) => sketch.id === sharedPath.id)).toBe(false);
    });
  });

  it('moves path-backed sketches through strict Node translation and leaves malformed paths unchanged', async () => {
    const project = makeProject();
    project.whiteboardSketches = [
      {
        id: 'arc-drag',
        name: 'Arc path',
        type: 'path',
        path: 'M 50 100 a50 50 0 1 0 100 0 Z',
        color: '#123456',
        strokeWidth: 2,
        customLegacyField: 'preserve-me',
      } as WhiteboardSketch,
      {
        id: 'malformed-drag',
        name: 'Malformed path',
        type: 'path',
        path: 'M 200,200 L 210,210 L',
      } as WhiteboardSketch,
      {
        id: 'endpoint-line-drag',
        name: 'Endpoint line',
        type: 'line',
        props: { x1: 250, y1: 300, x2: 280, y2: 300 },
      } as WhiteboardSketch,
    ];
    useAppStore.setState({ projects: [project], activeProjectId: project.id });
    const history = createSharedVectorHistoryController(commitToStore);
    const { container } = render(
      <ToastProvider>
        <EditorPair history={history} />
      </ToastProvider>,
    );
    const whiteboardSvg = container.querySelector<SVGSVGElement>('svg.touch-none');
    expect(whiteboardSvg).not.toBeNull();
    const arcPath = whiteboardSvg!.querySelector<SVGPathElement>('[data-logoforge-whiteboard-id="arc-drag"] path');
    expect(arcPath).not.toBeNull();

    fireEvent.mouseDown(arcPath!, { clientX: 50, clientY: 100 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 70, clientY: 120 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 70, clientY: 120 });
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[0].path).toBe('M70,120 a50,50,0,1,0,100,0 Z');
    });
    const movedArc = getProject().whiteboardSketches?.[0] as (WhiteboardSketch & { customLegacyField?: unknown }) | undefined;
    expect(movedArc?.customLegacyField).toBe('preserve-me');
    fireEvent.doubleClick(arcPath!, { clientX: 70, clientY: 120 });
    const arcNudge = await screen.findByLabelText('Path X position') as HTMLInputElement;
    expect(arcNudge.disabled).toBe(true);

    const malformedPath = whiteboardSvg!.querySelector<SVGPathElement>('[data-logoforge-whiteboard-id="malformed-drag"] path');
    expect(malformedPath).not.toBeNull();
    fireEvent.mouseDown(malformedPath!, { clientX: 200, clientY: 200 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 210, clientY: 210 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 210, clientY: 210 });
    expect(await screen.findByText('Could not safely move this sketch; it was left unchanged.')).toBeTruthy();
    expect(getProject().whiteboardSketches?.[1].path).toBe('M 200,200 L 210,210 L');

    const endpointLine = whiteboardSvg!.querySelector<SVGLineElement>('[data-logoforge-whiteboard-id="endpoint-line-drag"] line');
    expect(endpointLine).not.toBeNull();
    fireEvent.mouseDown(endpointLine!, { clientX: 250, clientY: 300 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 260, clientY: 310 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 260, clientY: 310 });
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[2].props).toMatchObject({ x1: 260, y1: 310, x2: 290, y2: 310 });
    });
  });

  it('keeps same-value fractional path nudges inert and applies exact linear offsets', async () => {
    const project = makeProject();
    project.whiteboardSketches = [{
      id: 'linear-nudge',
      name: 'Linear path',
      type: 'path',
      path: 'M10.4 20.6 L30.4 40.6',
    } as WhiteboardSketch];
    useAppStore.setState({ projects: [project], activeProjectId: project.id });
    const history = createSharedVectorHistoryController(commitToStore);
    const { container } = render(
      <ToastProvider>
        <EditorPair history={history} />
      </ToastProvider>,
    );
    const whiteboardSvg = container.querySelector<SVGSVGElement>('svg.touch-none');
    const path = whiteboardSvg?.querySelector<SVGPathElement>('[data-logoforge-whiteboard-id="linear-nudge"] path');
    expect(path).not.toBeNull();

    fireEvent.doubleClick(path!, { clientX: 10, clientY: 20 });
    const xPosition = await screen.findByLabelText('Path X position') as HTMLInputElement;
    expect(xPosition.value).toBe('10.4');
    fireEvent.change(xPosition, { target: { value: '10.4' } });
    expect(getProject().whiteboardSketches?.[0].path).toBe('M10.4 20.6 L30.4 40.6');

    fireEvent.change(xPosition, { target: { value: '11.4' } });
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[0].path).toBe('M11.4,20.6 L31.4,40.6');
    });
  });

  it('creates in Whiteboard, undoes in SVGPathEditor, redoes in Whiteboard, and preserves local history order', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    const { container } = render(
      <ToastProvider>
        <EditorPair history={history} />
      </ToastProvider>,
    );

    // Establish a local precision-editor snapshot before the external shared mutation.
    fireEvent.click(screen.getByText('Shapes'));
    fireEvent.click(screen.getByText('Shield Security'));
    await waitFor(() => expect(listEditablePaths(getProject().svgSource)).toHaveLength(2));

    // Draw a real line with WhiteboardCanvas's tool and pointer handlers.
    fireEvent.click(screen.getByTitle('Line'));
    const whiteboardSvg = container.querySelector('svg.touch-none');
    expect(whiteboardSvg).not.toBeNull();
    fireEvent.mouseDown(whiteboardSvg!, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 40, clientY: 40 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 40, clientY: 40 });

    await waitFor(() => {
      expect(getProject().whiteboardSketches).toHaveLength(1);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(3);
    });
    const sharedSketch = getProject().whiteboardSketches![0];
    expect(sharedSketch.id.startsWith('shared-wb-')).toBe(true);
    expect(sharedSketch.locked).toBe(true);
    expect(listEditablePaths(getProject().svgSource).some((path) => path.nodeId === `whiteboard-${sharedSketch.id}`)).toBe(true);

    // The path editor must discard its stale pre-shared snapshot and undo the shared delta.
    fireEvent.click(screen.getByTitle('Undo last stroke'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toEqual([]);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(2);
    });
    expect(getProject().svgSource).toContain('M 60,50 L 140,50');

    // Redo the same command from the Whiteboard toolbar.
    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toHaveLength(1);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(3);
    });

    // A newer legacy whiteboard action must undo before the older shared command.
    fireEvent.click(screen.getByTitle('Rectangle'));
    fireEvent.mouseDown(whiteboardSvg!, { clientX: 80, clientY: 80 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 120, clientY: 120 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 120, clientY: 120 });
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(2));

    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(1));
    expect(listEditablePaths(getProject().svgSource)).toHaveLength(3);

    // The next undo is the shared path; rebased local snapshots must not bring it back.
    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toEqual([]);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(2);
    });

    // Shared redo, then local redo, must also remain ordered and document-consistent.
    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(1));
    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(2));
    expect(listEditablePaths(getProject().svgSource)).toHaveLength(3);

    // The precision editor can also undo and redo the shared step after local history moves.
    fireEvent.click(screen.getByTitle('Undo last stroke'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toHaveLength(1);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(2);
    });
    fireEvent.click(screen.getByTitle('Redo stroke'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toHaveLength(2);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(3);
    });

    // A new local Whiteboard action after undo is a new branch and must discard shared redo.
    fireEvent.click(screen.getByTitle('Undo last stroke'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toHaveLength(1);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(2);
    });
    expect(history.canRedo()).toBe(true);
    fireEvent.click(screen.getByTitle('Circle'));
    fireEvent.mouseDown(whiteboardSvg!, { clientX: 150, clientY: 150 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 190, clientY: 190 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 190, clientY: 190 });
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(2));
    expect(history.canRedo()).toBe(false);

    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(2));
    const finalPathIds = listEditablePaths(getProject().svgSource).map((path) => path.nodeId);
    expect(finalPathIds[0]).toBe('existing');
    expect(finalPathIds).toHaveLength(2);
  });

  it('updates shared path geometry and style in Precision and undoes/redoes across both editors', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    const sketch = {
      id: 'shared-wb-update-ui',
      name: 'Shared path to update',
      type: 'line' as const,
      path: 'M 10,10 L 40,40',
      color: '#123456',
      strokeWidth: 4,
      locked: true,
    };
    expect(await history.addWhiteboardPath(sketch)).toBe(true);
    render(
      <ToastProvider>
        <EditorPair history={history} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Precision Handles'));
    fireEvent.click(screen.getByText('M 10,10 L 40,40...'));
    fireEvent.click(screen.getByText('Move Right →'));

    await waitFor(() => {
      const sharedPath = listEditablePaths(getProject().svgSource).find((path) => path.nodeId === `whiteboard-${sketch.id}`);
      expect(sharedPath?.d).toBe('M18,10 L48,40');
      expect(getProject().whiteboardSketches?.[0].path).toBe(sharedPath?.d);
    });

    // The selected-style action changes an existing path, not merely future drawing defaults.
    fireEvent.click(screen.getByText('Touch Draw Board'));
    fireEvent.click(screen.getByText('Apply style to selected path'));
    await waitFor(() => {
      const sharedPath = listEditablePaths(getProject().svgSource).find((path) => path.nodeId === `whiteboard-${sketch.id}`);
      expect(sharedPath?.stroke).toBe('#6366F1');
      expect(getProject().whiteboardSketches?.[0].color).toBe('#6366F1');
    });

    // Undo style in Whiteboard, then geometry in Precision; the mirror stays synchronized.
    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[0].color).toBe('#123456');
      expect(getProject().whiteboardSketches?.[0].path).toBe('M18,10 L48,40');
    });
    fireEvent.click(screen.getByTitle('Undo last stroke'));
    await waitFor(() => {
      expect(listEditablePaths(getProject().svgSource).find((path) => path.nodeId === `whiteboard-${sketch.id}`)?.d)
        .toBe('M 10,10 L 40,40');
      expect(getProject().whiteboardSketches?.[0].path).toBe('M 10,10 L 40,40');
    });

    // Redo geometry in Precision and style in Whiteboard, preserving both command deltas.
    fireEvent.click(screen.getByTitle('Redo stroke'));
    await waitFor(() => expect(getProject().whiteboardSketches?.[0].path).toBe('M18,10 L48,40'));
    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => {
      const sharedPath = listEditablePaths(getProject().svgSource).find((path) => path.nodeId === `whiteboard-${sketch.id}`);
      expect(sharedPath?.stroke).toBe('#6366F1');
      expect(getProject().whiteboardSketches?.[0]).toMatchObject({
        path: 'M18,10 L48,40',
        color: '#6366F1',
      });
    });
  });

  it('restores Precision handles from the latest SVG after a shared edit is rejected', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    const sketch = {
      id: 'shared-wb-rejected-update-ui',
      name: 'Shared path with a concurrent change',
      type: 'line' as const,
      path: 'M 10,10 L 40,40',
      color: '#123456',
      strokeWidth: 4,
      locked: true,
    };
    expect(await history.addWhiteboardPath(sketch)).toBe(true);
    const attemptedPathData: string[] = [];
    let remoteChangeApplied = false;
    const rejectSharedUpdate = async (nodeId: string, candidateSvg: string) => {
      attemptedPathData.push(listEditablePaths(candidateSvg).find((path) => path.nodeId === nodeId)?.d ?? '');
      if (!remoteChangeApplied) {
        remoteChangeApplied = true;
        const currentProject = getProject();
        const remotePathData = 'M 100,100 L 140,140';
        await commitToStore({
          svgSource: replacePathDataById(currentProject.svgSource!, nodeId, remotePathData),
          whiteboardSketches: currentProject.whiteboardSketches?.map((item) =>
            item.id === sketch.id ? { ...item, path: remotePathData } : item,
          ),
        });
      }
      return false;
    };

    render(
      <ToastProvider>
        <EditorPair history={history} updateSharedPath={rejectSharedUpdate} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Precision Handles'));
    fireEvent.click(screen.getByText('M 10,10 L 40,40...'));
    fireEvent.click(screen.getByText('Move Right →'));

    await waitFor(() => expect(getProject().whiteboardSketches?.[0].path).toBe('M 100,100 L 140,140'));
    await screen.findByText('The shared path or document changed before this edit could be applied; the latest version was restored.');
    fireEvent.click(screen.getByText('Move Right →'));

    await waitFor(() => expect(attemptedPathData).toHaveLength(2));
    expect(attemptedPathData).toEqual(['M18,10 L48,40', 'M108,100 L148,140']);
    expect(getProject().whiteboardSketches?.[0].path).toBe('M 100,100 L 140,140');
    expect(listEditablePaths(getProject().svgSource).find((path) => path.nodeId === `whiteboard-${sketch.id}`)?.d)
      .toBe('M 100,100 L 140,140');
  });

  it('deletes a shared Precision layer and undoes/redoes it across both editors', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    const sketch = {
      id: 'shared-wb-delete-ui',
      name: 'Shared path to delete',
      type: 'line' as const,
      path: 'M 10,10 L 40,40',
      color: '#123456',
      strokeWidth: 4,
      locked: true,
    };
    expect(await history.addWhiteboardPath(sketch)).toBe(true);
    render(
      <ToastProvider>
        <EditorPair history={history} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Precision Handles'));
    const deleteButtons = screen.getAllByTitle('Delete this path layer');
    expect(deleteButtons).toHaveLength(2);
    fireEvent.click(deleteButtons[1]);
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toEqual([]);
      expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual(['existing']);
    });

    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.map((item) => item.id)).toEqual([sketch.id]);
      expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual([
        'existing', `whiteboard-${sketch.id}`,
      ]);
    });

    fireEvent.click(screen.getByText('Touch Draw Board'));
    fireEvent.click(screen.getByTitle('Redo stroke'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toEqual([]);
      expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual(['existing']);
    });
  });

  it('sends an existing SVG path to Whiteboard as a shared link and clears redo', async () => {
    await commitToStore({ svgSource: getProject().svgSource.replace('M0 0 L5 5', 'M 0,0 L 5,5') });
    const history = createSharedVectorHistoryController(commitToStore);
    const { container, rerender } = render(
      <ToastProvider>
        <EditorPair history={history} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByTitle('Line'));
    const whiteboardSvg = container.querySelector('svg.touch-none');
    expect(whiteboardSvg).not.toBeNull();
    fireEvent.mouseDown(whiteboardSvg!, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 40, clientY: 40 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 40, clientY: 40 });
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(1));

    fireEvent.click(screen.getByTitle('Undo last stroke'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toEqual([]);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(1);
    });
    expect(history.canRedo()).toBe(true);

    fireEvent.click(screen.getByText('Precision Handles'));
    fireEvent.click(screen.getAllByTitle('Send back to Whiteboard Canvas')[0]);
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(1));
    expect(history.canRedo()).toBe(false);
    expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual(['existing']);

    fireEvent.click(screen.getAllByTitle('Select')[0]);
    fireEvent.doubleClick(whiteboardSvg!, { clientX: 3, clientY: 3 });
    fireEvent.click(await screen.findByTitle('Open existing path in Precision'));
    expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual(['existing']);

    rerender(
      <ToastProvider>
        <EditorPair history={history} showWhiteboard={false} />
      </ToastProvider>,
    );
    rerender(
      <ToastProvider>
        <EditorPair history={history} showWhiteboard />
      </ToastProvider>,
    );
    const remountedWhiteboardSvg = container.querySelector('svg.touch-none');
    expect(remountedWhiteboardSvg).not.toBeNull();
    fireEvent.click(screen.getByTitle('Rectangle'));
    fireEvent.mouseDown(remountedWhiteboardSvg!, { clientX: 80, clientY: 80 });
    fireEvent.mouseMove(remountedWhiteboardSvg!, { clientX: 120, clientY: 120 });
    fireEvent.mouseUp(remountedWhiteboardSvg!, { clientX: 120, clientY: 120 });
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(2));

    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toHaveLength(1);
      expect(getProject().whiteboardSketches![0].id.startsWith('shared-wb-')).toBe(true);
      expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual(['existing']);
    });
    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toEqual([]);
      expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual(['existing']);
    });
    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(1));
    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(2));
    expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual(['existing']);
  });
});
