import { json, handleOptions, isAdmin, unauthorized } from '../../_utils';

export async function onRequestOptions() { return handleOptions(); }

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  const info = {
    hasKV: Boolean(env.DATABASE),
    hasBotToken: Boolean(env.BOT_TOKEN),
    adminUserSet: Boolean(env.ADMIN_USER),
    adminPassSet: Boolean(env.ADMIN_PASS),
  };
  return json(info);
}
