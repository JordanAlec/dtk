CREATE TABLE users (
    id     SERIAL PRIMARY KEY,
    name   VARCHAR(255)        NOT NULL,
    email  VARCHAR(255)        NOT NULL UNIQUE,
    active BOOLEAN             NOT NULL DEFAULT false
);

CREATE TABLE accounts (
    id      SERIAL PRIMARY KEY,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE OR REPLACE PROCEDURE usp_activate_user(p_user_id INT)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE users SET active = true WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % not found', p_user_id;
    END IF;
END;
$$;
