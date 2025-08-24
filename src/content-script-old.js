// Content Script for Lazy Egg JS Watcher Enhanced
(function () {
  "use strict";

  // Prevent multiple injections
  if (window.lazyEggInjected) {
    return;
  }
  window.lazyEggInjected = true;

  // Lightweight mode - minimal tracking, no heavy analysis
  console.log('Lazy Egg: Starting lightweight JS tracking');

  // Skip heavy sites that cause performance issues
  const heavyHosts = [
    'twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com',
    'youtube.com', 'netflix.com', 'twitch.tv', 'reddit.com'
  ];
  
  if (heavyHosts.some(host => window.location.hostname.includes(host))) {
    console.log('Lazy Egg: Skipping heavy site:', window.location.hostname);
    return;
  }

  // Load required modules
  function loadModule(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(src);
      script.onload = resolve;
      script.onerror = reject;
      (document.head || document.documentElement).appendChild(script);
    });
  }

  class LightweightJSTracker {
    constructor() {
      this.jsFiles = new Set();
      this.isTracking = true;
      this.lastSentCount = 0;
      this.dataInterval = null;
      
      this.init();
    }

    async init() {
      console.log('Lazy Egg: Initializing lightweight tracker');
      
      // Only basic tracking - no heavy modules
      this.setupBasicTracking();
    }

    setupBasicTracking() {
      this.trackExistingScripts();
      this.setupPerformanceObserver();
      // NO FETCH HOOKING - causes performance issues
      
      // Send data less frequently
      this.dataInterval = setInterval(() => this.sendData(), 10000); // 10 seconds
    }

    setupPerformanceObserver() {
      // Simplified performance observer
      if ("PerformanceObserver" in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (this.isJavaScriptFile(entry.name)) {
                this.jsFiles.add(this.normalizeUrl(entry.name));
              }
            }
          });
          observer.observe({ entryTypes: ["resource"] });
        } catch (error) {
          console.warn("Performance Observer failed:", error);
        }
      }
    }

    trackExistingScripts() {
      // Track scripts that are already loaded - simple version
      document.querySelectorAll("script[src]").forEach((script) => {
        if (this.isJavaScriptFile(script.src)) {
          this.jsFiles.add(this.normalizeUrl(script.src));
        }
      });
    }

    sendData() {
      if (this.jsFiles.size > this.lastSentCount) {
        // Send basic JS files data only
        chrome.runtime
          .sendMessage({
            type: "saveJsFiles",
            data: Array.from(this.jsFiles),
          })
          .catch(() => {
            this.isTracking = false;
          });

        this.lastSentCount = this.jsFiles.size;
      }
    }

    normalizeUrl(url) {
      // Handle relative URLs
      if (url.startsWith("//")) {
        return window.location.protocol + url;
      } else if (url.startsWith("/")) {
        return window.location.origin + url;
      } else if (!url.includes("://")) {
        return new URL(url, window.location.href).href;
      }
      return url;
    }

    isJavaScriptFile(url) {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();

        // Check file extension
        if (pathname.endsWith(".js") || pathname.endsWith(".mjs")) {
          return true;
        }

        // Check for common JS patterns in URL
        const jsPatterns = ["/js/", "/javascript/", "/scripts/"];
        return jsPatterns.some((pattern) => pathname.includes(pattern));
      } catch {
        return false;
      }
    }

    stop() {
      this.isTracking = false;
      
      // Clear interval to prevent memory leaks
      if (this.dataInterval) {
        clearInterval(this.dataInterval);
        this.dataInterval = null;
      }
      
      // Clear memory caches
      this.jsFiles.clear();
    }
  }

  // Initialize lightweight tracker
  const tracker = new LightweightJSTracker();

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    tracker.stop();
  });

})();
  }

  // Alert System for Suspicious Activity
  class LazyEggAlertSystem {
    constructor() {
      this.alerts = new Map();
      this.alertCount = 0;
      this.container = null;
      this.isEnabled = true;
      this.createAlertContainer();
    }

    createAlertContainer() {
      this.container = document.createElement('div');
      this.container.id = 'lazy-egg-alerts';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        max-width: 400px;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui;
      `;
      document.body.appendChild(this.container);
    }

    showAlert(alertConfig) {
      if (!this.isEnabled) return;

      const alertId = `alert_${++this.alertCount}`;
      const alert = document.createElement('div');
      alert.id = alertId;
      alert.style.cssText = `
        background: #ff4757;
        color: white;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        pointer-events: auto;
        animation: slideIn 0.3s ease-out;
        max-width: 100%;
        word-wrap: break-word;
      `;

      // Add animation keyframes
      if (!document.getElementById('lazy-egg-alert-styles')) {
        const style = document.createElement('style');
        style.id = 'lazy-egg-alert-styles';
        style.textContent = `
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      // Set alert color based on type
      const alertColors = {
        'critical-secrets': '#ff4757',
        'suspicious-domain': '#ff6b35',
        'mixed-content': '#ffa502',
        'performance': '#3742fa'
      };
      
      if (alertColors[alertConfig.type]) {
        alert.style.background = alertColors[alertConfig.type];
      }

      alert.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div style="font-weight: 600; font-size: 14px;">${alertConfig.title}</div>
          <button onclick="this.parentElement.parentElement.remove()" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">×</button>
        </div>
        <div style="font-size: 12px; line-height: 1.4; margin-bottom: 12px;">
          ${alertConfig.message}
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${(alertConfig.actions || []).map(action => `
            <button onclick="lazyEggAlertAction('${alertId}', '${action}', ${JSON.stringify(alertConfig).replace(/"/g, '&quot;')})" style="
              background: rgba(255,255,255,0.2);
              border: none;
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              cursor: pointer;
              transition: background 0.2s;
            ">${action}</button>
          `).join('')}
        </div>
      `;

      this.container.appendChild(alert);
      this.alerts.set(alertId, alertConfig);

      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (document.getElementById(alertId)) {
          alert.style.animation = 'slideOut 0.3s ease-in';
          setTimeout(() => alert.remove(), 300);
        }
        this.alerts.delete(alertId);
      }, 10000);

      return alertId;
    }

    handleAction(alertId, action, alertConfig) {
      switch (action) {
        case 'View Details':
          this.showDetailsModal(alertConfig);
          break;
        case 'Export':
          this.exportAlertData(alertConfig);
          break;
        case 'Dismiss':
          const alertElement = document.getElementById(alertId);
          if (alertElement) alertElement.remove();
          break;
      }
    }

    showDetailsModal(alertConfig) {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        z-index: 9999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui;
      `;

      const content = document.createElement('div');
      content.style.cssText = `
        background: white;
        padding: 24px;
        border-radius: 12px;
        max-width: 80%;
        max-height: 80%;
        overflow: auto;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      `;

      content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; color: #333;">${alertConfig.title}</h3>
          <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
            background: #ddd;
            border: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            cursor: pointer;
          ">×</button>
        </div>
        <div style="color: #666; margin-bottom: 16px;">${alertConfig.message}</div>
        <pre style="
          background: #f5f5f5;
          padding: 12px;
          border-radius: 6px;
          font-size: 12px;
          overflow: auto;
          max-height: 400px;
        ">${JSON.stringify(alertConfig.data, null, 2)}</pre>
      `;

      modal.appendChild(content);
      document.body.appendChild(modal);

      // Close on outside click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });
    }

    exportAlertData(alertConfig) {
      const data = {
        alert: alertConfig,
        exportedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lazy-egg-alert-${alertConfig.type}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    cleanup() {
      if (this.container) {
        this.container.remove();
      }
    }
  }

  // Global function for alert actions
  window.lazyEggAlertAction = function(alertId, action, alertConfig) {
    if (window.lazyEggAlertSystem) {
      window.lazyEggAlertSystem.handleAction(alertId, action, alertConfig);
    }
  };

  // Initialize enhanced tracker
  const tracker = new EnhancedJSTracker();
  window.lazyEggAlertSystem = tracker.alertSystem;

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    tracker.stop();
  });
})();
