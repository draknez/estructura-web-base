-- 004_user_group_id.sql
-- Asignación de usuarios a grupos organizacionales

ALTER TABLE users ADD COLUMN group_id INTEGER;