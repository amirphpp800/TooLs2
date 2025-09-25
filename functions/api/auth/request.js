import { json, handleOptions, generateCode } from '../../_utils';

export async function onRequestOptions() { return handleOptions(); }

export async function onRequestPost({ request, env }) {
  const { DATABASE, BOT_TOKEN } = env;
  const body = await request.json();
  const telegramId = String(body?.telegram_id || '').trim();
  if (!telegramId) return json({ error: 'telegram_id is required' }, 400);
  if (!BOT_TOKEN) return json({ error: 'bot token not configured' }, 500);

  const code = generateCode();
  await DATABASE.put(`auth:code:${telegramId}`, code, { expirationTtl: 300 });

  const text = `کد تایید شما: ${code}`;
  const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const resTG = await fetch(tgUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: Number(telegramId), text }) });
  if (!resTG.ok) {
    let details = '';
    try { details = await resTG.text(); } catch {}
    return json({ error: 'failed to send code', status: resTG.status, details }, 502);
  }

  return json({ ok: true });
}
