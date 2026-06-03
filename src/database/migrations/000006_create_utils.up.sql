CREATE OR REPLACE FUNCTION time_format(origin timestamp)
RETURNS text AS $$
BEGIN
  RETURN to_char(origin, 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
END;
$$  LANGUAGE plpgsql;
