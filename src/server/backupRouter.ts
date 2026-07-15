import { Router, Request, Response } from "express";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const router = Router();
const { Pool } = pg;

// Helper to convert project data for PG
function formatProjectData(p: any) {
  return [
    p.id,
    p.ownerId || "local",
    p.name || "Untitled Brand",
    p.createdAt || Date.now(),
    p.updatedAt || Date.now(),
    p.archived || false,
    p.stage || "discovery",
    p.logoUrl || null,
    p.logoMimeType || "image/png",
    p.svgSource || null,
    p.description || "",
    p.brandGuide ? JSON.stringify(p.brandGuide) : null,
    p.sonicPhilosophy || null,
    p.competitorAnalysis || null,
    p.ecosystemAssets ? JSON.stringify(p.ecosystemAssets) : "[]",
    p.sceneGraph ? (typeof p.sceneGraph === 'string' ? p.sceneGraph : JSON.stringify(p.sceneGraph)) : "[]",
    p.sceneHistory ? (typeof p.sceneHistory === 'string' ? p.sceneHistory : JSON.stringify(p.sceneHistory)) : "[]",
    typeof p.sceneHistoryIndex === 'number' ? p.sceneHistoryIndex : 0,
    p.comments ? JSON.stringify(p.comments) : "[]",
    p.mockups ? JSON.stringify(p.mockups) : "[]",
    p.logoHistory ? JSON.stringify(p.logoHistory) : "[]",
    p.snapshots ? JSON.stringify(p.snapshots) : "[]",
    p.stickyNotes ? JSON.stringify(p.stickyNotes) : "[]",
    p.whiteboardSketches ? JSON.stringify(p.whiteboardSketches) : "[]",
    p.driveFileId || null,
    p.tags ? JSON.stringify(p.tags) : "[]",
    p.sonicAssets ? JSON.stringify(p.sonicAssets) : "[]",
    p.refinementFiles ? JSON.stringify(p.refinementFiles) : "[]",
    p.refinementSuggestions ? JSON.stringify(p.refinementSuggestions) : null,
  ];
}

// Check configuration status
router.get("/status", (req: Request, res: Response) => {
  res.json({
    hasPostgres: !!process.env.DATABASE_URL,
    hasSupabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLIC_KEY),
  });
});

