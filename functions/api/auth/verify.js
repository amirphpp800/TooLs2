import { json, handleOptions, cryptoRandom } from '../../_utils';

export async function onRequestOptions() { return handleOptions(); }

export async function onRequestPost({ request, env }) {
  const { DATABASE } = env;
  const body = await request.json();
  const telegramId = String(body?.telegram_id || '').trim();
  const code = String(body?.code || '').trim();
  if (!telegramId || !code) return json({ error: 'telegram_id and code required' }, 400);
  const stored = await DATABASE.get(`auth:code:${telegramId}`, { type: 'text' });
  if (!stored || stored !== code) return json({ error: 'invalid code' }, 400);
  const token = cryptoRandom();
  await DATABASE.put(`auth:session:${token}`, telegramId, { expirationTtl: 60 * 60 * 24 * 30 });
  const now = Date.now();
  let user = await DATABASE.get(`user:${telegramId}`, { type: 'json' });
  if (!user) user = { telegram_id: telegramId, created_at: now };
  user.last_login = now;
  await DATABASE.put(`user:${telegramId}`, JSON.stringify(user));
  return json({ token });
}
