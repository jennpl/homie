CREATE TABLE households (
  id text PRIMARY KEY,
  name text NOT NULL,
  timezone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  household_id text NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  author_id text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, author_id)
);

CREATE TABLE notes (
  id uuid PRIMARY KEY,
  household_id text NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  author_id text NOT NULL,
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 4000),
  received_at timestamptz NOT NULL,
  local_date date NOT NULL,
  source_provider text NOT NULL,
  source_external_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (household_id, author_id)
    REFERENCES memberships(household_id, author_id),
  UNIQUE (source_provider, source_external_id)
);

CREATE INDEX notes_household_window_idx
  ON notes (household_id, local_date, received_at);

CREATE TABLE outbox_events (
  id uuid PRIMARY KEY,
  event_type text NOT NULL,
  schema_version integer NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE organization_snapshots (
  id uuid PRIMARY KEY,
  household_id text NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  window_kind text NOT NULL CHECK (window_kind IN ('day', 'week', 'month')),
  start_date date NOT NULL,
  end_date_exclusive date NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  summary text NOT NULL,
  plan_json jsonb NOT NULL,
  digest_text text NOT NULL,
  source_note_ids uuid[] NOT NULL,
  reason text NOT NULL CHECK (reason IN ('note.created', 'manual', 'scheduled', 'retry')),
  model text NOT NULL,
  prompt_version text NOT NULL,
  usage_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date_exclusive > start_date),
  UNIQUE (household_id, window_kind, start_date, version)
);

CREATE INDEX organization_snapshots_latest_idx
  ON organization_snapshots (household_id, window_kind, start_date, version DESC);
