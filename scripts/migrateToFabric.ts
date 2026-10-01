#!/usr/bin/env node
// migrateToFabric.ts - Migration script for converting existing projects to Fabric.js
// Run with: npx ts-node scripts/migrateToFabric.ts

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Legacy sketch format from WhiteboardCanvas
 */
interface LegacySketch {
  id: string;
  name: string;
  path?: string;
  color?: string;
  strokeWidth?: number;
  type?: 'path' | 'rectangle' | 'circle' | 'line';
  props?: any;
  fillColor?: string;
  fillOpacity?: number;
  strokeDashArray?: string;
  locked?: boolean;
}

/**
 * Migrated canvas object (simplified for storage)
 */
interface MigratedObject {
  id: string;
  type: 'rect' | 'circle' | 'ellipse' | 'line' | 'path' | 'text' | 'textbox' | 'group' | 'image';
  left: number;
  top: number;
  width: number;
  height: number;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  visible?: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  path?: string;
  radius?: number;
  rx?: number;
  ry?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  text?: string;
  objects?: MigratedObject[];
  src?: string;
}

/**
 * Legacy project format
 */
interface LegacyProject {
  id: string;
  name: string;
  svgSource?: string;
  sceneGraph?: any[];
  whiteboardData?: {
    sketches: LegacySketch[];
    width: number;
    height: number;
    background?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Fabric project format
 */
interface FabricProject {
  id: string;
  name: string;
  svgSource?: string;
  sceneGraph?: any[];
  fabricData?: {
    objects: MigratedObject[];
    width: number;
    height: number;
    background?: string;
    zoom?: number;
    panX?: number;
    panY?: number;
  };
  createdAt: string;
  updatedAt: string;
  migrationVersion?: string;
  migratedAt?: string;
}

/**
 * Convert legacy sketch to migrated object
 */
function convertSketchToMigratedObject(sketch: LegacySketch): MigratedObject {
  const base: any = {
    id: sketch.id,
    type: mapSketchType(sketch.type),
    left: sketch.props?.x || 0,
    top: sketch.props?.y || 0,
    width: sketch.props?.width || 0,
    height: sketch.props?.height || 0,
    fill: sketch.fillColor || 'none',
    stroke: sketch.color || '#000000',
    strokeWidth: sketch.strokeWidth || 3,
    opacity: sketch.fillOpacity !== undefined ? sketch.fillOpacity : 1,
    visible: true,
  };

  switch (sketch.type) {
    case 'rectangle':
      return {
        ...base,
        type: 'rect' as const,
        rx: sketch.props?.rx || 0,
        ry: sketch.props?.ry || 0,
      };
    case 'circle':
      return {
        ...base,
        type: 'circle' as const,
        radius: Math.min(base.width, base.height) / 2,
      };
    case 'line':
      if (sketch.path) {
        const match = sketch.path.match(/M\s*([0-9.-]+),([0-9.-]+)\s*L\s*([0-9.-]+),([0-9.-]+)/);
        if (match) {
          return {
            ...base,
            type: 'line' as const,
            x1: parseFloat(match[1]),
            y1: parseFloat(match[2]),
            x2: parseFloat(match[3]),
            y2: parseFloat(match[4]),
          };
        }
      }
      return { ...base, type: 'line' as const, x1: 0, y1: 0, x2: 0, y2: 0 };
    case 'path':
    default:
      return {
        ...base,
        type: 'path' as const,
        path: sketch.path || '',
      };
  }
}

/**
 * Map sketch type to canvas object type
 */
function mapSketchType(type?: string): 'rect' | 'circle' | 'line' | 'path' {
  const map: Record<string, 'rect' | 'circle' | 'line' | 'path'> = {
    'rectangle': 'rect',
    'circle': 'circle',
    'line': 'line',
    'path': 'path',
  };
  return map[type || 'path'] || 'path';
}

/**
 * Parse SVG path string to extract simple shapes
 */
function parseSVGPath(path: string): MigratedObject[] {
  const objects: MigratedObject[] = [];
  
  const commands = path.split(/([A-Za-z])/).filter(Boolean);
  
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  let pathData = '';
  
  for (let i = 0; i < commands.length; i += 2) {
    const cmd = commands[i];
    const coords = commands[i + 1];
    
    if (!coords) continue;
    
    const parts = coords.trim().split(/[,\s]+/).filter(Boolean).map(Number);
    
    switch (cmd) {
      case 'M':
        currentX = parts[0] || 0;
        currentY = parts[1] || 0;
        startX = currentX;
        startY = currentY;
        pathData += `M ${currentX},${currentY}`;
        break;
      case 'L':
        currentX = parts[0] || 0;
        currentY = parts[1] || 0;
        pathData += ` L ${currentX},${currentY}`;
        break;
      case 'H':
        currentX = parts[0] || 0;
        pathData += ` L ${currentX},${currentY}`;
        break;
      case 'V':
        currentY = parts[0] || 0;
        pathData += ` L ${currentX},${currentY}`;
        break;
      case 'Z':
      case 'z':
        currentX = startX;
        currentY = startY;
        pathData += ' Z';
        break;
      default:
        pathData += ` ${cmd} ${coords}`;
    }
  }
  
  if (pathData) {
    objects.push({
      id: `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'path',
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      path: pathData,
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 2,
      opacity: 1,
      visible: true,
    });
  }
  
  return objects;
}

/**
 * Parse sceneGraph nodes to migrated objects
 */
function parseSceneGraph(sceneGraph: any[] = []): MigratedObject[] {
  const objects: MigratedObject[] = [];
  
  for (const node of sceneGraph) {
    switch (node.type) {
      case 'rect':
        objects.push({
          id: node.id,
          type: 'rect',
          left: node.transform?.x || 0,
          top: node.transform?.y || 0,
          width: node.props?.width || 0,
          height: node.props?.height || 0,
          fill: node.style?.fill || 'none',
          stroke: node.style?.stroke || 'none',
          strokeWidth: node.style?.stroke?.width || 0,
          opacity: node.style?.opacity || 1,
          visible: true,
        });
        break;
      case 'ellipse':
        objects.push({
          id: node.id,
          type: 'ellipse',
          left: node.transform?.x || 0,
          top: node.transform?.y || 0,
          width: (node.props?.rx || 0) * 2,
          height: (node.props?.ry || 0) * 2,
          rx: node.props?.rx || 0,
          ry: node.props?.ry || 0,
          fill: node.style?.fill || 'none',
          stroke: node.style?.stroke || 'none',
          strokeWidth: node.style?.stroke?.width || 0,
          opacity: node.style?.opacity || 1,
          visible: true,
        });
        break;
      case 'line':
        objects.push({
          id: node.id,
          type: 'line',
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          x1: node.props?.start?.x || 0,
          y1: node.props?.start?.y || 0,
          x2: node.props?.end?.x || 0,
          y2: node.props?.end?.y || 0,
          fill: 'none',
          stroke: node.style?.stroke || '#000000',
          strokeWidth: node.style?.stroke?.width || 2,
          opacity: node.style?.opacity || 1,
          visible: true,
        });
        break;
      case 'path':
        objects.push({
          id: node.id,
          type: 'path',
          left: node.transform?.x || 0,
          top: node.transform?.y || 0,
          width: 0,
          height: 0,
          path: node.props?.pathData || '',
          fill: node.style?.fill || 'none',
          stroke: node.style?.stroke || 'none',
          strokeWidth: node.style?.stroke?.width || 0,
          opacity: node.style?.opacity || 1,
          visible: true,
        });
        break;
    }
  }
  
  return objects;
}

/**
 * Migrate a single project from legacy format to Fabric format
 */
function migrateProject(legacyProject: LegacyProject): FabricProject {
  const migratedObjects: MigratedObject[] = [];
  
  // Migrate from whiteboardData if present
  if (legacyProject.whiteboardData?.sketches) {
    for (const sketch of legacyProject.whiteboardData.sketches) {
      migratedObjects.push(convertSketchToMigratedObject(sketch));
    }
  }
  
  // Migrate from sceneGraph if present
  if (legacyProject.sceneGraph) {
    migratedObjects.push(...parseSceneGraph(legacyProject.sceneGraph));
  }
  
  // Migrate from svgSource if present
  if (legacyProject.svgSource) {
    try {
      const svgMatch = legacyProject.svgSource.match(/<svg[^>]*>(.*?)<\/svg>/s);
      if (svgMatch) {
        const svgContent = svgMatch[1];
        const pathMatches = svgContent.matchAll(/<path[^>]*d="([^"]*)"[^>]*>/g);
        for (const match of pathMatches) {
          migratedObjects.push(...parseSVGPath(match[1]));
        }
      }
    } catch (e) {
      console.warn('Failed to parse SVG:', e);
    }
  }
  
  return {
    ...legacyProject,
    fabricData: {
      objects: migratedObjects,
      width: legacyProject.whiteboardData?.width || 800,
      height: legacyProject.whiteboardData?.height || 600,
      background: legacyProject.whiteboardData?.background || '#FFFFFF',
    },
    migrationVersion: '1.0.0',
    migratedAt: new Date().toISOString(),
  };
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Starting Fabric.js migration...\n');
  
  const projectsDir = join(__dirname, '..', 'data', 'projects');
  const backupDir = join(__dirname, '..', 'data', 'backups');
  
  if (!existsSync(projectsDir)) {
    console.error('❌ Projects directory not found:', projectsDir);
    process.exit(1);
  }
  
  if (!existsSync(backupDir)) {
    console.log('📁 Creating backup directory:', backupDir);
  }
  
  const projectFiles = readdirSync(projectsDir).filter(f => f.endsWith('.json'));
  
  console.log(`📊 Found ${projectFiles.length} project files to migrate\n`);
  
  let migratedCount = 0;
  let errorCount = 0;
  
  for (const file of projectFiles) {
    const filePath = join(projectsDir, file);
    
    try {
      console.log(`🔄 Migrating: ${file}`);
      
      const content = readFileSync(filePath, 'utf-8');
      const legacyProject: LegacyProject = JSON.parse(content);
      
      const backupPath = join(backupDir, `${file}.backup-${Date.now()}.json`);
      writeFileSync(backupPath, content);
      console.log(`  ✅ Backup created: ${backupPath}`);
      
      const fabricProject = migrateProject(legacyProject);
      
      writeFileSync(filePath, JSON.stringify(fabricProject, null, 2));
      console.log(`  ✅ Migrated: ${fabricProject.fabricData?.objects.length || 0} objects`);
      
      migratedCount++;
    } catch (error) {
      console.error(`  ❌ Error migrating ${file}:`, error);
      errorCount++;
    }
    
    console.log('');
  }
  
  console.log('📈 Migration Summary:');
  console.log(`  ✅ Successfully migrated: ${migratedCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📊 Total: ${projectFiles.length}\n`);
  
  if (errorCount > 0) {
    console.warn('⚠️  Some projects failed to migrate. Check backups in:', backupDir);
    process.exit(1);
  }
  
  console.log('🎉 Migration complete!');
}

main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
