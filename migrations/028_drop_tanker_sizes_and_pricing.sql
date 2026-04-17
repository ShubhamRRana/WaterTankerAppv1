-- Migration: Drop unused pricing configuration tables
-- Purpose: Pricing and tanker size configs are captured manually at delivery; app no longer depends on these tables.
-- Date: 2026

DROP TABLE IF EXISTS public.tanker_sizes;
DROP TABLE IF EXISTS public.pricing;

