-- Migration: Add reference_links column to custom_design_requests
ALTER TABLE custom_design_requests ADD COLUMN reference_links json DEFAULT '[]';
