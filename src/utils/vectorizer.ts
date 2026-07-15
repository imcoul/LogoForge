export function vectorizeImage(imageSrc: string): Promise<{ svg: string; nodes: any[] }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 300;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not get 2D canvas context"));
          return;
        }
        
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const pixels = imgData.data;
        
        // 1. Detect background
        let darkBgCount = 0;
        const cornerCoords = [
          { x: 0, y: 0 }, { x: w - 1, y: 0 },
          { x: 0, y: h - 1 }, { x: w - 1, y: h - 1 },
          { x: Math.floor(w / 2), y: 0 }, { x: 0, y: Math.floor(h / 2) }
        ];
        cornerCoords.forEach(p => {
          const idx = (p.y * w + p.x) * 4;
          const a = pixels[idx + 3];
          if (a >= 50) {
            const luma = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
            if (luma < 128) darkBgCount++;
          }
        });
        const isDarkBackground = darkBgCount > cornerCoords.length / 3;
        
        // 2. Build binary mask
        const grid: boolean[][] = Array.from({ length: h }, () => Array(w).fill(false));
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const a = pixels[idx + 3];
            
            if (a < 50) {
              grid[y][x] = false;
            } else {
              const luma = 0.299 * r + 0.587 * g + 0.114 * b;
              if (isDarkBackground) {
                grid[y][x] = luma >= 120; // light is foreground on dark bg
              } else {
                grid[y][x] = luma < 180; // dark is foreground on light bg
              }
            }
          }
        }
        
        // 3. Contour tracing
        const visited = new Set<string>();
        const contours: { points: [number, number][]; color: string }[] = [];
        
        const dirs = [
          [0, -1],  // 0: Up
          [1, -1],  // 1: Up-Right
          [1, 0],   // 2: Right
          [1, 1],   // 3: Down-Right
          [0, 1],   // 4: Down
          [-1, 1],  // 5: Down-Left
          [-1, 0],  // 6: Left
          [-1, -1]  // 7: Up-Left
        ];
        
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            if (grid[y][x] && !visited.has(`${x},${y}`)) {
              let isEdge = false;
              for (let d = 0; d < 8; d++) {
                const nx = x + dirs[d][0];
                const ny = y + dirs[d][1];
                if (!grid[ny] || !grid[ny][nx]) {
                  isEdge = true;
                  break;
                }
              }
              
              if (isEdge) {
                const points: [number, number][] = [];
                let cx = x;
                let cy = y;
                let px = x - 1;
                let py = y;
                
                const startX = x;
                const startY = y;
                let steps = 0;
                const maxSteps = 2500;
                
                const sIdx = (cy * w + cx) * 4;
                const sR = pixels[sIdx];
                const sG = pixels[sIdx + 1];
                const sB = pixels[sIdx + 2];
                const hexColor = "#" + [sR, sG, sB].map(c => c.toString(16).padStart(2, '0')).join('');
                
                while (steps < maxSteps) {
                  points.push([cx, cy]);
                  visited.add(`${cx},${cy}`);
                  
                  const dx = px - cx;
                  const dy = py - cy;
                  let backIdx = -1;
                  for (let d = 0; d < 8; d++) {
                    if (dirs[d][0] === dx && dirs[d][1] === dy) {
                      backIdx = d;
                      break;
                    }
                  }
                  
                  if (backIdx === -1) {
                    backIdx = 6;
                  }
                  
                  let foundNext = false;
                  for (let i = 1; i <= 8; i++) {
                    const idx = (backIdx + i) % 8;
                    const nx = cx + dirs[idx][0];
                    const ny = cy + dirs[idx][1];
                    
                    if (ny >= 0 && ny < h && nx >= 0 && nx < w && grid[ny][nx]) {
                      const bgIdx = (idx - 1 + 8) % 8;
                      px = cx + dirs[bgIdx][0];
                      py = cy + dirs[bgIdx][1];
                      cx = nx;
                      cy = ny;
                      foundNext = true;
                      break;
                    }
                  }
                  
                  if (!foundNext) {
                    break;
                  }
                  
                  if (cx === startX && cy === startY) {
                    break;
                  }
                  
                  steps++;
                }
                
                if (points.length >= 6) {
                  contours.push({ points, color: hexColor });
                }
              }
            }
          }
        }
        
        let svgPaths = "";
        const nodes: any[] = [];
        
        contours.forEach((c, index) => {
          const simplified = simplifyContour(c.points, 1.2);
          if (simplified.length < 3) return;
          
          let dAttr = `M ${simplified[0][0]},${simplified[0][1]}`;
          for (let i = 1; i < simplified.length; i++) {
            dAttr += ` L ${simplified[i][0]},${simplified[i][1]}`;
          }
          dAttr += " Z";
          
          svgPaths += `  <path d="${dAttr}" fill="${c.color}" stroke="none" />\n`;
          
          const newNode = {
            id: `trace-${Date.now()}-${index}`,
            type: 'path',
            transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 },
            style: {
              fill: c.color,
              stroke: 'none',
              opacity: 1
            },
            props: {
              pathData: dAttr
            },
            meta: {
              createdBy: 'AI Vectorizer',
              timestamp: new Date().toISOString()
            }
          };
          nodes.push(newNode);
        });
        
        const fullSvg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">\n${svgPaths}</svg>`;
        resolve({ svg: fullSvg, nodes });
        
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      reject(new Error("Failed to load image for vectorization. Please verify the URL or ensure the image source is valid."));
    };
    img.src = imageSrc;
  });
}

function simplifyContour(points: [number, number][], tolerance: number): [number, number][] {
  if (points.length <= 2) return points;

  let maxSqDist = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const sqDist = getSqSegDist(points[i], points[0], points[end]);
    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }

  if (maxSqDist > tolerance * tolerance) {
    const results1 = simplifyContour(points.slice(0, index + 1), tolerance);
    const results2 = simplifyContour(points.slice(index), tolerance);
    return results1.slice(0, results1.length - 1).concat(results2);
  }

  return [points[0], points[end]];
}

function getSqSegDist(p: [number, number], p1: [number, number], p2: [number, number]): number {
  let x = p1[0];
  let y = p1[1];
  let dx = p2[0] - x;
  let dy = p2[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2[0];
      y = p2[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}
