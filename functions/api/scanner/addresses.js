import { json, handleOptions } from '../../_utils';

export async function onRequestOptions() { return handleOptions(); }

// GET /api/scanner/addresses?country=uk - Get random address for a country
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const country = url.searchParams.get('country') || 'uk';
  
  try {
    // Get available addresses for the country
    const addresses = await env.DATABASE.get(`scanner_addresses_${country}`, { type: 'json' }) || [];
    
    if (addresses.length === 0) {
      return json({ error: 'No addresses available for this country' }, 404);
    }

    // Get a random address
    const randomIndex = Math.floor(Math.random() * addresses.length);
    const selectedAddress = addresses[randomIndex];

    // Remove the address from available list
    addresses.splice(randomIndex, 1);
    await env.DATABASE.put(`scanner_addresses_${country}`, JSON.stringify(addresses));

    // Add to used addresses list
    const usedAddresses = await env.DATABASE.get(`used_addresses_${country}`, { type: 'json' }) || [];
    usedAddresses.push({
      address: selectedAddress,
      timestamp: Date.now(),
      user_ip: request.headers.get('CF-Connecting-IP') || 'unknown'
    });
    await env.DATABASE.put(`used_addresses_${country}`, JSON.stringify(usedAddresses));

    return json({ 
      address: selectedAddress,
      remaining: addresses.length 
    });

  } catch (error) {
    console.error('Scanner error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}

// POST /api/scanner/addresses - Check available addresses count
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const country = body?.country || 'uk';
    
    const addresses = await env.DATABASE.get(`scanner_addresses_${country}`, { type: 'json' }) || [];
    const usedAddresses = await env.DATABASE.get(`used_addresses_${country}`, { type: 'json' }) || [];
    
    return json({
      country,
      available: addresses.length,
      used: usedAddresses.length,
      total: addresses.length + usedAddresses.length
    });
    
  } catch (error) {
    console.error('Scanner stats error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}
