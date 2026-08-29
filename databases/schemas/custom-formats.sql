CREATE TABLE custom_formats (
	entryid SERIAL PRIMARY KEY,
	ownerid TEXT NOT NULL,
	formatid TEXT NOT NULL,
	name TEXT NOT NULL,
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
CREATE INDEX custom_formats_owner_updated_idx ON custom_formats(ownerid, updated DESC);
