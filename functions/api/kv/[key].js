import { json, handleOptions, requireAdmin, unauthorized } from '../../_utils';

export async function onRequestOptions() { return handleOptions(); }

// GET /api/kv/[key] - Read a key
export async function onRequestGet({ request, env, params }) {
  if (!await requireAdmin(request, env)) return unauthorized();
  
  const { key } = params;
  if (!key) return json({ error: 'Key is required' }, 400);
  
  try {
    const value = await env.DATABASE.get(`kv:${key}`, { type: 'json' });
    if (value === null) {
      return json({ error: 'Key not found' }, 404);
    }
    return json(value);
  } catch (error) {
    return json({ error: 'Failed to read key' }, 500);
  }
}

// PUT /api/kv/[key] - Write a key
export async function onRequestPut({ request, env, params }) {
  if (!await requireAdmin(request, env)) return unauthorized();
  
  const { key } = params;
  if (!key) return json({ error: 'Key is required' }, 400);
  
  try {
    const value = await request.json();
    await env.DATABASE.put(`kv:${key}`, JSON.stringify(value));
    return json({ success: true });
  } catch (error) {
    return json({ error: 'Failed to write key' }, 500);
  }
}

// DELETE /api/kv/[key] - Delete a key
export async function onRequestDelete({ request, env, params }) {
  if (!await requireAdmin(request, env)) return unauthorized();
  
  const { key } = params;
  if (!key) return json({ error: 'Key is required' }, 400);
  
  try {
    await env.DATABASE.delete(`kv:${key}`);
    return json({ success: true });
  } catch (error) {
    return json({ error: 'Failed to delete key' }, 500);
  }
}
