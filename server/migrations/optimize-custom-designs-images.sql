-- Migration: Optimize custom design requests for image handling
-- Created: 2025-10-13
-- Purpose: Add indexes to improve performance for image-related queries

-- Add index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_custom_design_requests_status ON custom_design_requests(status);

-- Add index on created_at for faster date-based sorting  
CREATE INDEX IF NOT EXISTS idx_custom_design_requests_created_at ON custom_design_requests(created_at DESC);

-- Add index on user_id for faster user-specific queries
CREATE INDEX IF NOT EXISTS idx_custom_design_requests_user_id ON custom_design_requests(user_id);