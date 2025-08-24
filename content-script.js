// Content Script for Lazy Egg JS Watcher Enhanced
(function () {
  "use strict";

  // Prevent multiple injections
  if (window.lazyEggInjected) {
    return;
  }
  window.lazyEggInjected = true;

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

  class EnhancedJSTracker {
    constructor() {
      this.jsFiles = new Set();
      this.isTracking = true;
      this.lastSentCount = 0;
      this.linkFinder = null;
      this.secretDetector = null;
      this.domainCategorizer = null;
      this.snapshotEngine = null;
      this.alertSystem = null;
      this.processedContent = new Map();
      this.suspiciousFindings = [];
      
      this.init();
    }

    async init() {
      try {
        // Initialize engines
        this.linkFinder = new window.LinkFinderLite();
        this.secretDetector = new window.SecretDetector();
        this.domainCategorizer = new window.DomainCategorizer();
        this.snapshotEngine = new window.DomainSnapshotEngine();
        this.alertSystem = new LazyEggAlertSystem();

        // Start domain snapshot
        this.currentSnapshotId = this.snapshotEngine.startSnapshot();

        this.setupPerformanceObserver();
        this.hookScriptCreation();
        this.hookFetch();
        this.trackExistingScripts();

        // Send data periodically to avoid too many messages
        setInterval(() => this.sendData(), 3000);
        
        // Auto-snapshot after 30 seconds
        setTimeout(() => this.finalizeSnapshot(), 30000);

        console.log('Lazy Egg Enhanced Tracker initialized');
      } catch (error) {
        console.warn('Failed to initialize enhanced tracker:', error);
        // Fallback to basic tracking
        this.initBasicTracking();
      }
    }

    initBasicTracking() {
      this.setupPerformanceObserver();
      this.hookScriptCreation();
      this.hookFetch();
      this.trackExistingScripts();
      setInterval(() => this.sendData(), 2000);
    }

    setupPerformanceObserver() {
      if ("PerformanceObserver" in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              this.trackUrl(entry.name);
            }
          });
          observer.observe({ entryTypes: ["resource"] });
        } catch (error) {
          console.warn("Performance Observer failed:", error);
        }
      }
    }

    hookScriptCreation() {
      const originalCreateElement = document.createElement;
      document.createElement = (...args) => {
        const element = originalCreateElement.apply(document, args);

        if (args[0] && args[0].toLowerCase() === "script") {
          const originalSetAttribute = element.setAttribute;
          element.setAttribute = (name, value) => {
            if (name === "src") {
              this.trackUrl(value);
            }
            return originalSetAttribute.call(element, name, value);
          };

          // Also watch for direct src property assignment
          Object.defineProperty(element, "src", {
            set: (value) => {
              this.trackUrl(value);
              element.setAttribute("src", value);
            },
            get: () => element.getAttribute("src"),
          });
        }

        return element;
      };
    }

    hookFetch() {
      const originalFetch = window.fetch;
      window.fetch = (...args) => {
        const url = args[0];
        if (typeof url === "string") {
          this.trackUrl(url);
        } else if (url instanceof Request) {
          this.trackUrl(url.url);
        }
        return originalFetch.apply(window, args);
      };
    }

    trackExistingScripts() {
      // Track scripts that are already loaded
      document.querySelectorAll("script[src]").forEach((script) => {
        this.trackUrl(script.src);
      });
    }

    trackUrl(url) {
      if (!this.isTracking || !url) return;

      try {
        const normalizedUrl = this.normalizeUrl(url);
        
        // Update domain categorizer
        if (this.domainCategorizer) {
          this.domainCategorizer.updateDomainInfo(normalizedUrl, 'unknown');
        }

        if (this.isJavaScriptFile(normalizedUrl)) {
          this.jsFiles.add(normalizedUrl);
          
          // Process JavaScript content for analysis
          this.processJavaScriptFile(normalizedUrl);
        }

        // Update snapshot engine
        if (this.snapshotEngine) {
          const assetType = this.determineAssetType(normalizedUrl);
          this.snapshotEngine.addAsset(normalizedUrl, assetType, {
            discoveredVia: 'tracker',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        // Silently ignore invalid URLs
      }
    }

    async processJavaScriptFile(url) {
      if (this.processedContent.has(url)) return;
      
      try {
        // Fetch and analyze JavaScript content
        const response = await fetch(url);
        if (!response.ok) return;
        
        const content = await response.text();
        this.processedContent.set(url, content);

        // Extract endpoints using LinkFinder
        if (this.linkFinder) {
          const endpoints = this.linkFinder.extractFromJavaScript(content, url);
          if (endpoints.endpoints.length > 0 || endpoints.urls.length > 0) {
            this.sendEndpointData(url, endpoints);
          }
        }

        // Scan for secrets
        if (this.secretDetector) {
          const secrets = this.secretDetector.scanForSecrets(content, url);
          if (secrets.secrets.length > 0) {
            this.handleSecretsFound(url, secrets);
          }
        }

      } catch (error) {
        console.warn('Failed to process JavaScript file:', url, error);
      }
    }

    handleSecretsFound(url, secretsResult) {
      this.suspiciousFindings.push({
        type: 'secrets',
        url: url,
        data: secretsResult,
        timestamp: new Date().toISOString(),
        severity: this.calculateSecretsSeverity(secretsResult)
      });

      // Show alert for critical secrets
      const criticalSecrets = secretsResult.secrets.filter(s => s.severity === 'critical');
      if (criticalSecrets.length > 0 && this.alertSystem) {
        this.alertSystem.showAlert({
          type: 'critical-secrets',
          title: 'Critical Secrets Detected!',
          message: `Found ${criticalSecrets.length} critical secret(s) in ${url}`,
          data: criticalSecrets,
          actions: ['View Details', 'Export', 'Dismiss']
        });
      }

      // Send to background
      this.sendSecretData(url, secretsResult);
    }

    calculateSecretsSeverity(secretsResult) {
      const severityScores = { critical: 4, high: 3, medium: 2, low: 1 };
      let maxScore = 0;
      
      secretsResult.secrets.forEach(secret => {
        const score = severityScores[secret.severity] || 0;
        if (score > maxScore) maxScore = score;
      });

      return Object.keys(severityScores).find(key => severityScores[key] === maxScore) || 'low';
    }

    determineAssetType(url) {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();

        if (pathname.endsWith('.js') || pathname.endsWith('.mjs')) return 'javascript';
        if (pathname.endsWith('.css')) return 'stylesheet';
        if (pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
        if (pathname.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
        if (pathname.includes('/api/')) return 'api';
        
        return 'unknown';
      } catch {
        return 'unknown';
      }
    }

    finalizeSnapshot() {
      if (this.snapshotEngine && this.currentSnapshotId) {
        const snapshotId = this.snapshotEngine.stopSnapshot();
        
        // Send snapshot data
        chrome.runtime.sendMessage({
          type: 'saveSnapshot',
          data: {
            snapshotId: snapshotId,
            snapshot: this.snapshotEngine.getSnapshot(snapshotId),
            assetMap: this.snapshotEngine.getAssetMap(`map_${snapshotId}`)
          }
        }).catch(() => {
          this.isTracking = false;
        });
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

        // Check content-type in URL parameters (some CDNs use this)
        if (urlObj.searchParams.get("type") === "application/javascript") {
          return true;
        }

        // Check for common JS patterns in URL
        const jsPatterns = [
          "/js/",
          "/javascript/",
          "/scripts/",
          "jquery",
          "angular",
          "react",
          "vue",
          "bootstrap",
          "lodash",
          "underscore",
        ];

        return (
          jsPatterns.some((pattern) => pathname.includes(pattern)) &&
          !pathname.includes(".css") &&
          !pathname.includes(".html")
        );
      } catch {
        return false;
      }
    }

    sendData() {
      if (this.jsFiles.size > this.lastSentCount) {
        // Send basic JS files data
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

      // Send domain categorization data
      if (this.domainCategorizer) {
        const domainStats = this.domainCategorizer.getDomainStats();
        const suspiciousDomains = this.domainCategorizer.getSuspiciousDomains();
        
        if (suspiciousDomains.length > 0) {
          chrome.runtime.sendMessage({
            type: 'suspiciousDomains',
            data: { stats: domainStats, suspicious: suspiciousDomains }
          }).catch(() => {});
        }
      }

      // Send suspicious findings
      if (this.suspiciousFindings.length > 0) {
        chrome.runtime.sendMessage({
          type: 'suspiciousFindings',
          data: this.suspiciousFindings
        }).catch(() => {});
        
        this.suspiciousFindings = []; // Clear after sending
      }
    }

    sendEndpointData(url, endpoints) {
      chrome.runtime.sendMessage({
        type: 'saveEndpoints',
        data: { url, endpoints, timestamp: new Date().toISOString() }
      }).catch(() => {});
    }

    sendSecretData(url, secrets) {
      chrome.runtime.sendMessage({
        type: 'saveSecrets',
        data: { url, secrets, timestamp: new Date().toISOString() }
      }).catch(() => {});
    }

    stop() {
      this.isTracking = false;
      
      // Finalize snapshot before stopping
      if (this.snapshotEngine) {
        this.finalizeSnapshot();
      }
      
      // Clean up alert system
      if (this.alertSystem) {
        this.alertSystem.cleanup();
      }
    }
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
