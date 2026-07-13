-- 005_groups_leader_id.sql
-- Líder de grupo (referencia a users.id)

ALTER TABLE groups ADD COLUMN leader_id INTEGER;