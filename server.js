// Simple Express server that serves the static app and provides a MongoDB-backed
// key/value API for syncing localStorage data when the app is online.
//
// Env:
// - PORT: port to listen on (default 8080)
// - MONGODB_URI: full MongoDB connection string (required for API)
// - MONGODB_DB: database name (default 'drawercount')

/* eslint-disable no-console */
const path = require('path');
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'drawercount';

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health endpoint (includes DB connectivity state if configured)
app.get('/api/health', async (_req, res) => {
	let db = { configured: !!MONGODB_URI, connected: false };
	try {
		if (MONGODB_URI) {
			await connectMongoOnce();
			if (mongoClient) {
				try {
					await mongoClient.db(MONGODB_DB).command({ ping: 1 });
					db.connected = true;
				} catch (_) { db.connected = false; }
			}
		}
	} catch (_) { /* ignore */ }
	res.json({ ok: true, ts: Date.now(), db });
});

// Mongo client and collection
let mongoClient = null;
let kvCollection = null;

async function connectMongoOnce() {
	if (kvCollection) return kvCollection;
	if (!MONGODB_URI) {
		console.warn('[api] MONGODB_URI is not set. API routes will return 503.');
		return null;
	}
	try {
		mongoClient = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
		await mongoClient.connect();
		const db = mongoClient.db(MONGODB_DB);
		kvCollection = db.collection('kv');
		// Global unique index for shared records, limited only to documents with scope==='global'
		// This avoids duplicate key errors from legacy documents that lacked a scope field.
		try {
			await kvCollection.createIndex(
				{ scope: 1, key: 1 },
				{ unique: true, partialFilterExpression: { scope: 'global' }, name: 'unique_global_scope_key' }
			);
		} catch (e) {
			console.warn('[api] Warning creating global unique index on {scope,key}:', e?.message || e);
		}
		// Legacy unique index for older per-client records (keep if present). Ignore errors if duplicates exist.
		try { await kvCollection.createIndex({ clientId: 1, key: 1 }, { unique: true, name: 'unique_clientId_key' }); } catch (_) {}
		// UpdatedAt index for optional housekeeping
		try { await kvCollection.createIndex({ updatedAt: 1 }, { name: 'idx_updatedAt' }); } catch (_) {}
		return kvCollection;
	} catch (err) {
		console.error('[api] Mongo initialization failed:', err?.message || err);
		try { await mongoClient?.close(); } catch (_) {}
		kvCollection = null;
		return null; // Signal unavailable so routes can return 503 instead of 500
	}
}

// Note: We now use a global scope so all clients share the same data.

// GET /api/kv/:key -> { key, value, updatedAt }
app.get('/api/kv/:key', async (req, res) => {
	try {
		const key = req.params.key;
		const coll = await connectMongoOnce();
		if (!coll) return res.status(503).json({ ok: false, error: 'DB unavailable' });
		// Prefer global-scoped document
		let doc = await coll.findOne({ scope: 'global', key }, { projection: { _id: 0 } });
		if (!doc) {
			// Fallback for legacy per-client docs: take latest by updatedAt across any clientId
			doc = await coll.find({ key }, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).limit(1).next();
		}
		if (!doc) return res.status(404).json({ ok: false, error: 'Not found' });
		res.json({ ok: true, key: doc.key, value: doc.value, updatedAt: doc.updatedAt });
	} catch (err) {
		console.error('GET /api/kv error', err);
		res.status(500).json({ ok: false, error: 'Server error' });
	}
});

// PUT /api/kv/:key body: { value, updatedAt? }
// Server sets updatedAt (ms) and does last-write-wins when a concurrent write happens.
app.put('/api/kv/:key', async (req, res) => {
	try {
		const key = req.params.key;
		const { value } = req.body || {};
		if (typeof value === 'undefined') return res.status(400).json({ ok: false, error: 'Missing value' });
		const coll = await connectMongoOnce();
		if (!coll) return res.status(503).json({ ok: false, error: 'DB unavailable' });
		const now = Date.now();
		const update = { $set: { scope: 'global', key, value, updatedAt: now } };
		const opts = { upsert: true, returnDocument: 'after' };
		const result = await coll.findOneAndUpdate({ scope: 'global', key }, update, opts);
		const doc = result.value || { key, value, updatedAt: now };
		res.json({ ok: true, key: doc.key, updatedAt: doc.updatedAt });
	} catch (err) {
		console.error('PUT /api/kv error', err);
		res.status(500).json({ ok: false, error: 'Server error' });
	}
});

// Optional: list all keys (shared). Prefer global docs, fall back to latest legacy entry per key.
app.get('/api/kv', async (req, res) => {
	try {
		const coll = await connectMongoOnce();
		if (!coll) return res.status(503).json({ ok: false, error: 'DB unavailable' });
		// Fetch all global and legacy docs, then reduce client-side.
		const all = await coll.find({}, { projection: { _id: 0 } }).toArray();
		const map = new Map();
		for (const d of all) {
			const k = d.key;
			const cur = map.get(k);
			if (!cur) { map.set(k, d); continue; }
			// Prefer global; else pick latest updatedAt
			if (d.scope === 'global' && cur.scope !== 'global') { map.set(k, d); continue; }
			if ((d.updatedAt || 0) > (cur.updatedAt || 0)) { map.set(k, d); }
		}
		const items = Array.from(map.values()).map(({ clientId, ...rest }) => rest);
		res.json({ ok: true, items });
	} catch (err) {
		console.error('GET /api/kv list error', err);
		res.status(500).json({ ok: false, error: 'Server error' });
	}
});

// Runtime config for frontend: expose API base via env var
app.get('/config.js', (req, res) => {
	try {
		const apiBase = process.env.API_BASE || '/api';
		res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
		res.setHeader('Cache-Control', 'no-store, max-age=0');
		res.send(`// generated at ${new Date().toISOString()}\nwindow.DCA_API_BASE = ${JSON.stringify(apiBase)};`);
	} catch (_) {
		res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
		res.setHeader('Cache-Control', 'no-store, max-age=0');
		res.send('window.DCA_API_BASE = "/api";');
	}
});

// Serve static files (PWA)
const rootDir = path.resolve(__dirname);
app.use(express.static(rootDir, { extensions: ['html'], index: 'index.html', maxAge: '1h' }));

// SPA fallback to index.html for unknown routes (except /api/*)
app.use((req, res, next) => {
	if (req.path.startsWith('/api/')) return next();
	res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
	if (!MONGODB_URI) console.log('Warning: No MONGODB_URI set. API endpoints will return 503.');
});

process.on('SIGINT', async () => {
	try { await mongoClient?.close(); } catch (_) {}
	process.exit(0);
});

