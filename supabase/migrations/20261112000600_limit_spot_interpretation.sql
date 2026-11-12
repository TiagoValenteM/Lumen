BEGIN;

CREATE TABLE lumen_private.spot_interpretation_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  hits integer NOT NULL CHECK (hits BETWEEN 1 AND 4)
);

CREATE TABLE lumen_private.spot_interpretation_daily_total (
  singleton boolean PRIMARY KEY CHECK (singleton),
  day date NOT NULL,
  hits integer NOT NULL CHECK (hits BETWEEN 1 AND 15)
);

CREATE FUNCTION public.take_spot_interpretation_slot(requester uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  today date := (clock_timestamp() AT TIME ZONE 'UTC')::date;
BEGIN
  -- Serialize quota checks; there is only one shared counter per installation.
  PERFORM pg_advisory_xact_lock(72143, 1);
  IF EXISTS (SELECT 1 FROM lumen_private.spot_interpretation_daily_total WHERE day = today AND hits >= 15)
    THEN RETURN false;
  END IF;

  INSERT INTO lumen_private.spot_interpretation_limits AS limits (user_id, day, hits)
  VALUES (requester, today, 1)
  ON CONFLICT (user_id) DO UPDATE SET day = today,
    hits = CASE WHEN limits.day < today THEN 1 ELSE limits.hits + 1 END
  WHERE limits.day < today OR (limits.day = today AND limits.hits < 4);
  IF NOT FOUND THEN RETURN false; END IF;

  INSERT INTO lumen_private.spot_interpretation_daily_total AS total (singleton, day, hits)
  VALUES (true, today, 1)
  ON CONFLICT (singleton) DO UPDATE SET day = today,
    hits = CASE WHEN total.day < today THEN 1 ELSE total.hits + 1 END;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.take_spot_interpretation_slot(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.take_spot_interpretation_slot(uuid) TO service_role;

COMMIT;
