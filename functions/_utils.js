export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders, ...extra },
  });
}

export function parseBasic(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) return null;
  try {
    const decoded = atob(authHeader.slice(6));
    const idx = decoded.indexOf(':');
    if (idx === -1) return null;
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch { return null; }
}

export function isAdmin(request, env) {
  const { ADMIN_USER, ADMIN_PASS } = env;
  const auth = request.headers.get('Authorization') || '';
  const creds = parseBasic(auth);
  if (!creds) return false;
  const userOk = !!ADMIN_USER && creds.user === ADMIN_USER;
  const passOk = !!ADMIN_PASS && creds.pass === ADMIN_PASS;
  return userOk && passOk;
}

export async function isAdminBearer(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  const who = await env.DATABASE.get(`admin:session:${token}`, { type: 'text' });
  return Boolean(who);
}

export async function requireAdmin(request, env) {
  if (isAdmin(request, env)) return true;
  if (await isAdminBearer(request, env)) return true;
  return false;
}

export function unauthorized() {
  return new Response('Unauthorized', { status: 401, headers: { ...corsHeaders, 'WWW-Authenticate': 'Basic realm="admin"' } });
}

export function forbidden() { return new Response('Forbidden', { status: 403, headers: corsHeaders }); }

export async function requireUser(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  const userId = await env.DATABASE.get(`auth:session:${token}`, { type: 'text' });
  return userId || null;
}

export function generateCode() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

export function generateAdminCode() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

export function cryptoRandom() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function handleOptions() {
  return new Response(null, { headers: corsHeaders });
}
