/**
 * Custom data storage
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * One Postgres pool for both custom tables, in the same database as `teams` and
 * `replays`. Lives here rather than under chat-plugins/ because the battle path
 * reads it: `/hotpatch chat` re-requires the plugin tree, and a pool owned by a
 * plugin would be closed out from under `ladders.ts`, which is not re-required.
 * For the same reason nothing closes this pool - it belongs to the process.
 *
 * @license MIT
 */
import { SQL, PGDatabase, type DatabaseTable } from '../../lib/database';
import { FS } from '../../lib';

export let db: PGDatabase | null = null;

function pool() {
	if (!db && Config.usepostgres) db = new PGDatabase(Config.usepostgres);
	return db;
}

/** The table handle, or undefined when the feature that owns it is switched off. */
export function getTable<Row>(enabled: unknown, name: string, primaryKey: (keyof Row & string) | null = null) {
	if (!enabled) return undefined;
	return pool()?.getTable<Row>(name, primaryKey);
}

/**
 * docker/postgres/init only runs on an empty data directory, so an existing
 * cluster has to be caught up here. Same probe the teams plugin uses.
 */
export function ensureSchema(table: DatabaseTable<any, PGDatabase> | undefined, schemaFile: string) {
	const connection = table && pool();
	if (!connection) return null;
	return (async () => {
		try {
			await table.selectOne()``;
		} catch {
			await connection.query(SQL(FS(`databases/schemas/${schemaFile}`).readSync()));
		}
	})();
}
