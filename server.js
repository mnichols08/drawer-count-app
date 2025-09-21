// Simple Express server that serves the static app and provides a MongoDB-backed
// key/value API for syncing localStorage data when the app is online.
//
// Env:
// - PORT: port to listen on (default 8080)
// - MONGODB_URI: full MongoDB connection string (required for API)
// - MONGODB_DB: database name (default 'drawer-count-app')

/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
// Ensure fetch is available in Node (Node 18+ has global fetch; otherwise use undici)
let fetchFn = global.fetch;
if (typeof fetchFn !== 'function') {
	try { fetchFn = require('undici').fetch; } catch (_) { throw new Error("Fetch API is not available. Please use Node.js v18+ or install the 'undici' package."); }
}
const fetch = (...args) => fetchFn(...args);
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'drawer-count-app';
const API_BASE_ENV = process.env.API_BASE || '';

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// If no local DB is configured but a remote API_BASE is provided, proxy /api/* to it.
// This lets local development load remote profiles/days without CORS issues.
const shouldProxyApi = !MONGODB_URI && /^https?:\/\//i.test(API_BASE_ENV);
if (shouldProxyApi) {
	console.log(`[server] No local MONGODB_URI set. Proxying /api/* to ${API_BASE_ENV}`);
	app.use('/api', async (req, res) => {
		try {
			const base = API_BASE_ENV.replace(/\/+$/, '');
			// req.originalUrl includes the '/api' prefix; strip it for target path
			const suffix = (req.originalUrl || req.url || '').replace(/^\/api/, '');
			const targetUrl = base + suffix;

			// Build headers: drop hop-by-hop headers
			const headers = { ...req.headers };
			delete headers.host; delete headers['content-length']; delete headers.connection;

			// Prepare body for non-GET methods
			let body;
			if (req.method !== 'GET' && req.method !== 'HEAD') {
				if (req.is('application/json')) {
					headers['content-type'] = 'application/json';
					body = JSON.stringify(req.body ?? {});
				} else {
					// Fallback: best-effort pass-through for other types
					body = typeof req.body === 'string' ? req.body : undefined;
				}
			}

			const r = await fetch(targetUrl, { method: req.method, headers, body });
			// Copy select headers back
			const outHeaders = {};
			const copyHeaders = ['content-type', 'cache-control', 'etag', 'last-modified', 'vary'];
			for (const h of copyHeaders) {
				const v = r.headers.get(h);
				if (v) outHeaders[h] = v;
			}
			const buf = await r.arrayBuffer();
			res.status(r.status).set(outHeaders).send(Buffer.from(buf));
		} catch (e) {
			console.error('[proxy] error', e?.message || e);
			res.status(502).json({ ok: false, error: 'Bad gateway' });
		}
	});
}

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

// Build MongoClient options from environment to support TLS configs on various providers
let cachedTlsCAFilePath = null;
function buildMongoClientOptions() {
	const opts = { serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || 3000 };

	// Force TLS if requested (some providers require explicit tls=true with mongodb:// URIs)
	if (String(process.env.MONGODB_TLS || '').toLowerCase() === 'true') {
		opts.tls = true;
	}

	// Allow connecting to providers with self-signed or mismatch certs (use only if you understand the risk)
	if (String(process.env.MONGODB_TLS_INSECURE || '').toLowerCase() === 'true') {
		opts.tlsAllowInvalidCertificates = true;
		opts.tlsAllowInvalidHostnames = true;
	}

	// Provide a CA chain if needed (e.g., AWS DocumentDB, some managed Mongo offerings)
	const caFile = process.env.MONGODB_TLS_CA_FILE;
	const caPem = process.env.MONGODB_TLS_CA_PEM; // raw PEM content
	const caB64 = process.env.MONGODB_TLS_CA_BASE64; // base64-encoded PEM content
	try {
		if (!cachedTlsCAFilePath) {
			if (caFile && fs.existsSync(caFile)) {
				cachedTlsCAFilePath = caFile;
			} else if (caPem && caPem.trim()) {
				const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dca-'));
				cachedTlsCAFilePath = path.join(dir, 'mongo-ca.pem');
				fs.writeFileSync(cachedTlsCAFilePath, caPem, { encoding: 'utf8' });
			} else if (caB64 && caB64.trim()) {
				const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dca-'));
				cachedTlsCAFilePath = path.join(dir, 'mongo-ca.pem');
				const buf = Buffer.from(caB64, 'base64');
				fs.writeFileSync(cachedTlsCAFilePath, buf);
			}
		}
	} catch (e) {
		console.warn('[api] Warning preparing TLS CA file:', e?.message || e);
	}
	if (cachedTlsCAFilePath) {
		opts.tlsCAFile = cachedTlsCAFilePath;
	}

	return opts;
}

