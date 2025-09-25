import { json, handleOptions, requireUser } from '../../_utils';

export async function onRequestOptions() { return handleOptions(); }

export async function onRequestPost({ request, env }) {
  const userId = await requireUser(request, env);
  if (!userId) return new Response('Unauthorized', { status: 401 });
  
  const { BOT_TOKEN } = env;
  if (!BOT_TOKEN) return json({ error: 'Bot token not configured' }, 500);
  
  try {
    // Get user profile
    const user = await env.DATABASE.get(`user:${userId}`, { type: 'json' });
    if (!user) return json({ error: 'User not found' }, 404);
    
    // Send config request message to user
    const text = `درخواست کانفیگ جدید دریافت شد.\n\nکانفیگ شما در حال آماده‌سازی است و به زودی ارسال خواهد شد.\n\n⏳ لطفا کمی صبر کنید...`;
    
    const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: Number(userId),
        text,
        parse_mode: 'HTML'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram API error:', errorText);
      return json({ error: 'Failed to send message' }, 502);
    }
    
    // Update user's config request count
    const updatedUser = {
      ...user,
      configs: (user.configs || 0) + 1,
      last_config_request: Date.now()
    };
    
    await env.DATABASE.put(`user:${userId}`, JSON.stringify(updatedUser));
    
    return json({ success: true, message: 'Config request sent successfully' });
    
  } catch (error) {
    console.error('Config request error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}
