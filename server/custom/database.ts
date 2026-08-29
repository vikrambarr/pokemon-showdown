/**
 * Custom data storage: one Postgres pool for both custom tables.
 *
 * Outside chat-plugins/ because the battle path reads it, and `/hotpatch chat`
 * would close a plugin-owned pool out from under ladders.ts. Nothing closes this
 * pool for the same reason - it belongs to the process.
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

/** Postgres count() is int8, which the driver hands back as a string. */
export async function countOwned(table: DatabaseTable<any, PGDatabase>, name: string, ownerid: ID) {
	const result = await table.queryOne<{ count: number }>(
	)`SELECT count(*) AS count FROM "${name}" WHERE ownerid = ${ownerid}`;
	return Number(result?.count) || 0;
}
