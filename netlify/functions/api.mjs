const TABLE = 'drawer_kv';
const MAX_KEY_LENGTH = 200;
const MAX_BODY_BYTES = 1_000_000;

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });
}

function getConfig(env) {
  const url = String(env.SUPABASE_URL || '').replace(/\/+$/, '');
  const secretKey = String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '');
  return { url, secretKey, configured: Boolean(url && secretKey) };
}

function routeFrom(requestUrl) {
  let pathname = new URL(requestUrl).pathname;
  pathname = pathname.replace(/^\/\.netlify\/functions\/api/, '');
  pathname = pathname.replace(/^\/api(?=\/|$)/, '');
  return pathname || '/';
}

async function supabaseRequest(config, fetchImpl, query = '', init = {}) {
  const response = await fetchImpl(`${config.url}/rest/v1/${TABLE}${query}`, {
    ...init,
    headers: {
      apikey: config.secretKey,
      Accept: 'application/json',
      ...init.headers
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with HTTP ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function keyFromRoute(route) {
  if (!route.startsWith('/kv/')) return null;
  try {
    const key = decodeURIComponent(route.slice('/kv/'.length));
    return key && key.length <= MAX_KEY_LENGTH ? key : null;
  } catch {
    return null;
  }
}

export function createHandler({ env = process.env, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  return async function handler(request) {
    const route = routeFrom(request.url);
    const config = getConfig(env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

    if (!config.configured) {
      return json({
        ok: false,
        error: 'Sync database is not configured',
        db: { configured: false, connected: false }
      }, 503);
    }

    try {
      if (request.method === 'GET' && route === '/health') {
        await supabaseRequest(config, fetchImpl, '?select=key&limit=1');
        return json({ ok: true, db: { configured: true, connected: true } });
      }

      if (request.method === 'GET' && route === '/kv') {
        const rows = await supabaseRequest(config, fetchImpl, '?select=key,value,updated_at&order=key.asc');
        const items = rows.map((row) => ({
          key: row.key,
          value: row.value,
          updatedAt: Number(row.updated_at || 0)
        }));
        return json({ ok: true, items });
      }

      const key = keyFromRoute(route);
      if (!key && route.startsWith('/kv/')) {
        return json({ ok: false, error: 'Invalid key' }, 400);
      }

      if (request.method === 'GET' && key) {
        const params = new URLSearchParams({
          select: 'key,value,updated_at',
          key: `eq.${key}`,
          limit: '1'
        });
        const rows = await supabaseRequest(config, fetchImpl, `?${params}`);
        if (!rows.length) return json({ ok: false, error: 'Not found' }, 404);
        const row = rows[0];
        return json({ ok: true, key: row.key, value: row.value, updatedAt: Number(row.updated_at || 0) });
      }

      if (request.method === 'PUT' && key) {
        const contentLength = Number(request.headers.get('content-length') || 0);
        if (contentLength > MAX_BODY_BYTES) return json({ ok: false, error: 'Request body is too large' }, 413);

        let body;
        try {
          body = await request.json();
        } catch {
          return json({ ok: false, error: 'Invalid JSON body' }, 400);
        }
        if (typeof body?.value !== 'string') {
          return json({ ok: false, error: 'value must be a string' }, 400);
        }
        if (new TextEncoder().encode(body.value).byteLength > MAX_BODY_BYTES) {
          return json({ ok: false, error: 'value is too large' }, 413);
        }

        const updatedAt = now();
        const rows = await supabaseRequest(config, fetchImpl, '?on_conflict=key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify({ key, value: body.value, updated_at: updatedAt })
        });
        const saved = rows?.[0];
        return json({ ok: true, key, updatedAt: Number(saved?.updated_at || updatedAt) });
      }

      return json({ ok: false, error: 'Not found' }, 404);
    } catch (error) {
      console.error('[sync-api]', error instanceof Error ? error.message : error);
      const isHealth = request.method === 'GET' && route === '/health';
      return json({
        ok: false,
        error: 'Sync database is unavailable',
        ...(isHealth ? { db: { configured: true, connected: false } } : {})
      }, 503);
    }
  };
}

export default createHandler();
