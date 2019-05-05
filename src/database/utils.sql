CREATE OR REPLACE FUNCTION time_format(origin timestamp)
RETURNS text AS $$
BEGIN
  RETURN to_char(origin, 'DD-MM-YYYY"T"HH24:MI:SS');
END;
$$  LANGUAGE plpgsql;
