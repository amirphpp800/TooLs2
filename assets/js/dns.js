(function(){
  'use strict';
  const $ = (s, c=document)=>c.querySelector(s);
  // KV Storage functions
  async function getFromKV(key) {
    try {
      const res = await fetch(`/api/kv/${key}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  async function saveToKV(key, value) {
    await fetch(`/api/kv/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    });
  }

  // Load live stats for all countries
  async function loadLiveStats() {
    const countries = ['uk', 'tr', 'de', 'qa', 'dz'];
    const isLoggedIn = isUserLoggedIn();
    const userId = getUserId();
    
    for (const country of countries) {
      try {
        const addresses = await getFromKV(`scanner_addresses_${country}`) || [];
        const usedAddresses = await getFromKV(`used_addresses_${country}`) || [];
        
        const total = addresses.length + usedAddresses.length;
        const free = addresses.length;
        const used = usedAddresses.length;
        
        updateCountryStats(country, total, free, used);
        
        const btn = $(`.dns-get-btn[data-country="${country}"]`);
        if (btn) {
          // Check if user is logged in
          if (!isLoggedIn) {
            btn.disabled = true;
            btn.textContent = 'ورود لازم';
            btn.style.opacity = '0.6';
            btn.title = 'برای دریافت آدرس ابتدا وارد حساب کاربری شوید';
          }
          // Check if no addresses available
          else if (free === 0) {
            btn.disabled = true;
            btn.textContent = 'ناموجود';
            btn.style.opacity = '0.5';
            btn.title = 'آدرسی برای این کشور موجود نیست';
          }
          // Check 24-hour limit
          else if (userId) {
            const canRequest = await canUserGetAddress(country, userId);
            if (!canRequest) {
              const remainingTime = await getRemainingTime(country, userId);
              const timeText = formatRemainingTime(remainingTime);
              btn.disabled = true;
              btn.textContent = 'محدودیت 24 ساعته';
              btn.style.opacity = '0.6';
              btn.title = `زمان باقیمانده: ${timeText}`;
            } else {
              btn.disabled = false;
              btn.textContent = 'دریافت آدرس';
              btn.style.opacity = '1';
              btn.title = 'کلیک کنید تا آدرس دریافت کنید';
            }
          }
          // Default enabled state
          else {
            btn.disabled = false;
            btn.textContent = 'دریافت آدرس';
            btn.style.opacity = '1';
            btn.title = 'کلیک کنید تا آدرس دریافت کنید';
          }
        }
      } catch (error) {
        console.error(`Error loading stats for ${country}:`, error);
      }
    }
  }

  function updateCountryStats(country, total, free, used) {
    const totalEl = $(`[data-stat="total-${country}"]`);
    const freeEl = $(`[data-stat="free-${country}"]`);
    const usedEl = $(`[data-stat="used-${country}"]`);
    
    if (totalEl) animateNumber(totalEl, total);
    if (freeEl) animateNumber(freeEl, free);
    if (usedEl) animateNumber(usedEl, used);
  }

  function animateNumber(element, targetNumber) {
    const currentNumber = parseInt(element.textContent) || 0;
    if (currentNumber === targetNumber) return;
    
    const increment = targetNumber > currentNumber ? 1 : -1;
    let current = currentNumber;
    
    const timer = setInterval(() => {
      current += increment;
      element.textContent = current;
      
      if (current === targetNumber) {
        clearInterval(timer);
      }
    }, 50);
  }

  // Check if user is logged in
  function isUserLoggedIn() {
    const token = localStorage.getItem('auth_token');
    return !!token;
  }

  // Get user ID from token
  function getUserId() {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    
    // Return a hash of the token for user identification
    return btoa(token).substring(0, 16);
  }

  // Check if user can get address from this country (24h limit)
  async function canUserGetAddress(country, userId) {
    const userRequests = await getFromKV(`user_requests_${userId}_${country}`) || [];
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000); // 24 hours in milliseconds
    
    // Filter requests from last 24 hours
    const recentRequests = userRequests.filter(req => req.timestamp > oneDayAgo);
    
    return recentRequests.length === 0;
  }

  // Record user request
  async function recordUserRequest(country, userId, address) {
    const userRequests = await getFromKV(`user_requests_${userId}_${country}`) || [];
    const now = Date.now();
    
    // Add new request
    userRequests.push({
      timestamp: now,
      address: address,
      country: country
    });
    
    // Keep only last 7 days of requests to prevent unlimited growth
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const filteredRequests = userRequests.filter(req => req.timestamp > sevenDaysAgo);
    
    await saveToKV(`user_requests_${userId}_${country}`, filteredRequests);
  }

  // Get remaining time until user can request again
  async function getRemainingTime(country, userId) {
    const userRequests = await getFromKV(`user_requests_${userId}_${country}`) || [];
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const recentRequests = userRequests.filter(req => req.timestamp > oneDayAgo);
    
    if (recentRequests.length === 0) return 0;
    
    const lastRequest = Math.max(...recentRequests.map(req => req.timestamp));
    const nextAllowedTime = lastRequest + (24 * 60 * 60 * 1000);
    
    return Math.max(0, nextAllowedTime - now);
  }

  function formatRemainingTime(milliseconds) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} ساعت و ${minutes} دقیقه`;
    } else {
      return `${minutes} دقیقه`;
    }
  }

  async function getAddress(country) {
    try {
      // Check if user is logged in
      if (!isUserLoggedIn()) {
        alert('برای دریافت آدرس ابتدا باید وارد حساب کاربری خود شوید.\n\nلطفاً از منوی بالا روی "حساب کاربری" کلیک کنید.');
        return;
      }

      const userId = getUserId();
      if (!userId) {
        alert('خطا در تشخیص کاربر. لطفاً دوباره وارد شوید.');
        return;
      }

      // Check 24-hour limit
      const canRequest = await canUserGetAddress(country, userId);
      if (!canRequest) {
        const remainingTime = await getRemainingTime(country, userId);
        const timeText = formatRemainingTime(remainingTime);
        alert(`شما در 24 ساعت گذشته از این کشور آدرس دریافت کرده‌اید.\n\nزمان باقیمانده تا درخواست بعدی: ${timeText}`);
        return;
      }

      const addresses = await getFromKV(`scanner_addresses_${country}`) || [];
      
      if (addresses.length === 0) {
        alert('متأسفانه آدرسی برای این کشور موجود نیست.');
        return;
      }

      const randomIndex = Math.floor(Math.random() * addresses.length);
      const selectedAddress = addresses[randomIndex];

      // Remove address from available list
      addresses.splice(randomIndex, 1);
      await saveToKV(`scanner_addresses_${country}`, addresses);

      // Add to used addresses list
      const usedAddresses = await getFromKV(`used_addresses_${country}`) || [];
      usedAddresses.push({
        address: selectedAddress,
        timestamp: Date.now(),
        user_id: userId,
        country: country
      });
      await saveToKV(`used_addresses_${country}`, usedAddresses);

      // Record user request for 24h limit
      await recordUserRequest(country, userId, selectedAddress);

      showAddressModal(selectedAddress);
      loadLiveStats();

    } catch (error) {
      console.error('Error getting address:', error);
      alert('خطا در دریافت آدرس. لطفاً دوباره تلاش کنید.');
    }
  }

  function showAddressModal(address) {
    const modal = $('#address-modal');
    const addressEl = $('#received-address');
    
    addressEl.textContent = address;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = $('#address-modal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  function copyAddress() {
    const address = $('#received-address').textContent;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(address).then(() => {
        showCopyFeedback();
      }).catch(() => {
        fallbackCopy(address);
      });
    } else {
      fallbackCopy(address);
    }
  }

  function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      showCopyFeedback();
    } catch (err) {
      alert('خطا در کپی کردن. لطفاً دستی کپی کنید.');
    }
    
    document.body.removeChild(textArea);
  }

  function showCopyFeedback() {
    const btn = $('#btn-copy-address');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<img src="https://api.iconify.design/material-symbols/check.svg?color=%2300D4AA" style="width:16px; height:16px;" /> کپی شد!';
    btn.style.background = 'rgba(0,212,170,0.2)';
    btn.style.borderColor = '#00D4AA';
    
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
      btn.style.borderColor = '';
    }, 2000);
  }


  // Listen for auth state changes
  function setupAuthListener() {
    // Check for auth changes every few seconds
    let lastAuthState = isUserLoggedIn();
    
    setInterval(() => {
      const currentAuthState = isUserLoggedIn();
      if (currentAuthState !== lastAuthState) {
        lastAuthState = currentAuthState;
        loadLiveStats(); // Refresh button states
      }
    }, 2000);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    loadLiveStats();
    
    // Setup auth state monitoring
    setupAuthListener();
    
    // Refresh stats every 30 seconds
    setInterval(loadLiveStats, 30000);
    
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.dns-get-btn');
      if (btn && !btn.disabled) {
        e.preventDefault();
        const country = btn.getAttribute('data-country');
        if (country) {
          getAddress(country);
        }
      }
    });
    
    $('#close-modal')?.addEventListener('click', closeModal);
    $('#btn-copy-address')?.addEventListener('click', copyAddress);
    
    $('#address-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'address-modal') {
        closeModal();
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && $('#address-modal').style.display === 'block') {
        closeModal();
      }
    });
  });
})();
