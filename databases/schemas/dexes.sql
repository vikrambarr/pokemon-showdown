CREATE TABLE IF NOT EXISTS dexes (
	dexid TEXT PRIMARY KEY,
	ownerid TEXT NOT NULL,
	ownername TEXT NOT NULL,
	name TEXT NOT NULL,
	mod TEXT NOT NULL,
	species JSONB NOT NULL,
	created BIGINT NOT NULL,
	updated BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS dexes_ownerid ON dexes (ownerid);

CREATE TABLE IF NOT EXISTS dex_editors (
	dexid TEXT NOT NULL REFERENCES dexes (dexid) ON DELETE CASCADE,
	accountid TEXT NOT NULL,
	added BIGINT NOT NULL,
	PRIMARY KEY (dexid, accountid)
);

CREATE INDEX IF NOT EXISTS dex_editors_accountid ON dex_editors (accountid);

CREATE TABLE IF NOT EXISTS dex_species (
	dexid TEXT NOT NULL REFERENCES dexes (dexid) ON DELETE CASCADE,
	speciesid TEXT NOT NULL,
	num INTEGER NOT NULL,
	inheritsfrom TEXT,
	data JSONB NOT NULL,
	learnset JSONB NOT NULL,
	sprites JSONB NOT NULL,
	updated BIGINT NOT NULL,
	PRIMARY KEY (dexid, speciesid)
);

CREATE TABLE IF NOT EXISTS dex_formats (
	formatid TEXT PRIMARY KEY,
	dexid TEXT NOT NULL REFERENCES dexes (dexid) ON DELETE CASCADE,
	data JSONB NOT NULL,
	updated BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS dex_formats_dexid ON dex_formats (dexid);

CREATE TABLE IF NOT EXISTS dex_snapshots (
	hash TEXT PRIMARY KEY,
	dexid TEXT NOT NULL,
	data JSONB NOT NULL,
	created BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS dex_sprites (
	sha TEXT PRIMARY KEY,
	width INTEGER NOT NULL,
	height INTEGER NOT NULL,
	data BYTEA NOT NULL,
	created BIGINT NOT NULL
);
