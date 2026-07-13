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
    p.stage || "discovery",
    p.logoUrl || null,
    p.logoMimeType || "image/png",
    p.svgSource || null,
    p.description || "",
    p.brandGuide ? JSON.stringify(p.brandGuide) : null,
    p.sonicPhilosophy || null,
    p.competitorAnalysis || null,
    p.ecosystemAssets ? JSON.stringify(p.ecosystemAssets) : "[]",
    p.comments ? JSON.stringify(p.comments) : "[]",
    p.mockups ? JSON.stringify(p.mockups) : "[]",
    p.snapshots ? JSON.stringify(p.snapshots) : "[]",
    p.stickyNotes ? JSON.stringify(p.stickyNotes) : "[]",
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
          stage VARCHAR(50),
          logo_url TEXT,
          logo_mime_type VARCHAR(50),
          svg_source TEXT,
          description TEXT,
          brand_guide TEXT,
          sonic_philosophy TEXT,
          competitor_analysis TEXT,
          ecosystem_assets TEXT,
          comments TEXT,
          mockups TEXT,
          snapshots TEXT,
          sticky_notes TEXT
        );
      `);

      // 2. Upsert project
      const values = formatProjectData(project);
      await client.query(`
        INSERT INTO projects (
          id, owner_id, name, created_at, updated_at, stage, logo_url, logo_mime_type, svg_source, description, brand_guide, sonic_philosophy, competitor_analysis, ecosystem_assets, comments, mockups, snapshots, sticky_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          owner_id = EXCLUDED.owner_id,
          name = EXCLUDED.name,
          updated_at = EXCLUDED.updated_at,
          stage = EXCLUDED.stage,
          logo_url = EXCLUDED.logo_url,
          logo_mime_type = EXCLUDED.logo_mime_type,
          svg_source = EXCLUDED.svg_source,
          description = EXCLUDED.description,
          brand_guide = EXCLUDED.brand_guide,
          sonic_philosophy = EXCLUDED.sonic_philosophy,
          competitor_analysis = EXCLUDED.competitor_analysis,
          ecosystem_assets = EXCLUDED.ecosystem_assets,
          comments = EXCLUDED.comments,
          mockups = EXCLUDED.mockups,
          snapshots = EXCLUDED.snapshots,
          sticky_notes = EXCLUDED.sticky_notes;
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
        stage: project.stage || "discovery",
        logo_url: project.logoUrl || null,
        logo_mime_type: project.logoMimeType || "image/png",
        svg_source: project.svgSource || null,
        description: project.description || "",
        brand_guide: project.brandGuide ? JSON.stringify(project.brandGuide) : null,
        sonic_philosophy: project.sonicPhilosophy || null,
        competitor_analysis: project.competitorAnalysis || null,
        ecosystem_assets: project.ecosystemAssets ? JSON.stringify(project.ecosystemAssets) : "[]",
        comments: project.comments ? JSON.stringify(project.comments) : "[]",
        mockups: project.mockups ? JSON.stringify(project.mockups) : "[]",
        snapshots: project.snapshots ? JSON.stringify(project.snapshots) : "[]",
        sticky_notes: project.stickyNotes ? JSON.stringify(project.stickyNotes) : "[]"
      }, { onConflict: "id" });

    if (error) {
      // If table projects doesn't exist, Supabase might fail. We should notify.
      if (error.code === "PGRST116" || error.message.includes("does not exist")) {
        throw new Error(
          "Table 'projects' does not exist in your Supabase database. Please create it with columns: id (text PRIMARY KEY), owner_id (text), name (text), created_at (int8), updated_at (int8), stage (text), logo_url (text), logo_mime_type (text), svg_source (text), description (text), brand_guide (text), sonic_philosophy (text), competitor_analysis (text), ecosystem_assets (text), comments (text), mockups (text), snapshots (text), sticky_notes (text)."
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
