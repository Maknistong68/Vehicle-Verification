ALTER TYPE inspection_type RENAME VALUE 'routine' TO 'new';
ALTER TABLE inspections ALTER COLUMN inspection_type SET DEFAULT 'new';
