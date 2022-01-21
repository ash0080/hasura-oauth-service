-- start a transaction
BEGIN;

-- schema
CREATE SCHEMA IF NOT EXISTS auth;

-- extensions
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- domains
DO $$ BEGIN
	CREATE DOMAIN auth.email AS public.citext CHECK (value ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
-- enums
CREATE TABLE IF NOT EXISTS auth.provider (
	value text NOT NULL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS auth.role (
  value text NOT NULL PRIMARY KEY
);

-- data
INSERT INTO auth.provider
VALUES ('github'),('google'),('facebook'),('twitter2')
ON CONFLICT DO NOTHING;

INSERT INTO auth.role
VALUES ('anonymous'),('user'),('subscriber')
ON CONFLICT DO NOTHING;
 -- should be tracked before continue

-- table
CREATE TABLE IF NOT EXISTS auth.user_provider (
	id uuid DEFAULT public.gen_random_uuid() NOT NULL PRIMARY KEY,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL,
	user_id uuid NOT NULL,
	provider_user_id text NOT NULL,
	provider text NOT NULL,
	UNIQUE(user_id, provider_user_id)
);

CREATE TABLE IF NOT EXISTS auth.user_role (
	id uuid DEFAULT public.gen_random_uuid() NOT NULL PRIMARY KEY,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	expired_at timestamp with time zone,
	user_id uuid NOT NULL,
	role text NOT NULL,
	UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS auth.user (
	  id uuid DEFAULT public.gen_random_uuid () NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    disabled boolean DEFAULT false,
    nickname text,
    bio text,
    avatar_url text,
    locale varchar(5) DEFAULT 'zh-cn',
    email auth.email
);

-- foreign keys
ALTER TABLE auth.user_provider
ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.user (id) ON UPDATE CASCADE ON DELETE CASCADE,
ADD CONSTRAINT fk_provider FOREIGN KEY (provider) REFERENCES auth.provider (value) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE auth.user_role
ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.user (id) ON UPDATE CASCADE ON DELETE CASCADE,
ADD CONSTRAINT fk_role FOREIGN KEY (role) REFERENCES auth.role (value) ON UPDATE CASCADE ON DELETE CASCADE;

-- functions
--[trigger] auto update timestamp
CREATE or REPLACE FUNCTION auth.set_current_timestamp_updated_at ()
RETURNS TRIGGER
AS
$$
DECLARE
	_new record;
BEGIN
	_new := new;
	_new. "updated_at" = now();
	RETURN _new;
END
$$
LANGUAGE plpgsql;

--[cron] downgrade expired subscriber
CREATE or REPLACE FUNCTION auth.downgrade_expired_subscriber ()
RETURNS SETOF auth.user_role
AS
$$
BEGIN
    RETURN QUERY
    UPDATE auth.user_role
    SET expired_at = NULL, role = 'user'
    WHERE role  = 'subscriber' AND expired_at <=  now()
    RETURNING *;
END
$$
LANGUAGE plpgsql;

-- [cron] clean events/invocations
-- SELECT clean_events(NULL, '0 day')
CREATE or REPLACE FUNCTION auth.clean_events(_trigger_name TEXT default NULL, _duration TEXT default '30 day')
RETURNS TABLE(events INTEGER, invocations INTEGER) AS
$$
DECLARE
	_invocations INTEGER;
	_events INTEGER;
BEGIN
	IF _trigger_name IS NULL THEN
		WITH i as (
			DELETE FROM hdb_catalog.event_invocation_logs
			WHERE created_at < now() - _duration::interval
			RETURNING *
		)
		SELECT COUNT(*) INTO _invocations FROM i;

		WITH e as (
      DELETE FROM hdb_catalog.event_log
      WHERE (delivered = true OR error = true)
        AND created_at < now() - _duration::interval
        RETURNING *
	    )
	    SELECT COUNT(*) INTO _events FROM e;

	ELSE
		WITH i as (
      DELETE FROM hdb_catalog.event_invocation_logs
      WHERE event_id IN (
        SELECT id FROM hdb_catalog.event_log
        WHERE trigger_name = _trigger_name
      ) AND created_at < now() - _duration::interval
      RETURNING *
    )
    SELECT COUNT(*) INTO _invocations FROM i;

    WITH e as (
      DELETE FROM hdb_catalog.event_log
      WHERE trigger_name = _trigger_name
        AND (delivered = true OR error = true)
        AND created_at < now() - _duration::interval
      RETURNING *
    )
		SELECT COUNT(*) INTO _events FROM e;
	END IF;

  RETURN QUERY VALUES (_events, _invocations);
END
$$
LANGUAGE plpgsql;

-- TODO: 尝试拆成两个以实现trackable, 放进public, 但是仍然无法追踪, 因为内置表单没有被追踪
-- CREATE or REPLACE FUNCTION clean_event_invocations(_trigger_name TEXT default NULL, _duration TEXT default '30 day')
-- RETURNS SETOF hdb_catalog.event_invocation_logs AS
-- $$
-- BEGIN
-- 	IF _trigger_name IS NULL THEN
-- 		WITH d as (
-- 			DELETE FROM hdb_catalog.event_invocation_logs
-- 			WHERE created_at < now() - _duration::interval
-- 			RETURNING *
-- 		)
-- 		SELECT * FROM d;
-- 	ELSE
-- 		WITH d as (
--       DELETE FROM hdb_catalog.event_invocation_logs
--       WHERE event_id IN (
--         SELECT id FROM hdb_catalog.event_log
--         WHERE trigger_name = _trigger_name
--       ) AND created_at < now() - _duration::interval
--       RETURNING *
--     )
--     SELECT * FROM d;
-- 	END IF;
-- END
-- $$
-- LANGUAGE plpgsql;
--
-- CREATE or REPLACE FUNCTION clean_events(_trigger_name TEXT default NULL, _duration TEXT default '30 day')
-- RETURNS SETOF hdb_catalog.event_log AS
-- $$
-- BEGIN
-- 	IF
-- 		_trigger_name IS NULL
-- 	THEN
-- 		WITH d as (
-- 			DELETE FROM hdb_catalog.event_log
-- 			WHERE (delivered = true OR error = true)
--       	  AND created_at < now() - _duration::interval
-- 			RETURNING *
-- 		)
-- 		SELECT * FROM d;
-- 	ELSE
-- 		WITH d as (
-- 			DELETE FROM hdb_catalog.event_log
-- 			WHERE trigger_name = _trigger_name
--         AND (delivered = true OR error = true)
--         AND created_at < now() - _duration::interval
-- 			RETURNING *
-- 		)
-- 		SELECT * FROM d;
-- 	END IF;
-- END
-- $$
-- LANGUAGE plpgsql;

--[mutation] upgrade subscriber
CREATE or REPLACE FUNCTION auth.upgrade_to_subscriber (_user_id TEXT, _duration TEXT)
RETURNS SETOF auth.user_role
AS
$$
DECLARE
	_now TIMESTAMP with time zone;
BEGIN
	_now := now();
	RETURN QUERY
	UPDATE auth.user_role
	SET role = 'subscriber',
	 expired_at = _duration::INTERVAL +
		(CASE WHEN expired_at > _now
		then expired_at
		else _now
		END)
	WHERE user_id::TEXT = _user_id
	RETURNING * ;
END
$$
LANGUAGE plpgsql;

--[trigger] auto insert default user role
CREATE or REPLACE FUNCTION auth.create_default_role ()
RETURNS TRIGGER
AS
$$
BEGIN
	INSERT INTO auth.user_role (user_id, role)
	VALUES (NEW.id, 'user');
	RETURN NEW;
END
$$
LANGUAGE plpgsql;

-- SELECT auth.down_grade_expired_subscriber(); add a cron trigger, then notify

-- triggers
DROP TRIGGER IF EXISTS set_auth_user_provider_updated_at
ON auth.user_provider;
CREATE TRIGGER set_auth_user_provider_updated_at
	BEFORE UPDATE ON auth.user_provider
	FOR EACH ROW
	EXECUTE PROCEDURE auth.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_auth_user_updated_at
ON auth.user;
CREATE TRIGGER set_auth_user_updated_at
	BEFORE UPDATE ON auth.user
	FOR EACH ROW
	EXECUTE PROCEDURE auth.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS create_auth_user_role_when_user_added
ON auth.user;
CREATE TRIGGER create_auth_user_role_when_user_added
	AFTER INSERT ON auth.user
	FOR EACH ROW
	EXECUTE PROCEDURE auth.create_default_role();

-- create a check point
CREATE or REPLACE FUNCTION auth.version ()
RETURNS TEXT AS
$$
BEGIN
	RETURN '1.0.0';
END
$$
LANGUAGE plpgsql;

-- commit
COMMIT;


-- runable scripts
-- SELECT auth.version();  a check point
-- SELECT auth.clean_events(NULL, '0 day')
