import { json, handleOptions, requireUser } from '../_utils';

export async function onRequestOptions() { return handleOptions(); }

export async function onRequestGet({ request, env }) {
  const userId = await requireUser(request, env);
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const profile = await env.DATABASE.get(`user:${userId}`, { type: 'json' });
  return json({ user: profile || { telegram_id: userId } });
}
