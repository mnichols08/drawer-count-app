import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../../netlify/functions/api.mjs';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_test'
};

function request(path, init) {
  return new Request(`https://drawer.example${path}`, init);
}

test('health reports a connected Supabase database', async () => {
  const fetchImpl = async (url, init) => {
    assert.match(url, /\/rest\/v1\/drawer_kv\?select=key&limit=1$/);
    assert.equal(init.headers.apikey, env.SUPABASE_SECRET_KEY);
    return Response.json([]);
  };
  const response = await createHandler({ env, fetchImpl })(request('/api/health'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, db: { configured: true, connected: true } });
});

test('returns 503 without server-side Supabase configuration', async () => {
  const response = await createHandler({ env: {} })(request('/api/health'));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).db.configured, false);
});

test('gets a key through the Supabase REST interface', async () => {
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('key'), 'eq.drawer profiles');
    return Response.json([{ key: 'drawer profiles', value: '{"profiles":{}}', updated_at: 123 }]);
  };
  const response = await createHandler({ env, fetchImpl })(request('/api/kv/drawer%20profiles'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    key: 'drawer profiles',
    value: '{"profiles":{}}',
    updatedAt: 123
  });
});

test('returns 404 when a key is absent', async () => {
  const response = await createHandler({ env, fetchImpl: async () => Response.json([]) })(request('/api/kv/missing'));
  assert.equal(response.status, 404);
});

test('upserts a string value and uses server time', async () => {
  const fetchImpl = async (url, init) => {
    assert.match(url, /\?on_conflict=key$/);
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Prefer, 'resolution=merge-duplicates,return=representation');
    assert.deepEqual(JSON.parse(init.body), { key: 'drawer-days', value: '{"days":[]}', updated_at: 456 });
    return Response.json([{ key: 'drawer-days', updated_at: 456 }]);
  };
  const response = await createHandler({ env, fetchImpl, now: () => 456 })(request('/api/kv/drawer-days', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: '{"days":[]}', updatedAt: 1 })
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, key: 'drawer-days', updatedAt: 456 });
});

test('rejects non-string sync values', async () => {
  const response = await createHandler({ env, fetchImpl: async () => assert.fail('fetch should not run') })(request('/api/kv/key', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: { unsafe: true } })
  }));
  assert.equal(response.status, 400);
});

test('maps Supabase failures to a safe 503 response', async () => {
  const fetchImpl = async () => new Response('{"message":"private detail"}', { status: 500 });
  const response = await createHandler({ env, fetchImpl })(request('/api/health'));
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error, 'Sync database is unavailable');
  assert.equal(JSON.stringify(body).includes('private detail'), false);
});
