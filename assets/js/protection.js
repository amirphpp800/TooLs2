(function(){
  'use strict';
  
  // Anti-scraping protection
  function initProtection() {
    // Disable right-click context menu
    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      return false;
    });

    // Disable text selection
    document.addEventListener('selectstart', function(e) {
      e.preventDefault();
      return false;
    });

    // Disable drag
    document.addEventListener('dragstart', function(e) {
      e.preventDefault();
      return false;
    });

    // Disable F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S
    document.addEventListener('keydown', function(e) {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+I (Developer Tools)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+S (Save Page)
      if (e.ctrlKey && e.keyCode === 83) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+A (Select All)
      if (e.ctrlKey && e.keyCode === 65) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+C (Copy)
      if (e.ctrlKey && e.keyCode === 67) {
        e.preventDefault();
        return false;
      }
    });

    // Detect developer tools
    let devtools = {
      open: false,
      orientation: null
    };
    
    const threshold = 160;
    
    setInterval(function() {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          // Redirect or block access
          document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:Arial;text-align:center;"><div><h1>دسترسی محدود</h1><p>این سایت از ابزارهای توسعه‌دهنده محافظت می‌کند</p></div></div>';
        }
      } else {
        devtools.open = false;
      }
    }, 500);

    // Detect common scraping user agents
    const scrapingAgents = [
      'wget', 'curl', 'python', 'scrapy', 'beautifulsoup', 'requests',
      'selenium', 'phantomjs', 'headless', 'bot', 'crawler', 'spider',
      'downloader', 'extractor', 'scraper', 'harvester'
    ];
    
    const userAgent = navigator.userAgent.toLowerCase();
    for (let agent of scrapingAgents) {
      if (userAgent.includes(agent)) {
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:Arial;text-align:center;"><div><h1>دسترسی غیرمجاز</h1><p>این سایت فقط برای مرورگرهای معمولی در دسترس است</p></div></div>';
        return;
      }
    }

    // Obfuscate HTML content
    setTimeout(function() {
      const elements = document.querySelectorAll('*');
      elements.forEach(function(el) {
        if (el.tagName && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
          el.setAttribute('data-protected', 'true');
        }
      });
    }, 1000);

    // Disable print
    window.addEventListener('beforeprint', function(e) {
      e.preventDefault();
      alert('چاپ این صفحه مجاز نیست');
      return false;
    });

    // Clear clipboard
    document.addEventListener('copy', function(e) {
      e.clipboardData.setData('text/plain', '');
      e.preventDefault();
    });

    // Detect iframe embedding
    if (window.top !== window.self) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:Arial;text-align:center;"><div><h1>دسترسی محدود</h1><p>این سایت نمی‌تواند در iframe نمایش داده شود</p></div></div>';
    }

    // Console warning removed per request
  }

  // Initialize protection when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProtection);
  } else {
    initProtection();
  }
})();
