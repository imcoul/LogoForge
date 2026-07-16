// src/workers/renderWorker.ts

// OffscreenCanvas renderer for background image operations, magnifier loupe generation,
// and preventing main-thread blocking during raster conversions.

self.onmessage = async (e: MessageEvent) => {
  const { id, type, svgString, width, height, scale = 1, options = {} } = e.data;

  try {
    if (type === 'render-loupe') {
      // Logic for rendering a magnified portion of the canvas (loupe)
      // This worker expects an OffscreenCanvas or will just return a data URL?
      // Since OffscreenCanvas transfers are complex across all browsers, we can rasterize the SVG.
      
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      // Unfortunately, Image is not available in standard Web Workers, only createImageBitmap
      // If we use offscreen canvas:
      if (typeof OffscreenCanvas !== 'undefined') {
        const response = await fetch(url);
        const blobData = await response.blob();
        const bitmap = await createImageBitmap(blobData);
        
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // If options specify a clip area, apply it
          if (options.clipX !== undefined && options.clipY !== undefined) {
            // Draw a magnified section
            const sWidth = width / scale;
            const sHeight = height / scale;
            const sx = options.clipX - (sWidth / 2);
            const sy = options.clipY - (sHeight / 2);
            
            ctx.fillStyle = '#ffffff'; // Default background
            ctx.fillRect(0, 0, width, height);
            
            ctx.drawImage(bitmap, sx, sy, sWidth, sHeight, 0, 0, width, height);
            
            // Convert to blob and send back
            const outputBlob = await canvas.convertToBlob({ type: 'image/png' });
            self.postMessage({ id, blob: outputBlob });
          } else {
            // Render full SVG
            ctx.drawImage(bitmap, 0, 0, width, height);
            const outputBlob = await canvas.convertToBlob({ type: 'image/png' });
            self.postMessage({ id, blob: outputBlob });
          }
        } else {
           throw new Error("Could not get 2d context");
        }
      } else {
        throw new Error("OffscreenCanvas is not supported in this environment");
      }
      
      URL.revokeObjectURL(url);
    }
  } catch (error: any) {
    self.postMessage({ id, error: error.message });
  }
};
