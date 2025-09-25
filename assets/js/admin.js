(function(){
  'use strict';
  const $ = (s, c=document)=>c.querySelector(s);
  let adminToken = '';
  let currentCountry = 'uk'; // Default to UK

  async function getJSON(url, opts={}){
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // KV Storage functions
  async function saveToKV(key, value) {
    if (!adminToken) throw new Error('Admin token required');

    await getJSON(`/api/kv/${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(value)
    });
  }

  async function getFromKV(key) {
    try {
      return await getJSON(`/api/kv/${key}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
    } catch (e) {
      return null;
    }
  }

  async function deleteFromKV(key) {
    if (!adminToken) throw new Error('Admin token required');

    await fetch(`/api/kv/${key}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
  }

  // Scanner address management
  async function loadAddresses() {
    try {
      const addresses = await getFromKV(`scanner_addresses_${currentCountry}`) || [];
      const usedAddresses = await getFromKV(`used_addresses_${currentCountry}`) || [];
      
      updateAddressesList(addresses, usedAddresses);
      updateStats(addresses, usedAddresses);
    } catch (e) {
      console.error('Error loading addresses:', e);
      $('#addresses-list').innerHTML = '<div style="padding:20px; text-align:center; color:var(--muted);">خطا در بارگذاری آدرس‌ها</div>';
    }
  }

  function updateAddressesList(addresses, usedAddresses) {
    const container = $('#addresses-list');
    if (!addresses.length) {
      container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--muted);">آدرسی موجود نیست</div>';
      return;
    }

    const html = addresses.map((addr, index) => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; border-bottom:1px solid var(--stroke);">
        <span style="font-family:monospace; color:var(--text);">${addr}</span>
        <button class="btn" style="padding:4px 8px; font-size:0.8rem;" onclick="removeAddress(${index})">حذف</button>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  function updateStats(addresses, usedAddresses) {
    $('#total-addresses').textContent = addresses.length + usedAddresses.length;
    $('#used-addresses').textContent = usedAddresses.length;
    $('#remaining-addresses').textContent = addresses.length;
  }

  async function addAddresses() {
    const input = $('#addresses-input').value.trim();
    if (!input) return alert('آدرس‌هایی را وارد کنید');

    // Accept only IPv4 addresses, no port
    const ipv4Regex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    const lines = input.split('\n').map(line => line.trim()).filter(Boolean);
    const newAddresses = lines.filter(line => ipv4Regex.test(line));

    if (!newAddresses.length) {
      return alert('آدرس معتبری یافت نشد. فقط IP نسخه 4 بدون پورت وارد کنید (مثال: 1.2.3.4)');
    }

    try {
      const existingAddresses = await getFromKV(`scanner_addresses_${currentCountry}`) || [];
      const allAddresses = [...existingAddresses, ...newAddresses];
      
      await saveToKV(`scanner_addresses_${currentCountry}`, allAddresses);
      
      $('#addresses-input').value = '';
      loadAddresses();
      
      alert(`${newAddresses.length} آدرس IPv4 اضافه شد`);
    } catch (e) {
      console.error('Error adding addresses:', e);
      alert('خطا در اضافه کردن آدرس‌ها');
    }
  }

  async function clearAddresses() {
    if (!confirm('آیا مطمئن هستید که می‌خواهید همه آدرس‌ها را پاک کنید؟')) return;

    try {
      await deleteFromKV(`scanner_addresses_${currentCountry}`);
      await deleteFromKV(`used_addresses_${currentCountry}`);
      
      loadAddresses();
      alert('همه آدرس‌ها پاک شدند');
    } catch (e) {
      console.error('Error clearing addresses:', e);
      alert('خطا در پاک کردن آدرس‌ها');
    }
  }

  // Make removeAddress global so it can be called from HTML
  window.removeAddress = async function(index) {
    try {
      const addresses = await getFromKV(`scanner_addresses_${currentCountry}`) || [];
      addresses.splice(index, 1);
      await saveToKV(`scanner_addresses_${currentCountry}`, addresses);
      loadAddresses();
    } catch (e) {
      console.error('Error removing address:', e);
      alert('خطا در حذف آدرس');
    }
  }

  function onCountryChange() {
    currentCountry = $('#country-select').value;
    loadAddresses();
  }

  // Admin Login: send 5-digit OTP
  async function adminSend(){
    const u = ($('#adm-user').value||'');
    const p = ($('#adm-pass').value||'');
    const id = ($('#adm-id').value||'').trim();
    if (!u || !p || !/^\d+$/.test(id)) {
      $('#adm-status').textContent = 'نام کاربری، رمز و آیدی عددی را درست وارد کنید.';
      return;
    }

    try {
      const h = 'Basic ' + btoa(`${u}:${p}`);
      const res = await fetch(`/api/admin/login`, { method:'POST', headers: { 'Authorization': h, 'Content-Type':'application/json' }, body: JSON.stringify({ admin_id: id }) });
      const data = await res.json().catch(()=>({}));
      $('#adm-status').textContent = res.ok ? 'کد ارسال شد.' : ((data?.error || 'خطا در ارسال کد') + (data?.details ? ` (${data.details})` : ''));
      if (res.ok) $('#admin-otp-section').style.display = 'block';
    } catch (error) {
      $('#adm-status').textContent = 'خطا در برقراری ارتباط با سرور.';
    }
  }

  // Admin Verify: get bearer token
  async function adminVerify(){
    const id = ($('#adm-id').value||'').trim();
    const code = ($('#adm-otp').value||'').trim();
    if (!/^\d{5}$/.test(code)) return alert('کد ۵ رقمی را درست وارد کنید.');
    const res = await fetch(`/api/admin/verify`, { method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ admin_id: id, code }) });
    const data = await res.json().catch(()=>({}));
    if (res.ok && data?.token){ 
      adminToken = data.token; 
      $('#adm-status').textContent = 'ورود ادمین موفق بود.'; 
      showAdminDashboard();
    }
    else { $('#adm-status').textContent = data?.error || 'کد نامعتبر است.'; }
  }

  function showAdminDashboard() {
    // Hide login section and show dashboard
    const loginSection = document.querySelector('#admin-page > div');
    const dashboardSection = $('#admin-dashboard');
    
    if (loginSection) loginSection.style.display = 'none';
    if (dashboardSection) {
      dashboardSection.style.display = 'block';
      loadAddresses(); // Load addresses for default country
    }
  }

  // System Status Check
  async function checkSystemStatus() {
    const kvIndicator = $('#kv-indicator');
    const kvText = $('#kv-text');
    const apiIndicator = $('#api-indicator');
    const apiText = $('#api-text');
    const envIndicator = $('#env-indicator');
    const envText = $('#env-text');

    // Default states
    setStatus(kvIndicator, kvText, 'warning', 'نامشخص');
    setStatus(apiIndicator, apiText, 'warning', 'در حال بررسی');
    setStatus(envIndicator, envText, 'warning', 'در حال بررسی');

    try {
      const res = await fetch(`/api/health`);
      if (!res.ok) {
        setStatus(apiIndicator, apiText, 'warning', `خطا ${res.status}`);
        return;
      }
      const data = await res.json();

      // API
      setStatus(apiIndicator, apiText, 'online', 'متصل');

      // KV
      const kvOk = data?.services?.kv === 'ok';
      setStatus(kvIndicator, kvText, kvOk ? 'online' : 'offline', kvOk ? 'متصل' : 'قطع');

      // ENV details
      const botSet = data?.services?.bot_token === 'set';
      const adminSet = data?.services?.admin_credentials === 'set';
      const envMsg = `BOT_TOKEN: ${botSet ? 'تنظیم شده' : 'ناموجود'} | Admin: ${adminSet ? 'تنظیم شده' : 'ناموجود'}`;
      setStatus(envIndicator, envText, botSet && adminSet ? 'online' : 'warning', envMsg);
    } catch (e) {
      setStatus(apiIndicator, apiText, 'offline', 'قطع');
    }
  }

  async function checkKVStatus() {
    const indicator = $('#kv-indicator');
    const text = $('#kv-text');
    
    try {
      // Try to read/write a test value
      await saveToKV('test_connection', { timestamp: Date.now() });
      const testData = await getFromKV('test_connection');
      
      if (testData && testData.timestamp) {
        setStatus(indicator, text, 'online', 'متصل');
      } else {
        setStatus(indicator, text, 'warning', 'مشکوک');
      }
    } catch (error) {
      setStatus(indicator, text, 'offline', 'قطع');
    }
  }

  async function checkAPIStatus() {
    const indicator = $('#api-indicator');
    const text = $('#api-text');

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`/api/health`, { 
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setStatus(indicator, text, 'online', 'متصل');
      } else {
        setStatus(indicator, text, 'warning', `خطا ${response.status}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus(indicator, text, 'offline', 'تایم‌اوت');
      } else {
        setStatus(indicator, text, 'offline', 'قطع');
      }
    }
  }

  function checkENVStatus() {
    const indicator = $('#env-indicator');
    const text = $('#env-text');
    setStatus(indicator, text, 'online', 'محیط تولید فعال');
  }

  function setStatus(indicator, text, status, message) {
    if (!indicator || !text) return;
    
    // Remove all status classes
    indicator.classList.remove('online', 'offline', 'warning');
    
    // Add new status class
    indicator.classList.add(status);
    
    // Update text
    text.textContent = message;
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // Admin login handlers
    $('#btn-admin-send')?.addEventListener('click', adminSend);
    $('#btn-admin-verify')?.addEventListener('click', adminVerify);

    // Scanner management handlers
    $('#country-select')?.addEventListener('change', onCountryChange);
    $('#btn-add-addresses')?.addEventListener('click', addAddresses);
    $('#btn-clear-addresses')?.addEventListener('click', clearAddresses);

    // System status handlers
    $('#btn-refresh-status')?.addEventListener('click', checkSystemStatus);

    // Check system status on load with a small delay to ensure elements are ready
    setTimeout(() => {
      checkSystemStatus();
    }, 500);
  });
})();
