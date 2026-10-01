#!/usr/bin/env node
// rollbackFabricMigration.ts - Rollback Fabric.js migration
// Run with: npx ts-node scripts/rollbackFabricMigration.ts

import { readFileSync, writeFileSync, existsSync, readdirSync, copyFileSync } from 'fs';
import { join } from 'path';

interface FabricProject {
  id: string;
  name: string;
  svgSource?: string;
  sceneGraph?: any[];
  fabricData?: any;
  createdAt: string;
  updatedAt: string;
  migrationVersion?: string;
  migratedAt?: string;
}

interface LegacyProject {
  id: string;
  name: string;
  svgSource?: string;
  sceneGraph?: any[];
  whiteboardData?: any;
  createdAt: string;
  updatedAt: string;
}

function rollbackProject(fabricProject: FabricProject): LegacyProject {
  const legacyProject: any = {
    ...fabricProject,
  };
  
  delete legacyProject.fabricData;
  delete legacyProject.migrationVersion;
  delete legacyProject.migratedAt;
  
  return legacyProject;
}

async function main() {
  console.log('🔙 Rolling back Fabric.js migration...\n');
  
  const projectsDir = join(__dirname, '..', 'data', 'projects');
  const backupDir = join(__dirname, '..', 'data', 'backups');
  
  if (!existsSync(projectsDir)) {
    console.error('❌ Projects directory not found:', projectsDir);
    process.exit(1);
  }
  
  const projectFiles = readdirSync(projectsDir).filter(f => f.endsWith('.json'));
  
  console.log(`📊 Found ${projectFiles.length} project files\n`);
  
  let rolledBackCount = 0;
  let errorCount = 0;
  
  for (const file of projectFiles) {
    const filePath = join(projectsDir, file);
    
    try {
      console.log(`🔙 Rolling back: ${file}`);
      
      const content = readFileSync(filePath, 'utf-8');
      const project: FabricProject = JSON.parse(content);
      
      if (!project.migrationVersion) {
        console.log(`  ⏭️  Skipped (not migrated): ${file}`);
        continue;
      }
      
      // Try to restore from backup
      const backupFiles = readdirSync(backupDir).filter(f => f.startsWith(file));
      if (backupFiles.length > 0) {
        const backupPath = join(backupDir, backupFiles[0]);
        copyFileSync(backupPath, filePath);
        console.log(`  ✅ Restored from backup: ${backupFiles[0]}`);
      } else {
        const legacyProject = rollbackProject(project);
        writeFileSync(filePath, JSON.stringify(legacyProject, null, 2));
        console.log(`  ✅ Rolled back: ${file}`);
      }
      
      rolledBackCount++;
    } catch (error) {
      console.error(`  ❌ Error rolling back ${file}:`, error);
      errorCount++;
    }
    
    console.log('');
  }
  
  console.log('📈 Rollback Summary:');
  console.log(`  ✅ Successfully rolled back: ${rolledBackCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📊 Total: ${projectFiles.length}\n`);
  
  if (errorCount > 0) {
    console.warn('⚠️  Some projects failed to rollback. Check backups in:', backupDir);
    process.exit(1);
  }
  
  console.log('🎉 Rollback complete!');
}

main().catch(error => {
  console.error('❌ Rollback failed:', error);
  process.exit(1);
});
