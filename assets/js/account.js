(function(){
  'use strict';
  const $ = (s, c=document)=>c.querySelector(s);
  // Use relative API URLs
  const getStatus = ()=> $('#auth-status');

  function setToken(token){ localStorage.setItem('auth_token', token); }
  function getToken(){ return localStorage.getItem('auth_token') || ''; }
  function clearToken(){ localStorage.removeItem('auth_token'); }

  function maskId(id){ return id ? id.slice(0,3) + '••••••' + id.slice(-3) : '******'; }

  async function loadProfile(){
    try {
      
      const token = getToken(); 
      if (!token) return;
      
      const res = await fetch(`/api/me`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      showDashboard(data?.user || {});
    } catch (e){ 
      console.warn('profile load failed', e); 
    }
  }

  function showDashboard(user = {}){
    // Hide login section and show dashboard
    const loginSection = $('#login-section');
    const dashboardSection = $('#dashboard-section');
    
    if (loginSection) loginSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'block';
    
    // Update user info
    const userName = $('#user-name');
    const userId = $('#user-id');
    const userPlan = $('#user-plan');
    
    if (userName) userName.textContent = user.name || 'کاربر گرامی';
    if (userId) userId.textContent = `ID: ${maskId(user.telegram_id)}`;
    if (userPlan) userPlan.textContent = user.plan || 'پلن پایه';
    
    // Update stats
    const downloadCount = $('#download-count');
    const configCount = $('#config-count');
    const daysLeft = $('#days-left');
    const trafficUsed = $('#traffic-used');
    
    if (downloadCount) downloadCount.textContent = user.downloads || '0';
    if (configCount) configCount.textContent = user.configs || '0';
    if (daysLeft) daysLeft.textContent = user.days_left || '∞';
    if (trafficUsed) trafficUsed.textContent = user.traffic_used || '0 GB';
    
    // Animate stats with counter effect
    animateStats();
    
    // Setup logout button after dashboard is shown
    setTimeout(() => {
      const logoutBtn = $('#btn-logout');
      if (logoutBtn) {
        console.log('Setting up logout button after dashboard shown');
        // Remove any existing listeners
        logoutBtn.replaceWith(logoutBtn.cloneNode(true));
        const newLogoutBtn = $('#btn-logout');
        newLogoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Dashboard logout button clicked');
          logout();
          return false;
        });
      }
    }, 100);
  }

  function animateStats() {
    const stats = ['download-count', 'config-count'];
    stats.forEach(id => {
      const el = $(`#${id}`);
      if (!el) return;
      
      const target = parseInt(el.textContent) || 0;
      let current = 0;
      const increment = Math.ceil(target / 20);
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = current;
      }, 50);
    });
  }

  async function requestCode(){
    const id = ($('#tg-id').value||'').trim();
    const btn = $('#btn-request-code');
    
    if (!/^\d+$/.test(id)) {
      const status = getStatus();
      if (status) status.textContent = 'شناسه عددی تلگرام را صحیح وارد کنید.';
      return;
    }
    
    // Add loading state
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'در حال ارسال...';
    }
    
    try {
      const res = await fetch(`/api/auth/request`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ telegram_id: id }) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) {
        const status = getStatus();
        if (status) {
          let errorMsg = data?.error || 'ارسال کد ناموفق بود.';
          if (res.status === 502 || errorMsg.includes('failed to send code')) {
            errorMsg = `خطا در ارسال کد. لطفاً مطمئن شوید که:<br>
              <small style="color:var(--muted); display:block; margin-top:4px;">
                • ربات <a href="https://t.me/protoolsverify_bot" target="_blank" style="color:var(--accent);">@protoolsverify_bot</a> را استارت کرده‌اید<br>
                • شناسه عددی تلگرام صحیح است
              </small>`;
          }
          status.innerHTML = errorMsg;
        }
        return;
      }
      const status2 = getStatus();
      if (status2) {
        status2.innerHTML = `
          کد ارسال شد. تلگرام خود را بررسی کنید.<br>
          <small style="color:var(--muted); margin-top:4px; display:block;">
            اگر کد دریافت نکردید، مطمئن شوید که ربات 
            <a href="https://t.me/protoolsverify_bot" target="_blank" style="color:var(--accent);">@protoolsverify_bot</a> 
            را استارت کرده‌اید.
          </small>
        `;
      }
      $('#otp-section').style.display = 'block';
    } catch (error) {
      const status = getStatus();
      if (status) status.textContent = 'خطا در برقراری ارتباط با سرور.';
    } finally {
      // Reset button state
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'دریافت کد تایید';
      }
    }
  }

  async function verify(){
    
    const id = ($('#tg-id').value||'').trim();
    const code = ($('#otp').value||'').trim();
    if (!/^\d{4}$/.test(code)) return alert('کد ۴ رقمی را صحیح وارد کنید.');
    const res = await fetch(`/api/auth/verify`, { method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ telegram_id:id, code }) });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data?.token) return alert(data?.error || 'تایید ناموفق بود.');
    setToken(data.token);
    const status = getStatus();
    if (status) status.textContent = 'حساب تایید شد.';
    loadProfile();
  }

  function updateState(){
    const token = getToken();
    const loginSection = $('#login-section');
    const dashboardSection = $('#dashboard-section');
    
    if (token) {
      if (loginSection) loginSection.style.display = 'none';
      if (dashboardSection) dashboardSection.style.display = 'block';
      loadProfile();
    } else {
      if (loginSection) loginSection.style.display = 'block';
      if (dashboardSection) dashboardSection.style.display = 'none';
      $('#otp-section').style.display = 'none';
    }
  }

  function logout(){
    clearToken();
    
    // Clear any status messages
    const status = getStatus();
    if (status) status.textContent = 'خروج انجام شد.';
    
    // Reset form
    const tgIdInput = $('#tg-id');
    const otpInput = $('#otp');
    const otpSection = $('#otp-section');
    
    if (tgIdInput) tgIdInput.value = '';
    if (otpInput) otpInput.value = '';
    if (otpSection) otpSection.style.display = 'none';
    
    // Stay on the same page and show login section
    updateState();
    
    // Clear the status message after a short delay
    setTimeout(() => {
      if (status) status.textContent = '';
    }, 2000);
  }

  function setupDashboardActions() {
    // Get config button
    const getConfigBtn = $('#btn-get-config');
    if (getConfigBtn) {
      getConfigBtn.addEventListener('click', async () => {
        try {
          const token = getToken();
          if (!token) return;
          
          const res = await fetch('/api/config/request', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (res.ok) {
            const status = getStatus();
            if (status) status.textContent = 'درخواست کانفیگ ارسال شد. کانفیگ از طریق تلگرام ارسال خواهد شد.';
          } else {
            const status = getStatus();
            if (status) status.textContent = 'خطا در درخواست کانفیگ. لطفا دوباره تلاش کنید.';
          }
        } catch (error) {
          const status = getStatus();
          if (status) status.textContent = 'خطا در برقراری ارتباط با سرور.';
        }
      });
    }
  }

  

  document.addEventListener('DOMContentLoaded', ()=>{
    // Wait a bit for components to load
    setTimeout(() => {
      $('#btn-request-code')?.addEventListener('click', requestCode);
      $('#btn-verify')?.addEventListener('click', verify);
      
      
      // Handle logout buttons (in login and dashboard sections)
      document.addEventListener('click', (e) => {
        if (e.target.id === 'btn-logout') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('Logout button clicked');
          logout();
          return false;
        }
      });
      
      // Also add direct event listener for logout button
      const logoutBtn = $('#btn-logout');
      if (logoutBtn) {
        console.log('Direct logout button found, adding event listener');
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Direct logout button clicked');
          logout();
          return false;
        });
      }
      
      setupDashboardActions();
      updateState();
      
      
    }, 500);
  });
})();
