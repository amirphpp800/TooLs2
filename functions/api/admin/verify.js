import { json, handleOptions } from '../../_utils';

export async function onRequestOptions() { return handleOptions(); }

// Step 2: Verify 5-digit OTP and issue admin bearer token
export async function onRequestPost({ request, env }) {
  const { DATABASE } = env;
  const body = await request.json();
  const admin_id = String(body?.admin_id || '').trim();
  const code = String(body?.code || '').trim();
  if (!admin_id || !code) return json({ error: 'admin_id and code required' }, 400);
  const stored = await DATABASE.get(`admin:otp:${admin_id}`, { type: 'text' });
  if (!stored || stored !== code) return json({ error: 'invalid code' }, 400);
  const token = genToken();
  await DATABASE.put(`admin:session:${token}`, admin_id, { expirationTtl: 60 * 60 * 12 }); // 12h
  return json({ token });
}

function genToken(){
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
}
