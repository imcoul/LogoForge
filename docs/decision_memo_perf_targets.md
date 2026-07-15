# Technical Decision Memo: Performance Budgets & Device Testing Matrix

This memo establishes the target performance metrics, math offload strategies (Web Workers), and device verification guidelines for Forgel. The goal is to guarantee a fluid, 60fps visual design experience on both mobile devices and high-end desktop viewports.

---

## 1. Core Performance Budgets & SLA

To ensure editing feels immediate and natural, we enforce strict frame budget targets for all rendering threads.

| Metric / Interaction | Target (SLA) | P95 Limit | Thread | Implementation Safeguard |
|---|---|---|---|---|
| **Freehand Painting (Pencil)** | < 16.6ms (60fps) | < 33.3ms (30fps) | Main | Store coordinates in lightweight `Points` array; throttle redraw to requestAnimationFrame. |
| **Path Simplification / Smoothing** | < 100ms | < 250ms | Worker | Offload Douglas-Peucker simplification math to `pathWorker.ts` on mouseUp. |
| **Workspace Translation (Pan & Zoom)** | < 8ms | < 16.6ms | Main | CSS GPU-accelerated `transform: translate3d(...)` matrix calculations. |
| **IndexedDB State Hydration** | < 150ms | < 400ms | Async | Pre-fetch key local index markers on boot; lazy load complex background assets. |
| **Collaborative Remote Merging** | < 50ms | < 150ms | Web Sockets | Throttle incoming cursor broadcasts; queue batch drawing changes. |

---

## 2. Offloading Heavy Vector Math to Web Workers

To keep the UI responsive and prevent frame drops (jank) during heavy canvas rendering and path simplification, vector calculations are delegated to dedicated background worker threads.

### A. Path Simplification Worker (`pathWorker.ts`)
*   **Trigger:** Dispatched on pointer-up/mouse-up after a freehand path is painted.
*   **Operation:** Receives raw coordinate arrays, performs Ramer-Douglas-Peucker (RDP) path fitting, and computes simplified bezier paths.
*   **Result:** Returns streamlined path instructions (`pathD` strings) to the main state thread.

```typescript
// pathWorker.ts - Simplified Code Pattern
self.onmessage = (e) => {
  const { points, tolerance } = e.data;
  const simplifiedPoints = simplifyDouglasPeucker(points, tolerance);
  const pathD = convertPointsToBezierPath(simplifiedPoints);
  self.postMessage({ pathD });
};
```

### B. Offscreen Rasterization Worker (`renderWorker.ts`)
*   **Trigger:** Triggered during high-resolution PNG or PDF presentation generation.
*   **Operation:** Uses an `OffscreenCanvas` inside the Web Worker context.
*   **Result:** Streams raw rasterized buffer arrays back to the client, preventing main thread locks during file exports.

---

## 3. Recommended Device and Browser Test Matrix

All features MUST pass performance validation against this standardized target matrix to ensure full cross-platform compatibility.

### Tier 1: Low-End Mobile (Critical Performance Target)
*   **Representative Hardware:** Samsung Galaxy A15, Moto G Play, or Xiaomi Redmi 12 (budget chips).
*   **Browser Coverage:** Android Chrome Mobile, Android WebView (for native wraps).
*   **Target KPI:** Constant >45fps during freehand drawing, <150ms delay for properties changes.

### Tier 2: Mid-to-High-End Mobile
*   **Representative Hardware:** Apple iPhone 13/14/15, Samsung Galaxy S22/S23.
*   **Browser Coverage:** iOS Safari (WebKit rendering engine), Android Chrome.
*   **Target KPI:** Fluid 60fps rendering, seamless pinch-to-zoom multi-touch recognition.

### Tier 3: Desktop Viewports
*   **Representative Hardware:** MacBook Air/Pro (M1/M2/M3), standard Intel/AMD laptops.
*   **Browser Coverage:** Chrome (V8), Safari (WebKit), Firefox (Gecko).
*   **Target KPI:** Solid 60fps rendering up to 5,000 vector node points.

---

## 4. Active Telemetry Monitoring

To track visual performance on user devices, we monitor the following metrics in staging:
*   **render_duration_ms:** Frame render time using the Performance API.
*   **simplify_duration_ms:** Time taken by the worker to simplify a path.
*   **fps_drop_count:** Captures instances where frame rate falls below 30fps.
