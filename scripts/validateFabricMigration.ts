#!/usr/bin/env node
// validateFabricMigration.ts - Validate Fabric.js migration results
// Run with: npx ts-node scripts/validateFabricMigration.ts

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

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

interface FabricProject {
  id: string;
  name: string;
  fabricData?: {
    objects: MigratedObject[];
    width: number;
    height: number;
    background?: string;
    zoom?: number;
    panX?: number;
    panY?: number;
  };
  migrationVersion?: string;
  migratedAt?: string;
}

interface ValidationResult {
  valid: boolean;
  file: string;
  errors: string[];
  warnings: string[];
  objectCount: number;
  types: Record<string, number>;
}

function validateProject(filePath: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    file: filePath,
    errors: [],
    warnings: [],
    objectCount: 0,
    types: {},
  };
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const project: FabricProject = JSON.parse(content);
    
    if (!project.fabricData) {
      result.warnings.push('No fabricData found - project may not be migrated');
      return result;
    }
    
    if (!project.migrationVersion) {
      result.warnings.push('No migrationVersion found');
    }
    
    if (!project.migratedAt) {
      result.warnings.push('No migratedAt timestamp found');
    }
    
    const objects = project.fabricData.objects || [];
    result.objectCount = objects.length;
    
    for (const obj of objects) {
      if (!result.types[obj.type]) {
        result.types[obj.type] = 0;
      }
      result.types[obj.type]++;
      
      if (!obj.id) {
        result.errors.push(`Object missing id`);
      }
      
      if (obj.type === 'rect') {
        if (obj.rx === undefined || obj.ry === undefined) {
          result.warnings.push(`Rect object ${obj.id} missing rx/ry`);
        }
      }
      
      if (obj.type === 'circle') {
        if (obj.radius === undefined) {
          result.errors.push(`Circle object ${obj.id} missing radius`);
        }
      }
      
      if (obj.type === 'ellipse') {
        if (obj.rx === undefined || obj.ry === undefined) {
          result.errors.push(`Ellipse object ${obj.id} missing rx/ry`);
        }
      }
      
      if (obj.type === 'line') {
        const lineObj = obj as any;
        if (lineObj.x1 === undefined || lineObj.y1 === undefined || 
            lineObj.x2 === undefined || lineObj.y2 === undefined) {
          result.errors.push(`Line object ${obj.id} missing coordinates`);
        }
      }
      
      if (obj.type === 'path') {
        const pathObj = obj as any;
        if (!pathObj.path) {
          result.errors.push(`Path object ${obj.id} missing path data`);
        }
      }
    }
    
    if (project.fabricData.width <= 0) {
      result.errors.push('Invalid canvas width');
    }
    
    if (project.fabricData.height <= 0) {
      result.errors.push('Invalid canvas height');
    }
    
    result.valid = result.errors.length === 0;
    
  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to read/parse file: ${error}`);
  }
  
  return result;
}

function printResults(results: ValidationResult[]) {
  console.log('📋 Fabric.js Migration Validation Report\n');
  console.log('='.repeat(60));
  
  let totalValid = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalObjects = 0;
  const allTypes: Record<string, number> = {};
  
  for (const result of results) {
    console.log(`\n📄 ${result.file}`);
    console.log(`  Objects: ${result.objectCount}`);
    
    if (result.valid) {
      console.log(`  ✅ Valid`);
      totalValid++;
    } else {
      console.log(`  ❌ Invalid (${result.errors.length} errors)`);
      totalErrors += result.errors.length;
    }
    
    if (result.warnings.length > 0) {
      console.log(`  ⚠️  ${result.warnings.length} warnings`);
      totalWarnings += result.warnings.length;
    }
    
    for (const type of Object.keys(result.types)) {
      allTypes[type] = (allTypes[type] || 0) + result.types[type];
      totalObjects += result.types[type];
    }
    
    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.log(`    - ${error}`);
      }
    }
    
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        console.log(`    - ${warning}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`  Total files: ${results.length}`);
  console.log(`  ✅ Valid: ${totalValid}`);
  console.log(`  ❌ Invalid: ${results.length - totalValid}`);
  console.log(`  ⚠️  Total warnings: ${totalWarnings}`);
  console.log(`  📦 Total objects: ${totalObjects}`);
  
  console.log('\n📊 Object Types:');
  for (const type of Object.keys(allTypes)) {
    console.log(`  ${type}: ${allTypes[type]}`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('🎉 All validations passed!');
    return true;
  } else if (totalErrors === 0) {
    console.log('✅ All validations passed with warnings');
    return true;
  } else {
    console.log('❌ Validation failed');
    return false;
  }
}

async function main() {
  console.log('🔍 Validating Fabric.js migration...\n');
  
  const projectsDir = join(__dirname, '..', 'data', 'projects');
  
  if (!existsSync(projectsDir)) {
    console.error('❌ Projects directory not found:', projectsDir);
    process.exit(1);
  }
  
  const projectFiles = readdirSync(projectsDir).filter(f => f.endsWith('.json'));
  
  console.log(`📊 Found ${projectFiles.length} project files to validate\n`);
  
  const results: ValidationResult[] = [];
  
  for (const file of projectFiles) {
    const filePath = join(projectsDir, file);
    console.log(`🔍 Validating: ${file}`);
    
    const result = validateProject(filePath);
    results.push(result);
  }
  
  const allValid = printResults(results);
  
  if (!allValid) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