async function connectMongoOnce() {
	if (kvCollection) return kvCollection;
	if (!MONGODB_URI) {
		console.warn('[api] MONGODB_URI is not set. API routes will return 503.');
		return null;
	}
	try {
		const mongoOpts = buildMongoClientOptions();
		mongoClient = new MongoClient(MONGODB_URI, mongoOpts);
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
		if (!coll) {
			// Fallback: proxy to remote API if configured
			if (/^https?:\/\//i.test(API_BASE_ENV)) {
				try {
					const base = API_BASE_ENV.replace(/\/+$/, '');
					const url = `${base}/kv/${encodeURIComponent(key)}`;
					const r = await fetch(url, { method: 'GET', headers: { 'accept': 'application/json' } });
					const buf = await r.arrayBuffer();
					res.status(r.status).set('content-type', r.headers.get('content-type') || 'application/json').send(Buffer.from(buf));
					return;
				} catch (e) {
					console.warn('[api] remote GET fallback failed', e?.message || e);
				}
			}
			return res.status(503).json({ ok: false, error: 'DB unavailable' });
		}
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
		if (!coll) {
			if (/^https?:\/\//i.test(API_BASE_ENV)) {
				try {
					const base = API_BASE_ENV.replace(/\/+$/, '');
					const url = `${base}/kv/${encodeURIComponent(key)}`;
					const r = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value, updatedAt: Date.now() }) });
					const buf = await r.arrayBuffer();
					res.status(r.status).set('content-type', r.headers.get('content-type') || 'application/json').send(Buffer.from(buf));
					return;
				} catch (e) {
					console.warn('[api] remote PUT fallback failed', e?.message || e);
				}
			}
			return res.status(503).json({ ok: false, error: 'DB unavailable' });
		}
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
		if (!coll) {
			if (/^https?:\/\//i.test(API_BASE_ENV)) {
				try {
					const base = API_BASE_ENV.replace(/\/+$/, '');
					const url = `${base}/kv`;
					const r = await fetch(url, { method: 'GET', headers: { 'accept': 'application/json' } });
					const buf = await r.arrayBuffer();
					res.status(r.status).set('content-type', r.headers.get('content-type') || 'application/json').send(Buffer.from(buf));
					return;
				} catch (e) {
					console.warn('[api] remote LIST fallback failed', e?.message || e);
				}
			}
			return res.status(503).json({ ok: false, error: 'DB unavailable' });
		}
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
		// Remove clientId from each item before sending the response to avoid exposing internal identifiers.
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
		// If serving to localhost, always prefer same-origin '/api' to avoid CORS in local dev
		const host = (req.hostname || req.headers.host || '').toString().toLowerCase();
		const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
		const apiBase = isLocalHost ? '/api' : (process.env.API_BASE || '/api');
		// Determine dev mode: true when started via `npm run dev`, or NODE_ENV=development, or explicit DCA_DEV
		const isDev = (process.env.npm_lifecycle_event === 'dev') || (String(process.env.NODE_ENV).toLowerCase() === 'development') || (String(process.env.DCA_DEV).toLowerCase() === 'true');
		res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
		res.setHeader('Cache-Control', 'no-store, max-age=0');
		res.send(`// generated at ${new Date().toISOString()}\nwindow.DCA_API_BASE = ${JSON.stringify(apiBase)};\nwindow.DCA_DEV = ${isDev ? 'true' : 'false'};`);
	} catch (_) {
		res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
		res.setHeader('Cache-Control', 'no-store, max-age=0');
		res.send('window.DCA_API_BASE = "/api";\nwindow.DCA_DEV = false;');
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