// Sync to PostgreSQL
router.post("/postgres", async (req: Request, res: Response) => {
  const { project, customConnectionString } = req.body;
  const connectionString = customConnectionString || process.env.DATABASE_URL;

  if (!project || !project.id) {
    return res.status(400).json({ error: "Missing valid project data." });
  }

  if (!connectionString) {
    return res.status(400).json({ error: "PostgreSQL database connection is not configured." });
  }

  const pool = new Pool({ connectionString });

  try {
    const client = await pool.connect();
    try {
      // 1. Create table if not exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id VARCHAR(128) PRIMARY KEY,
          owner_id VARCHAR(128),
          name VARCHAR(255) NOT NULL,
          created_at BIGINT,
          updated_at BIGINT,
          archived BOOLEAN DEFAULT FALSE,
          stage VARCHAR(50),
          logo_url TEXT,
          logo_mime_type VARCHAR(50),
          svg_source TEXT,
          description TEXT,
          brand_guide TEXT,
          sonic_philosophy TEXT,
          competitor_analysis TEXT,
          ecosystem_assets TEXT,
          scene_graph TEXT,
          scene_history TEXT,
          scene_history_index INTEGER,
          comments TEXT,
          mockups TEXT,
          logo_history TEXT,
          snapshots TEXT,
          sticky_notes TEXT,
          whiteboard_sketches TEXT,
          drive_file_id VARCHAR(128),
          tags TEXT,
          sonic_assets TEXT,
          refinement_files TEXT,
          refinement_suggestions TEXT
        );
      `);

      // 2. Upsert project
      const values = formatProjectData(project);
      await client.query(`
        INSERT INTO projects (
          id, owner_id, name, created_at, updated_at, archived, stage, logo_url, logo_mime_type, svg_source, description, brand_guide, sonic_philosophy, competitor_analysis, ecosystem_assets, scene_graph, scene_history, scene_history_index, comments, mockups, logo_history, snapshots, sticky_notes, whiteboard_sketches, drive_file_id, tags, sonic_assets, refinement_files, refinement_suggestions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
        ON CONFLICT (id) DO UPDATE SET
          owner_id = EXCLUDED.owner_id,
          name = EXCLUDED.name,
          updated_at = EXCLUDED.updated_at,
          archived = EXCLUDED.archived,
          stage = EXCLUDED.stage,
          logo_url = EXCLUDED.logo_url,
          logo_mime_type = EXCLUDED.logo_mime_type,
          svg_source = EXCLUDED.svg_source,
          description = EXCLUDED.description,
          brand_guide = EXCLUDED.brand_guide,
          sonic_philosophy = EXCLUDED.sonic_philosophy,
          competitor_analysis = EXCLUDED.competitor_analysis,
          ecosystem_assets = EXCLUDED.ecosystem_assets,
          scene_graph = EXCLUDED.scene_graph,
          scene_history = EXCLUDED.scene_history,
          scene_history_index = EXCLUDED.scene_history_index,
          comments = EXCLUDED.comments,
          mockups = EXCLUDED.mockups,
          logo_history = EXCLUDED.logo_history,
          snapshots = EXCLUDED.snapshots,
          sticky_notes = EXCLUDED.sticky_notes,
          whiteboard_sketches = EXCLUDED.whiteboard_sketches,
          drive_file_id = EXCLUDED.drive_file_id,
          tags = EXCLUDED.tags,
          sonic_assets = EXCLUDED.sonic_assets,
          refinement_files = EXCLUDED.refinement_files,
          refinement_suggestions = EXCLUDED.refinement_suggestions;
      `, values);

      res.json({ success: true, message: "Successfully synced project to PostgreSQL backup!" });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Postgres backup failure: ", err);
    res.status(500).json({ error: err.message || "Failed to sync to PostgreSQL database." });
  } finally {
    await pool.end();
  }
});

// Sync to Supabase
router.post("/supabase", async (req: Request, res: Response) => {
  const { project, customUrl, customKey } = req.body;
  const url = customUrl || process.env.SUPABASE_URL;
  const key = customKey || process.env.SUPABASE_PUBLIC_KEY;

  if (!project || !project.id) {
    return res.status(400).json({ error: "Missing valid project data." });
  }

  if (!url || !key) {
    return res.status(400).json({ error: "Supabase URL or Public Key is not configured." });
  }

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false }
    });

    // Supabase works with tables. We try to insert/upsert.
    // Forgel projects can be serialized into a single row.
    const { error } = await supabase
      .from("projects")
      .upsert({
        id: project.id,
        owner_id: project.ownerId || "local",
        name: project.name || "Untitled Brand",
        created_at: project.createdAt || Date.now(),
        updated_at: project.updatedAt || Date.now(),
        archived: project.archived || false,
        stage: project.stage || "discovery",
        logo_url: project.logoUrl || null,
        logo_mime_type: project.logoMimeType || "image/png",
        svg_source: project.svgSource || null,
        description: project.description || "",
        brand_guide: project.brandGuide ? JSON.stringify(project.brandGuide) : null,
        sonic_philosophy: project.sonicPhilosophy || null,
        competitor_analysis: project.competitorAnalysis || null,
        ecosystem_assets: project.ecosystemAssets ? JSON.stringify(project.ecosystemAssets) : "[]",
        scene_graph: project.sceneGraph ? (typeof project.sceneGraph === 'string' ? project.sceneGraph : JSON.stringify(project.sceneGraph)) : "[]",
        scene_history: project.sceneHistory ? (typeof project.sceneHistory === 'string' ? project.sceneHistory : JSON.stringify(project.sceneHistory)) : "[]",
        scene_history_index: typeof project.sceneHistoryIndex === 'number' ? project.sceneHistoryIndex : 0,
        comments: project.comments ? JSON.stringify(project.comments) : "[]",
        mockups: project.mockups ? JSON.stringify(project.mockups) : "[]",
        logo_history: project.logoHistory ? JSON.stringify(project.logoHistory) : "[]",
        snapshots: project.snapshots ? JSON.stringify(project.snapshots) : "[]",
        sticky_notes: project.stickyNotes ? JSON.stringify(project.stickyNotes) : "[]",
        whiteboard_sketches: project.whiteboardSketches ? JSON.stringify(project.whiteboardSketches) : "[]",
        drive_file_id: project.driveFileId || null,
        tags: project.tags ? JSON.stringify(project.tags) : "[]",
        sonic_assets: project.sonicAssets ? JSON.stringify(project.sonicAssets) : "[]",
        refinement_files: project.refinementFiles ? JSON.stringify(project.refinementFiles) : "[]",
        refinement_suggestions: project.refinementSuggestions ? JSON.stringify(project.refinementSuggestions) : null
      }, { onConflict: "id" });

    if (error) {
      // If table projects doesn't exist, Supabase might fail. We should notify.
      if (error.code === "PGRST116" || error.message.includes("does not exist")) {
        throw new Error(
          "Table 'projects' does not exist in your Supabase database. Please create it with columns: id (text PRIMARY KEY), owner_id (text), name (text), created_at (int8), updated_at (int8), archived (bool), stage (text), logo_url (text), logo_mime_type (text), svg_source (text), description (text), brand_guide (text), sonic_philosophy (text), competitor_analysis (text), ecosystem_assets (text), scene_graph (text), scene_history (text), scene_history_index (int4), comments (text), mockups (text), logo_history (text), snapshots (text), sticky_notes (text), whiteboard_sketches (text), drive_file_id (text), tags (text), sonic_assets (text), refinement_files (text), refinement_suggestions (text)."
        );
      }
      throw error;
    }

    res.json({ success: true, message: "Successfully synced project to Supabase backup!" });
  } catch (err: any) {
    console.error("Supabase backup failure: ", err);
    res.status(500).json({ error: err.message || "Failed to sync to Supabase database." });
  }
});

export default router;
