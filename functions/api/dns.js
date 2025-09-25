import { json, handleOptions, requireAdmin, unauthorized, requireUser } from '../_utils';

export async function onRequestOptions() { return handleOptions(); }

export async function onRequestGet({ env }) {
  const value = await env.DATABASE.get('dns', { type: 'text' });
  let data; try { data = value ? JSON.parse(value) : { countries: [] }; } catch { data = { countries: [] }; }
  const out = {
    countries: (data.countries || []).map(c => ({
      code: c.code,
      name: c.name,
      total: (c.endpoints?.length || 0) + (c.busy?.length || 0),
      busy: c.busy?.length || 0,
      available: c.endpoints?.length || 0,
    }))
  };
  return json(out);
}

export async function onRequestPut({ request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorized();
  const body = await request.json();
  if (!body || typeof body !== 'object' || !Array.isArray(body.countries)) {
    return json({ error: 'Body must be { countries: [...] }' }, 400);
  }
  const norm = {
    countries: body.countries.map(c => ({
      code: String(c.code || '').toUpperCase(),
      name: c.name || c.code,
      endpoints: Array.isArray(c.endpoints) ? c.endpoints : [],
      busy: Array.isArray(c.busy) ? c.busy : [],
    }))
  };
  await env.DATABASE.put('dns', JSON.stringify(norm));
  return json({ ok: true });
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/allocate')) {
    const userId = await requireUser(request, env);
    if (!userId) return new Response('Forbidden', { status: 403 });
    const body = await request.json();
    const code = String(body?.code || '').toUpperCase();
    if (!code) return json({ error: 'code is required' }, 400);
    const value = await env.DATABASE.get('dns', { type: 'text' });
    let data; try { data = value ? JSON.parse(value) : { countries: [] }; } catch { data = { countries: [] }; }
    const idx = (data.countries||[]).findIndex(c=>c.code===code);
    if (idx === -1) return json({ error: 'country not found' }, 404);
    const c = data.countries[idx];
    c.endpoints = c.endpoints || [];
    c.busy = c.busy || [];
    if (!c.endpoints.length) return json({ error: 'no available endpoint' }, 409);
    const endpoint = c.endpoints.shift();
    c.busy.push(endpoint);
    data.countries[idx] = c;
    await env.DATABASE.put('dns', JSON.stringify(data));
    return json({ ok: true, endpoint });
  }
  if (url.pathname.endsWith('/release')) {
    if (!(await requireAdmin(request, env))) return unauthorized();
    const body = await request.json();
    const code = String(body?.code || '').toUpperCase();
    const endpoint = String(body?.endpoint || '');
    if (!code || !endpoint) return json({ error: 'code and endpoint are required' }, 400);
    const value = await env.DATABASE.get('dns', { type: 'text' });
    let data; try { data = value ? JSON.parse(value) : { countries: [] }; } catch { data = { countries: [] }; }
    const idx = (data.countries||[]).findIndex(c=>c.code===code);
    if (idx === -1) return json({ error: 'country not found' }, 404);
    const c = data.countries[idx];
    c.endpoints = c.endpoints || [];
    c.busy = c.busy || [];
    const bidx = c.busy.indexOf(endpoint);
    if (bidx !== -1) { c.busy.splice(bidx,1); c.endpoints.push(endpoint); }
    data.countries[idx] = c;
    await env.DATABASE.put('dns', JSON.stringify(data));
    return json({ ok: true });
  }
  return json({ error: 'Not found' }, 404);
}
