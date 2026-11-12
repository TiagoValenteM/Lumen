BEGIN;

CREATE TABLE lumen_private.geocode_user_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL
);

CREATE TABLE lumen_private.geocode_provider_limits (
  provider text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL,
  last_request timestamptz NOT NULL
);

CREATE FUNCTION public.take_geocoding_slot(requester uuid, provider_name text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  request_time timestamptz := clock_timestamp();
  user_window timestamptz := date_trunc('minute', request_time);
  provider_window timestamptz := date_trunc('day', request_time AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  provider_gap interval := CASE WHEN provider_name = 'nominatim' THEN interval '1 second' ELSE interval '0' END;
BEGIN
  IF provider_name IS NULL OR provider_name NOT IN ('geoapify', 'locationiq', 'photon', 'nominatim') THEN
    RAISE EXCEPTION 'Invalid geocoding provider' USING ERRCODE = '22023';
  END IF;

  INSERT INTO lumen_private.geocode_user_limits AS limits (user_id, window_start, hits)
  VALUES (requester, user_window, 1)
  ON CONFLICT (user_id) DO UPDATE SET window_start = user_window,
    hits = CASE WHEN limits.window_start < user_window THEN 1 ELSE limits.hits + 1 END
  WHERE limits.window_start < user_window OR limits.hits < 30;
  IF NOT FOUND THEN RETURN 60; END IF;

  INSERT INTO lumen_private.geocode_provider_limits AS limits (provider, window_start, hits, last_request)
  VALUES (provider_name, provider_window, 1, request_time)
  ON CONFLICT (provider) DO UPDATE SET window_start = provider_window,
    hits = CASE WHEN limits.window_start < provider_window THEN 1 ELSE limits.hits + 1 END,
    last_request = request_time
  WHERE (limits.window_start < provider_window OR limits.hits < 1000)
    AND request_time >= limits.last_request + provider_gap;
  IF FOUND THEN RETURN 0; END IF;

  IF EXISTS (
    SELECT 1 FROM lumen_private.geocode_provider_limits
    WHERE provider = provider_name AND window_start = provider_window AND hits >= 1000
  ) THEN
    RETURN greatest(1, ceil(extract(epoch FROM provider_window + interval '24 hours' - request_time))::integer);
  END IF;
  RETURN 1;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.take_geocoding_slot(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.take_geocoding_slot(uuid, text) TO service_role;

COMMIT;
