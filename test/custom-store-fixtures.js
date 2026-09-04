'use strict';

/**
 * The real custom-entry tables, on a database of their own
 */

const assert = require('assert').strict;
const { Utils } = require('../dist/lib');
const speciesDatabase = require('../dist/server/custom/species/database');
const formatDatabase = require('../dist/server/custom/formats/database');
const { makeUser, destroyUser } = require('./users-utils');

const DATABASE = process.env.PS_TEST_PGDATABASE || 'ps_custom_test';

/** Postgres won't create a database from a connection to it, so `postgres` opens the door. */
async function createDatabase(connection) {
	const client = new (require('pg').Client)({ ...connection, database: 'postgres' });
	await client.connect();
	try {
		await client.query(`CREATE DATABASE ${DATABASE}`);
	} catch (e) {
		if (e.code !== '42P04') throw e; // duplicate_database
	} finally {
		await client.end();
	}
}

/** True once both tables are usable. */
exports.connect = async function () {
	if (!process.env.PGHOST) return false;
	const connection = {
		host: process.env.PGHOST, port: Number(process.env.PGPORT) || 5432,
		user: process.env.PGUSER, password: process.env.PGPASSWORD, database: DATABASE,
	};
	try {
		await createDatabase(connection);
	} catch {
		return false;
	}
	Config.usepostgres = connection;
	Config.custompokemon = ' ';
	Config.customformats = ' ';
	await speciesDatabase.connect();
	await formatDatabase.connect();
	if (!speciesDatabase.entries || !formatDatabase.entries) return false;
	try {
		await speciesDatabase.entries.selectOne()``;
		await formatDatabase.entries.selectOne()``;
	} catch {
		return false;
	}
	return true;
};

/** Both tables, for one owner only. */
exports.clear = async function (ownerid) {
	await speciesDatabase.entries.deleteAll()`WHERE ownerid = ${ownerid}`;
	await formatDatabase.entries.deleteAll()`WHERE ownerid = ${ownerid}`;
};

/** One stored format, for what a command's reply doesn't say: the password privacy generated. */
exports.formatRow = (ownerid, formatid) => formatDatabase.get(ownerid, formatid);

/** A user whose connection is read rather than written to a socket. */
exports.makeClient = function (name) {
	const user = makeUser(name);
	const connection = user.connections[0];
	const sent = [];
	connection.send = line => void sent.push(line);
	return {
		user, connection,
		destroy: () => destroyUser(user),
		/** Everything the server sent back in answer to one line. */
		async send(line) {
			sent.length = 0;
			await Chat.parse(line, null, user, connection);
			return sent;
		},
		/** The JSON of the `|queryresponse|` a `/cmd` answers with. */
		async cmd(line) {
			const lines = await this.send(`/cmd ${line}`);
			const response = lines.find(entry => entry.startsWith('|queryresponse|'));
			assert(response, `/cmd ${line} answered ${JSON.stringify(lines)}`);
			return JSON.parse(Utils.splitFirst(response, '|', 3)[3]);
		},
		/** The HTML one chat page rendered. */
		async page(pageid) {
			const lines = await this.send(`/join view-${pageid}`);
			const html = lines.find(entry => entry.includes('|pagehtml|'));
			assert(html, `view-${pageid} answered ${JSON.stringify(lines)}`);
			return html.slice(html.indexOf('|pagehtml|') + '|pagehtml|'.length);
		},
		/** The text of the popup one line produced. */
		async popup(line) {
			const lines = await this.send(line);
			const response = lines.find(entry => entry.startsWith('|popup|'));
			assert(response, `${line} answered ${JSON.stringify(lines)}`);
			return response.slice('|popup|'.length);
		},
	};
};
