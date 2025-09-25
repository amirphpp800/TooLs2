import { json, handleOptions } from '../_utils.js';

export async function onRequestOptions() { 
  return handleOptions(); 
}

export async function onRequestGet({ env }) {
  try {
    // Simple health check
    const timestamp = new Date().toISOString();
    
    // Test KV connection if available
    let kvStatus = 'missing';
    if (env.DATABASE) {
      try {
        await env.DATABASE.put('health_check', timestamp, { expirationTtl: 60 });
        const testValue = await env.DATABASE.get('health_check');
        kvStatus = testValue ? 'ok' : 'error';
      } catch (e) {
        kvStatus = 'error';
      }
    }
    
    // Environment presence checks
    const botTokenSet = Boolean(env.BOT_TOKEN && String(env.BOT_TOKEN).length > 0);
    const adminUserSet = Boolean(env.ADMIN_USER && String(env.ADMIN_USER).length > 0);
    const adminPassSet = Boolean(env.ADMIN_PASS && String(env.ADMIN_PASS).length > 0);
    const adminCredsSet = adminUserSet && adminPassSet;
    
    return json({
      status: 'ok',
      timestamp,
      version: '1.0.0',
      services: {
        kv: kvStatus,
        bot_token: botTokenSet ? 'set' : 'missing',
        admin_credentials: adminCredsSet ? 'set' : 'missing'
      }
    });
  } catch (error) {
    return json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
}
