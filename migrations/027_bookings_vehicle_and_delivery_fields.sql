-- Migration: Add vehicle selection + delivery-time capture to bookings
-- Purpose: Booking selects an agency vehicle; final delivered liters + amount are captured at delivery time.
-- Date: 2026

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS vehicle_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'bookings'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'bookings_vehicle_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_vehicle_id_fkey
      FOREIGN KEY (vehicle_id)
      REFERENCES public.vehicles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON public.bookings(vehicle_id);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS delivered_tanker_liters integer NULL,
  ADD COLUMN IF NOT EXISTS delivered_amount numeric NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_delivered_tanker_liters_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_delivered_tanker_liters_check
      CHECK (delivered_tanker_liters IS NULL OR delivered_tanker_liters > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_delivered_amount_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_delivered_amount_check
      CHECK (delivered_amount IS NULL OR delivered_amount >= 0);
  END IF;
END $$;

