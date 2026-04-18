-- Track version history
-- Each row is one uploaded audio file for a track.
-- Exactly one row per track_id should have is_active = true at any time (enforced in app logic).

CREATE TABLE track_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id       uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  file_path      text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  is_active      boolean NOT NULL DEFAULT false,

  CONSTRAINT track_versions_unique_version UNIQUE (track_id, version_number)
);

-- Index for fetching all versions of a track ordered by version_number
CREATE INDEX track_versions_track_id_idx ON track_versions (track_id, version_number DESC);

ALTER TABLE track_versions ENABLE ROW LEVEL SECURITY;

-- Users can read versions of tracks they own
CREATE POLICY "versions_select" ON track_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tracks
      WHERE tracks.id = track_versions.track_id
        AND tracks.user_id = auth.uid()
    )
  );

-- Users can insert versions for tracks they own
CREATE POLICY "versions_insert" ON track_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tracks
      WHERE tracks.id = track_versions.track_id
        AND tracks.user_id = auth.uid()
    )
  );

-- Users can update versions (activate/deactivate) for tracks they own
CREATE POLICY "versions_update" ON track_versions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tracks
      WHERE tracks.id = track_versions.track_id
        AND tracks.user_id = auth.uid()
    )
  );
