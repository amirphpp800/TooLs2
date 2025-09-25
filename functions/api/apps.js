import { json, corsHeaders, handleOptions, requireAdmin, unauthorized } from '../_utils';

export async function onRequestOptions() { return handleOptions(); }

export async function onRequestGet({ env }) {
  const value = await env.DATABASE.get('apps', { type: 'text' });
  let data; try { data = value ? JSON.parse(value) : { apps: [] }; } catch { data = { apps: [] }; }
  return json(data);
}

export async function onRequestPut({ request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorized();
  const body = await request.json();
  if (!body || typeof body !== 'object' || !Array.isArray(body.apps)) {
    return json({ error: 'Body must be { apps: [...] }' }, 400);
  }
  await env.DATABASE.put('apps', JSON.stringify(body));
  return json({ ok: true });
}
