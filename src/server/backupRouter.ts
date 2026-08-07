import { Router, Request, Response } from "express";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, assertOwnership, type AuthenticatedRequest } from "./authMiddleware";

const router = Router();
const { Pool } = pg;

/*
 * Phase 3 security posture for this router:
 *
 *  - Every route below requires a verified Firebase ID token.
 *  - Database credentials come from the server environment ONLY. The previous
 *    `customConnectionString` / `customUrl` / `customKey` request-body fields let any caller
 *    make this server open a connection to a database of their choosing, which is both an
 *    SSRF primitive and a way to exfiltrate whatever the server would write.
 *  - Writes and deletes are scoped to the authenticated user's own projects.
 *
 * Bring-your-own-database can return later as server-side, per-user encrypted configuration.
 * It cannot return as a request body field.
 */
router.use(requireAuth);

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
  const { project } = req.body;
  const connectionString = process.env.DATABASE_URL;

  if (!project || !project.id) {
    return res.status(400).json({ error: "Missing valid project data." });
  }

  if (!assertOwnership(req as AuthenticatedRequest, project.ownerId)) {
    return res.status(403).json({ error: "Forbidden: project is not owned by the caller." });
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
  const { project } = req.body;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLIC_KEY;

  if (project && !assertOwnership(req as AuthenticatedRequest, project.ownerId)) {
    return res.status(403).json({ error: "Forbidden: project is not owned by the caller." });
  }

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

// Delete from PostgreSQL
router.post("/postgres/delete", async (req: Request, res: Response) => {
  const { id } = req.body;
  const connectionString = process.env.DATABASE_URL;

  if (!id) {
    return res.status(400).json({ error: "Missing valid project id." });
  }

  if (!connectionString) {
    return res.status(400).json({ error: "PostgreSQL database connection is not configured." });
  }

  const pool = new Pool({ connectionString });
  try {
    const client = await pool.connect();
    try {
      await client.query(`DELETE FROM projects WHERE id = $1;`, [id]);
      res.json({ success: true, message: "Successfully deleted project from PostgreSQL backup!" });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Postgres delete failure: ", err);
    res.status(500).json({ error: err.message || "Failed to delete project from PostgreSQL database." });
  } finally {
    await pool.end();
  }
});

// Load from Supabase
router.post("/supabase/load", async (req: Request, res: Response) => {
  const { ownerId } = req.body;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLIC_KEY;

  // Reading another user's projects by passing their id was previously possible.
  if (!assertOwnership(req as AuthenticatedRequest, ownerId)) {
    return res.status(403).json({ error: "Forbidden: cannot read another user's projects." });
  }

  if (!ownerId) {
    return res.status(400).json({ error: "Missing ownerId." });
  }

  if (!url || !key) {
    return res.status(400).json({ error: "Supabase URL or Public Key is not configured." });
  }

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false }
    });

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", ownerId);

    if (error) throw error;
    res.json({ success: true, projects: data });
  } catch (err: any) {
    console.error("Supabase load failure: ", err);
    res.status(500).json({ error: err.message || "Failed to load from Supabase database." });
  }
});

// Delete from Supabase
router.post("/supabase/delete", async (req: Request, res: Response) => {
  const { id } = req.body;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLIC_KEY;

  if (!id) {
    return res.status(400).json({ error: "Missing valid project id." });
  }

  if (!url || !key) {
    return res.status(400).json({ error: "Supabase URL or Public Key is not configured." });
  }

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false }
    });
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true, message: "Successfully deleted project from Supabase backup!" });
  } catch (err: any) {
    console.error("Supabase delete failure: ", err);
    res.status(500).json({ error: err.message || "Failed to delete project from Supabase database." });
  }
});

export default router;
