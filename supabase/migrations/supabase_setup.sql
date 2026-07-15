-- Supabase SQL Schema for Forgel Brand Operating System
-- Copy and paste this script directly into the SQL Editor in your Supabase Dashboard to provision the required schema.

-- 1. Create the projects table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(128) PRIMARY KEY,
    owner_id VARCHAR(128),
    name VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    archived BOOLEAN DEFAULT FALSE,
    stage VARCHAR(50) DEFAULT 'discovery',
    logo_url TEXT,
    logo_mime_type VARCHAR(50) DEFAULT 'image/png',
    svg_source TEXT,
    description TEXT,
    brand_guide TEXT,                -- Serialized JSON object
    sonic_philosophy TEXT,
    competitor_analysis TEXT,
    ecosystem_assets TEXT DEFAULT '[]', -- Serialized JSON array
    scene_graph TEXT DEFAULT '[]',      -- Serialized JSON array of canvas elements/nodes
    scene_history TEXT DEFAULT '[]',    -- Serialized JSON array of undo/redo states
    scene_history_index INTEGER DEFAULT 0,
    comments TEXT DEFAULT '[]',         -- Serialized JSON array of comments
    mockups TEXT DEFAULT '[]',          -- Serialized JSON array of mockups
    logo_history TEXT DEFAULT '[]',     -- Serialized JSON array of logo history svgs
    snapshots TEXT DEFAULT '[]',        -- Serialized JSON array of snapshots
    sticky_notes TEXT DEFAULT '[]',     -- Serialized JSON array of whiteboard sticky notes
    whiteboard_sketches TEXT DEFAULT '[]', -- Serialized JSON array of whiteboard drawings/paths
    drive_file_id VARCHAR(128),
    tags TEXT DEFAULT '[]',             -- Serialized JSON array of strings
    sonic_assets TEXT DEFAULT '[]',     -- Serialized JSON array of audio tracks
    refinement_files TEXT DEFAULT '[]', -- Serialized JSON array of asset variations
    refinement_suggestions TEXT         -- Serialized JSON object
);

-- 2. Create index on owner_id for high-performance queries
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for secure data isolation
-- Policy to allow authenticated users to perform all operations on their own projects
CREATE POLICY "Users can manage their own projects" 
ON projects 
FOR ALL 
TO authenticated 
USING (auth.uid()::text = owner_id) 
WITH CHECK (auth.uid()::text = owner_id);

-- Policy to allow local session fallbacks or service roles to bypass if needed
-- (Note: Adjust to your authentication setup if using Supabase Auth natively)
CREATE POLICY "Allow public inserts for local accounts" 
ON projects 
FOR ALL 
TO anon, authenticated
USING (owner_id = 'local' OR auth.uid()::text = owner_id)
WITH CHECK (owner_id = 'local' OR auth.uid()::text = owner_id);

COMMENT ON TABLE projects IS 'Stores the serialized full state of Forgel brand projects, fully mirrored from Firestore.';
