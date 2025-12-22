-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_reviews_workspace_id ON reviews(workspace_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Create composite index for workspace reviews ordered by date
CREATE INDEX idx_reviews_workspace_created ON reviews(workspace_id, created_at DESC);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read approved reviews
CREATE POLICY "Anyone can read reviews"
  ON reviews
  FOR SELECT
  USING (true);

-- Authenticated users can insert their own reviews
CREATE POLICY "Users can create reviews"
  ON reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON reviews
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update workspace rating when reviews change
CREATE OR REPLACE FUNCTION update_workspace_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the workspace's overall_rating and total_reviews
  UPDATE workspaces
  SET 
    overall_rating = (
      SELECT AVG(rating)::NUMERIC(3,2)
      FROM reviews
      WHERE workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id)
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id)
    )
  WHERE id = COALESCE(NEW.workspace_id, OLD.workspace_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update workspace rating
DROP TRIGGER IF EXISTS trigger_update_workspace_rating ON reviews;
CREATE TRIGGER trigger_update_workspace_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_workspace_rating();

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_reviews_updated_at ON reviews;
CREATE TRIGGER trigger_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
