-- Custom formats: per-account, user-authored battle formats.
--
-- A format is composition, not code: a base format to inherit from, plus lists
-- of rule names drawn from data/rulesets.ts. Nothing stored here is executable,
-- which is what lets the validator be a pure string check.
--
-- ruleset/banlist/unbanlist hold canonical upstream shapes - arrays of rule
-- strings exactly as config/formats.ts entries carry them - so a row becomes a
-- FormatData without translation.

CREATE TABLE custom_formats (
	entryid SERIAL PRIMARY KEY,
	ownerid TEXT NOT NULL,
	formatid TEXT NOT NULL,
	name TEXT NOT NULL,
	-- A real format id, inherited by naming it as the first ruleset entry, the
	-- way formats in config/formats.ts inherit from each other.
	base TEXT NOT NULL,
	ruleset JSONB NOT NULL DEFAULT '[]',
	banlist JSONB NOT NULL DEFAULT '[]',
	unbanlist JSONB NOT NULL DEFAULT '[]',
	notes TEXT,
	private TEXT,
	views INTEGER NOT NULL DEFAULT 0,
	date TIMESTAMP NOT NULL,
	updated TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX custom_formats_owner_formatid_idx ON custom_formats(ownerid, formatid);
-- Serves the listing queries' `WHERE ownerid ORDER BY updated DESC` without a sort.
CREATE INDEX custom_formats_owner_updated_idx ON custom_formats(ownerid, updated DESC);
