// canvasWorker.ts - High-performance Background Vector Grading & Rendering Worker
// Calculates Offscreen Canvas operations, color space filtering, and performance benchmarks

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'EXPORT_IMAGE') {
    const { canvas, svgContent, fileName } = payload;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const response = await fetch(url);
      const svgText = await response.text();
      
      const img = new Image();
      img.src = `data:image/svg+xml;base64,${btoa(svgText)}`;
      await img.decode();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 2000, 2000);
      ctx.drawImage(img, 200, 200, 1600, 1600);
      
      const imageBlob = await canvas.convertToBlob({ type: 'image/png' });
      self.postMessage({ type: 'EXPORT_RESULT', payload: { blob: imageBlob, fileName } });
      URL.revokeObjectURL(url);
    }
  }

  // ... keep benchmarking and color grading ...
  if (type === 'BENCHMARK_RENDER') {
    const start = performance.now();
    let sum = 0;
    // Simulate complex vector rasterization, color translation & path geometry loops
    for (let i = 0; i < 5000000; i++) {
      sum += Math.sin(i) * Math.cos(i);
    }
    const duration = performance.now() - start;
    self.postMessage({
      type: 'BENCHMARK_RESULT',
      payload: {
        frameTimeMs: parseFloat(duration.toFixed(2)),
        opsPerSec: Math.round(5000000 / (duration / 1000)),
        sum
      }
    });
  }

  if (type === 'GRADE_COLORS') {
    const { colors, filterType } = payload; // 'warm' | 'cool' | 'brutalist' | 'cinematic'
    // Process color arrays in parallel
    const graded = colors.map((color: any) => {
      let r = parseInt(color.hex.slice(1, 3), 16);
      let g = parseInt(color.hex.slice(3, 5), 16);
      let b = parseInt(color.hex.slice(5, 7), 16);

      if (filterType === 'warm') {
        r = Math.min(255, r * 1.15);
        b = Math.max(0, b * 0.85);
      } else if (filterType === 'cool') {
        b = Math.min(255, b * 1.2);
        r = Math.max(0, r * 0.85);
      } else if (filterType === 'brutalist') {
        // High contrast extreme grading
        r = r > 128 ? 255 : 0;
        g = g > 128 ? 255 : 0;
        b = b > 128 ? 255 : 0;
      } else if (filterType === 'cinematic') {
        // Modern desaturated, deep shadows
        r = Math.round(r * 0.9 + 10);
        g = Math.round(g * 0.95 + 15);
        b = Math.round(b * 1.05 + 20);
      }

      const toHex = (val: number) => {
        const hex = Math.round(val).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };

      const newHex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      return {
        ...color,
        hex: newHex
      };
    });

    self.postMessage({
      type: 'GRADED_RESULT',
      payload: {
        gradedColors: graded,
        filterType
      }
    });
  }
};
