-- Custom species: per-account, user-authored Pokemon.
--
-- `species` and `learnset` hold canonical upstream shapes - a `SpeciesData`
-- object exactly as data/pokedex.ts entries are, and a `LearnsetData['learnset']`
-- map exactly as data/learnsets.ts entries are - so an entry can be dropped
-- straight into a Dex mod's data table without translation.
--
-- speciesid/name/num/inheritsfrom/sprites are projections written by the plugin;
-- the JSON columns are the source of truth. Denormalised so listing and
-- searching never have to parse JSON, the way `teams` denormalises `format`.

CREATE TABLE custom_species (
	entryid SERIAL PRIMARY KEY,
	ownerid TEXT NOT NULL,
	speciesid TEXT NOT NULL,
	name TEXT NOT NULL,
	-- Server-assigned as -100000 - entryid. Negative num is upstream's
	-- "non-canonical" convention; CAP occupies -1 to -5014, so this band is clear
	-- of it, and it survives a rename.
	num INTEGER NOT NULL,
	-- NULL = standalone. Otherwise a real species id, and `species` holds only the
	-- overrides, mirroring the `inherit: true` convention mods use.
	inheritsfrom TEXT,
	species JSONB NOT NULL,
	learnset JSONB NOT NULL DEFAULT '{}',
	-- {kind: sha} projection of custom_species_sprites, so a plain SELECT carries
	-- every image URL the client needs without a join and without the bytes.
	sprites JSONB NOT NULL DEFAULT '{}',
	notes TEXT,
	private TEXT,
	views INTEGER NOT NULL DEFAULT 0,
	date TIMESTAMP NOT NULL,
	updated TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX custom_species_owner_speciesid_idx ON custom_species(ownerid, speciesid);
-- Serves the listing queries' `WHERE ownerid ORDER BY updated DESC` without a sort.
CREATE INDEX custom_species_owner_updated_idx ON custom_species(ownerid, updated DESC);
-- jsonb_path_ops for the `@>` type filter; learnset needs default jsonb_ops for `?`.
CREATE INDEX custom_species_data_idx ON custom_species USING GIN (species jsonb_path_ops);
CREATE INDEX custom_species_learnset_idx ON custom_species USING GIN (learnset);

-- Image bytes live in their own table so the listing query never drags them.
-- sha is sha256(data) in hex, and doubles as the served filename: content
-- addressing makes the URL immutable, so a re-upload busts the browser cache by
-- changing the URL rather than needing a version query string.
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
