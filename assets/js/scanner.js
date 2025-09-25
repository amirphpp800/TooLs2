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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(value)
    });
  }

  async function getAddress() {
    const country = $('#scanner-country').value;
    const statusEl = $('#scanner-status');
    const resultEl = $('#address-result');
    
    try {
      statusEl.textContent = 'در حال دریافت آدرس...';
      
      // Get available addresses for the country
      const addresses = await getFromKV(`scanner_addresses_${country}`) || [];
      
      if (addresses.length === 0) {
        statusEl.textContent = 'متأسفانه آدرسی برای این کشور موجود نیست.';
        return;
      }

      // Get a random address
      const randomIndex = Math.floor(Math.random() * addresses.length);
      const selectedAddress = addresses[randomIndex];

      // Remove the address from available list
      addresses.splice(randomIndex, 1);
      await saveToKV(`scanner_addresses_${country}`, addresses);

      // Add to used addresses list
      const usedAddresses = await getFromKV(`used_addresses_${country}`) || [];
      usedAddresses.push({
        address: selectedAddress,
        timestamp: Date.now(),
        user_ip: 'hidden' // In real implementation, you might want to track this
      });
      await saveToKV(`used_addresses_${country}`, usedAddresses);

      // Show the address to user
      showAddressResult(selectedAddress);
      statusEl.textContent = '';

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

  document.addEventListener('DOMContentLoaded', async () => {
    // Event listeners
    $('#btn-get-address')?.addEventListener('click', getAddress);
    $('#btn-copy-address')?.addEventListener('click', copyAddress);
    $('#btn-get-another')?.addEventListener('click', resetForm);
  });
})();
