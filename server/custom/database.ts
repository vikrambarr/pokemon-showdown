/**
 * One Postgres pool for both custom tables.
 *
 * Outside chat-plugins/ so `/hotpatch chat` can't close it out from under ladders.ts.
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

/** docker/postgres/init only runs on an empty data directory, so catch an existing cluster up here. */
export function ensureSchema(tables: (DatabaseTable<any, PGDatabase> | undefined)[], schemaFile: string) {
	const connection = tables.every(table => table) && pool();
	if (!connection) return null;
	return (async () => {
		for (const table of tables) {
			try {
				await table!.selectOne()``;
				continue;
			} catch {}
			// nothing awaits this, so a probe that failed for any other reason must not reject
			try {
				await connection.query(SQL(FS(`databases/schemas/${schemaFile}`).readSync()));
			} catch {}
			return;
		}
	})();
}
