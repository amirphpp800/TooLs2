(function(){
  'use strict';
  
  // Performance monitoring
  function measurePerformance() {
    if (!window.performance) return;
    
    // Wait for page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (!perfData) return;
        
        const metrics = {
          dns: Math.round(perfData.domainLookupEnd - perfData.domainLookupStart),
          connection: Math.round(perfData.connectEnd - perfData.connectStart),
          request: Math.round(perfData.responseStart - perfData.requestStart),
          response: Math.round(perfData.responseEnd - perfData.responseStart),
          domParsing: Math.round(perfData.domInteractive - perfData.responseEnd),
          domReady: Math.round(perfData.domContentLoadedEventEnd - perfData.navigationStart),
          pageLoad: Math.round(perfData.loadEventEnd - perfData.navigationStart)
        };
        
        // Log performance metrics (in development)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.group('🚀 Performance Metrics');
          console.log('DNS Lookup:', metrics.dns + 'ms');
          console.log('Connection:', metrics.connection + 'ms');
          console.log('Request:', metrics.request + 'ms');
          console.log('Response:', metrics.response + 'ms');
          console.log('DOM Parsing:', metrics.domParsing + 'ms');
          console.log('DOM Ready:', metrics.domReady + 'ms');
          console.log('Page Load:', metrics.pageLoad + 'ms');
          console.groupEnd();
          
          // Show warning for slow metrics
          if (metrics.pageLoad > 3000) {
            console.warn('⚠️ Slow page load detected:', metrics.pageLoad + 'ms');
          }
        }
        
        // Store metrics for potential analytics
        window.performanceMetrics = metrics;
      }, 100);
    });
  }
  
  // Measure Core Web Vitals
  function measureWebVitals() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          const lcp = Math.round(lastEntry.startTime);
          
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('🎯 LCP (Largest Contentful Paint):', lcp + 'ms');
            if (lcp > 2500) console.warn('⚠️ Poor LCP score');
            else if (lcp > 1200) console.log('⚡ Good LCP score');
            else console.log('🚀 Excellent LCP score');
          }
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // Observer not supported
      }
      
      // First Input Delay (FID) - measure when user first interacts
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            const fid = Math.round(entry.processingStart - entry.startTime);
            
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
              console.log('⚡ FID (First Input Delay):', fid + 'ms');
              if (fid > 100) console.warn('⚠️ Poor FID score');
              else console.log('🚀 Good FID score');
            }
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // Observer not supported
      }
    }
  }
  
  // Monitor memory usage (if available)
  function monitorMemory() {
    if (!performance.memory) return;
    
    setInterval(() => {
      const memory = performance.memory;
      const used = Math.round(memory.usedJSHeapSize / 1048576); // MB
      const total = Math.round(memory.totalJSHeapSize / 1048576); // MB
      
      // Warn if memory usage is high
      if (used > 50 && window.location.hostname === 'localhost') {
        console.warn('🧠 High memory usage:', used + 'MB /' + total + 'MB');
      }
    }, 30000); // Check every 30 seconds
  }
  
  // Initialize performance monitoring
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      measurePerformance();
      measureWebVitals();
      monitorMemory();
    });
  } else {
    measurePerformance();
    measureWebVitals();
    monitorMemory();
  }
})();
