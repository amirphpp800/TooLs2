(function(){
  'use strict';
  const $ = (s, c=document)=>c.querySelector(s);
  async function getAddress() {
    const country = $('#scanner-country').value;
    const statusEl = $('#scanner-status');
    const resultEl = $('#address-result');
    
    try {
      statusEl.textContent = 'در حال دریافت آدرس...';
      
      // Get address from the new scanner API
      const res = await fetch(`/api/scanner/addresses?country=${country}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          statusEl.textContent = 'متأسفانه آدرسی برای این کشور موجود نیست.';
        } else {
          statusEl.textContent = 'خطا در دریافت آدرس. لطفاً دوباره تلاش کنید.';
        }
        return;
      }

      const data = await res.json();
      
      // Show the address to user
      showAddressResult(data.address);
      statusEl.textContent = data.remaining > 0 ? 
        `آدرس دریافت شد. ${data.remaining} آدرس دیگر موجود است.` : 
        'آدرس دریافت شد. این آخرین آدرس موجود بود.';

    } catch (error) {
      console.error('Error getting address:', error);
      statusEl.textContent = 'خطا در دریافت آدرس. لطفاً دوباره تلاش کنید.';
    }
  }

  function showAddressResult(address) {
    const resultEl = $('#address-result');
    const addressEl = $('#received-address');
    
    addressEl.textContent = address;
    resultEl.style.display = 'block';
    
    // Scroll to result
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      console.error('Copy failed:', err);
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

  function resetForm() {
    const resultEl = $('#address-result');
    const statusEl = $('#scanner-status');
    
    resultEl.style.display = 'none';
    statusEl.textContent = '';
    
    // Scroll back to top
    document.querySelector('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function updateCountryStats() {
    const country = $('#scanner-country').value;
    const statusEl = $('#scanner-status');
    
    try {
      const res = await fetch('/api/scanner/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ country })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.available > 0) {
          statusEl.textContent = `${data.available} آدرس برای این کشور موجود است.`;
        } else {
          statusEl.textContent = 'متأسفانه آدرسی برای این کشور موجود نیست.';
        }
      }
    } catch (error) {
      console.error('Error getting stats:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    // Event listeners
    $('#btn-get-address')?.addEventListener('click', getAddress);
    $('#btn-copy-address')?.addEventListener('click', copyAddress);
    $('#btn-get-another')?.addEventListener('click', resetForm);
    $('#scanner-country')?.addEventListener('change', updateCountryStats);
    
    // Load initial stats
    updateCountryStats();
  });
})();
