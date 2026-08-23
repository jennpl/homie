INSERT INTO households (id, name, timezone) VALUES
  ('tony-test', 'Tony development household', 'America/New_York'),
  ('partner-test', 'Partner development household', 'America/New_York'),
  ('shared-demo', 'Shared demo household', 'America/New_York')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  timezone = EXCLUDED.timezone;

INSERT INTO memberships (household_id, author_id, display_name) VALUES
  ('tony-test', 'tony', 'Tony'),
  ('tony-test', 'partner', 'Partner'),
  ('partner-test', 'tony', 'Tony'),
  ('partner-test', 'partner', 'Partner'),
  ('shared-demo', 'tony', 'Tony'),
  ('shared-demo', 'partner', 'Partner')
ON CONFLICT (household_id, author_id) DO UPDATE SET
  display_name = EXCLUDED.display_name;
