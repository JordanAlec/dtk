-- Active users
INSERT INTO users (name, email, active) VALUES
    ('Bob',   'bob@example.com',   true),
    ('Carol', 'carol@example.com', true);

-- Inactive user (id will be 3 after the two above; id=42 inserted explicitly for proc demo)
INSERT INTO users (name, email, active) VALUES
    ('Dave', 'dave@example.com', false);

-- Reserve id=42 for usp_activate_user demo
INSERT INTO users (id, name, email, active) VALUES
    (42, 'Inactive Demo', 'inactive-demo@example.com', false);

-- Reset sequence past the explicit id we forced in
SELECT setval('users_id_seq', 42);

-- Accounts required by the transaction step (ids 1 and 2)
INSERT INTO accounts (balance) VALUES (1000.00), (500.00);
