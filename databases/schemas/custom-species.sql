CREATE TABLE custom_species (
	entryid SERIAL PRIMARY KEY,
	ownerid TEXT NOT NULL,
	speciesid TEXT NOT NULL,
	name TEXT NOT NULL,
	num INTEGER NOT NULL,
	inheritsfrom TEXT,
	species JSONB NOT NULL,
	learnset JSONB NOT NULL DEFAULT '{}',
	sprites JSONB NOT NULL DEFAULT '{}',
	notes TEXT,
	private TEXT,
	views INTEGER NOT NULL DEFAULT 0,
	date TIMESTAMP NOT NULL,
	updated TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX custom_species_owner_speciesid_idx ON custom_species(ownerid, speciesid);
CREATE INDEX custom_species_owner_updated_idx ON custom_species(ownerid, updated DESC);
CREATE INDEX custom_species_data_idx ON custom_species USING GIN (species jsonb_path_ops);
CREATE INDEX custom_species_learnset_idx ON custom_species USING GIN (learnset);

CREATE TABLE custom_species_sprites (
	entryid INTEGER NOT NULL REFERENCES custom_species(entryid) ON DELETE CASCADE,
	kind TEXT NOT NULL,
	sha TEXT NOT NULL,
	width INTEGER NOT NULL,
	height INTEGER NOT NULL,
	bytes INTEGER NOT NULL,
	data BYTEA NOT NULL,
	updated TIMESTAMP NOT NULL,
	PRIMARY KEY (entryid, kind)
);
