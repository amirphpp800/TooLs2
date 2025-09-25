(function(){
  'use strict';
  
  // Global error handler
  window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showErrorNotification('خطای غیرمنتظره‌ای رخ داد. لطفاً صفحه را تازه‌سازی کنید.');
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showErrorNotification('خطا در بارگذاری داده‌ها. لطفاً دوباره تلاش کنید.');
    event.preventDefault();
  });

  function showErrorNotification(message) {
    // Check if notification already exists
    if (document.querySelector('.error-notification')) return;
    
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(239, 68, 68, 0.9);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      z-index: 1000;
      max-width: 300px;
      font-size: 0.9rem;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(239, 68, 68, 0.3);
      animation: slideInRight 0.3s ease;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>⚠️</span>
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; margin-left: 8px;">×</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Export for manual use
  window.showErrorNotification = showErrorNotification;
})();
