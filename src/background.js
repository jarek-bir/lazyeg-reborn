// Background Service Worker for Lazy Egg JS Watcher Enhanced
class LazyEggEnhancedBackground {
  constructor() {
    this.setupEventListeners();
    this.endpoints = new Map();
    this.secrets = new Map();
    this.domainData = new Map();
    this.snapshots = new Map();
    this.alertsCount = 0;
  }

  setupEventListeners() {
    // Handle extension installation/startup
    chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));

    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Handle tab updates to inject content script and required modules
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
  }

  handleInstalled(details) {
    console.log("Lazy Egg Enhanced JS Watcher installed/updated:", details.reason);

    // Initialize enhanced storage
    chrome.storage.local.get([
      'jsFiles', 'endpoints', 'secrets', 'domainData', 'snapshots', 'settings'
    ], (result) => {
      const defaultSettings = {
        autoCapture: true,
        excludePatterns: ["google-analytics", "gtag", "facebook.net"],
        enableSecretDetection: true,
        enableEndpointExtraction: true,
        enableDomainCategorization: true,
        enableSnapshots: true,
        alertOnCriticalSecrets: true,
        alertOnSuspiciousDomains: true,
        exportFormats: ['json', 'csv', 'burp'],
        maxStoredSnapshots: 10
      };

      chrome.storage.local.set({
        jsFiles: result.jsFiles || [],
        endpoints: result.endpoints || {},
        secrets: result.secrets || {},
        domainData: result.domainData || {},
        snapshots: result.snapshots || {},
        settings: { ...defaultSettings, ...result.settings }
      });
    });
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    // Only inject when page is fully loaded and it's a valid HTTP(S) URL
    if (
      changeInfo.status === "complete" &&
      tab.url &&
      (tab.url.startsWith("http://") || tab.url.startsWith("https://"))
    ) {
      try {
        // Inject required modules first
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: [
            "linkfinder-lite.js",
            "secret-detector.js", 
            "domain-categorizer.js",
            "domain-snapshot.js"
          ],
        });

        // Then inject the main content script
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["content-script.js"],
        });
      } catch (error) {
        console.warn("Failed to inject enhanced content script:", error);
        
        // Fallback to basic content script only
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["content-script.js"],
          });
        } catch (fallbackError) {
          console.warn("Failed to inject any content script:", fallbackError);
        }
      }
    }
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case "saveJsFiles":
        this.saveJsFiles(message.data);
        break;
      case "saveEndpoints":
        this.saveEndpoints(message.data);
        break;
      case "saveSecrets":
        this.saveSecrets(message.data);
        break;
      case "saveSnapshot":
        this.saveSnapshot(message.data);
        break;
      case "suspiciousDomains":
        this.handleSuspiciousDomains(message.data);
        break;
      case "suspiciousFindings":
        this.handleSuspiciousFindings(message.data);
        break;
      case "getStats":
        this.getEnhancedStats(sendResponse);
        return true; // Keep message channel open
      case "getEndpoints":
        this.getEndpoints(sendResponse);
        return true;
      case "getSecrets":
        this.getSecrets(sendResponse);
        return true;
      case "getDomainData":
        this.getDomainData(sendResponse);
        return true;
      case "getSnapshots":
        this.getSnapshots(sendResponse);
        return true;
      case "exportData":
        this.exportData(message.format, message.dataType, sendResponse);
        return true;
      default:
        console.warn("Unknown message type:", message.type);
    }
  }

  async saveEndpoints(endpointData) {
    try {
      const result = await chrome.storage.local.get(['endpoints']);
      const endpoints = result.endpoints || {};
      
      const key = `${endpointData.url}_${Date.now()}`;
      endpoints[key] = endpointData;
      
      await chrome.storage.local.set({ endpoints });
      console.log('Saved endpoints for:', endpointData.url);
    } catch (error) {
      console.error('Failed to save endpoints:', error);
    }
  }

  async saveSecrets(secretData) {
    try {
      const result = await chrome.storage.local.get(['secrets', 'settings']);
      const secrets = result.secrets || {};
      const settings = result.settings || {};
      
      const key = `${secretData.url}_${Date.now()}`;
      secrets[key] = secretData;
      
      await chrome.storage.local.set({ secrets });
      
      // Update badge if critical secrets found
      const criticalSecrets = secretData.secrets.secrets.filter(s => s.severity === 'critical');
      if (criticalSecrets.length > 0) {
        this.alertsCount++;
        chrome.action.setBadgeText({ text: this.alertsCount.toString() });
        chrome.action.setBadgeBackgroundColor({ color: "#ff4757" });
        
        // Show notification if enabled
        if (settings.alertOnCriticalSecrets) {
          chrome.notifications?.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'Critical Secrets Detected!',
            message: `Found ${criticalSecrets.length} critical secret(s) in ${secretData.url}`
          });
        }
      }
      
      console.log('Saved secrets for:', secretData.url);
    } catch (error) {
      console.error('Failed to save secrets:', error);
    }
  }

  async saveSnapshot(snapshotData) {
    try {
      const result = await chrome.storage.local.get(['snapshots', 'settings']);
      const snapshots = result.snapshots || {};
      const settings = result.settings || {};
      
      snapshots[snapshotData.snapshotId] = snapshotData;
      
      // Limit stored snapshots
      const maxSnapshots = settings.maxStoredSnapshots || 10;
      const snapshotKeys = Object.keys(snapshots);
      if (snapshotKeys.length > maxSnapshots) {
        // Remove oldest snapshots
        const sortedKeys = snapshotKeys.sort((a, b) => {
          const snapA = snapshots[a].snapshot?.startTime || 0;
          const snapB = snapshots[b].snapshot?.startTime || 0;
          return new Date(snapA) - new Date(snapB);
        });
        
        for (let i = 0; i < snapshotKeys.length - maxSnapshots; i++) {
          delete snapshots[sortedKeys[i]];
        }
      }
      
      await chrome.storage.local.set({ snapshots });
      console.log('Saved snapshot:', snapshotData.snapshotId);
    } catch (error) {
      console.error('Failed to save snapshot:', error);
    }
  }

  async handleSuspiciousDomains(data) {
    try {
      const result = await chrome.storage.local.get(['domainData', 'settings']);
      const domainData = result.domainData || {};
      const settings = result.settings || {};
      
      const key = `${window.location?.hostname || 'unknown'}_${Date.now()}`;
      domainData[key] = data;
      
      await chrome.storage.local.set({ domainData });
      
      // Alert on suspicious domains if enabled
      if (settings.alertOnSuspiciousDomains && data.suspicious.length > 0) {
        this.alertsCount++;
        chrome.action.setBadgeText({ text: this.alertsCount.toString() });
        chrome.action.setBadgeBackgroundColor({ color: "#ff6b35" });
      }
      
    } catch (error) {
      console.error('Failed to save domain data:', error);
    }
  }

  async handleSuspiciousFindings(findings) {
    try {
      // Store findings and increment alert counter
      this.alertsCount += findings.filter(f => f.severity === 'critical' || f.severity === 'high').length;
      
      if (this.alertsCount > 0) {
        chrome.action.setBadgeText({ text: this.alertsCount.toString() });
        chrome.action.setBadgeBackgroundColor({ color: "#ff4757" });
      }
      
    } catch (error) {
      console.error('Failed to handle suspicious findings:', error);
    }
  }

  async saveJsFiles(newJsFiles) {
    try {
      const result = await chrome.storage.local.get(["jsFiles", "settings"]);
      const existingFiles = result.jsFiles || [];
      const settings = result.settings || {};

      // Filter out excluded patterns
      const filteredFiles = newJsFiles.filter((url) => {
        if (!settings.excludePatterns) return true;
        return !settings.excludePatterns.some((pattern) =>
          url.includes(pattern)
        );
      });

      // Merge with existing files (avoid duplicates)
      const allFiles = [...new Set([...existingFiles, ...filteredFiles])];

      await chrome.storage.local.set({
        jsFiles: allFiles,
        lastUpdate: Date.now(),
      });

      // Update badge with count (only if no alerts)
      if (this.alertsCount === 0) {
        chrome.action.setBadgeText({
          text: allFiles.length > 99 ? "99+" : allFiles.length.toString(),
        });
        chrome.action.setBadgeBackgroundColor({ color: "#00ff90" });
      }
    } catch (error) {
      console.error("Failed to save JS files:", error);
    }
  }

  async getEnhancedStats(sendResponse) {
    try {
      const result = await chrome.storage.local.get([
        'jsFiles', 'endpoints', 'secrets', 'domainData', 'snapshots'
      ]);
      
      const jsFiles = result.jsFiles || [];
      const endpoints = result.endpoints || {};
      const secrets = result.secrets || {};
      const domainData = result.domainData || {};
      const snapshots = result.snapshots || {};

      // Calculate endpoint statistics
      let totalEndpoints = 0;
      let endpointCategories = {};
      Object.values(endpoints).forEach(data => {
        const eps = data.endpoints;
        Object.keys(eps).forEach(category => {
          if (Array.isArray(eps[category])) {
            totalEndpoints += eps[category].length;
            endpointCategories[category] = (endpointCategories[category] || 0) + eps[category].length;
          }
        });
      });

      // Calculate secret statistics
      let totalSecrets = 0;
      let secretsBySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
      Object.values(secrets).forEach(data => {
        totalSecrets += data.secrets.secrets.length;
        data.secrets.secrets.forEach(secret => {
          secretsBySeverity[secret.severity]++;
        });
      });

      const stats = {
        jsFiles: {
          total: jsFiles.length,
          domains: [...new Set(jsFiles.map(url => {
            try { return new URL(url).hostname; } catch { return 'unknown'; }
          }))].length
        },
        endpoints: {
          total: totalEndpoints,
          files: Object.keys(endpoints).length,
          categories: endpointCategories
        },
        secrets: {
          total: totalSecrets,
          files: Object.keys(secrets).length,
          bySeverity: secretsBySeverity
        },
        domains: {
          analyzed: Object.keys(domainData).length
        },
        snapshots: {
          total: Object.keys(snapshots).length
        },
        alerts: this.alertsCount,
        lastUpdate: result.lastUpdate || 0,
      };

      sendResponse(stats);
    } catch (error) {
      console.error("Failed to get enhanced stats:", error);
      sendResponse({ total: 0, domains: 0, lastUpdate: 0, alerts: 0 });
    }
  }

  async getEndpoints(sendResponse) {
    try {
      const result = await chrome.storage.local.get(['endpoints']);
      sendResponse(result.endpoints || {});
    } catch (error) {
      console.error('Failed to get endpoints:', error);
      sendResponse({});
    }
  }

  async getSecrets(sendResponse) {
    try {
      const result = await chrome.storage.local.get(['secrets']);
      sendResponse(result.secrets || {});
    } catch (error) {
      console.error('Failed to get secrets:', error);
      sendResponse({});
    }
  }

  async getDomainData(sendResponse) {
    try {
      const result = await chrome.storage.local.get(['domainData']);
      sendResponse(result.domainData || {});
    } catch (error) {
      console.error('Failed to get domain data:', error);
      sendResponse({});
    }
  }

  async getSnapshots(sendResponse) {
    try {
      const result = await chrome.storage.local.get(['snapshots']);
      sendResponse(result.snapshots || {});
    } catch (error) {
      console.error('Failed to get snapshots:', error);
      sendResponse({});
    }
  }

  async exportData(format, dataType, sendResponse) {
    try {
      let data = {};
      
      switch (dataType) {
        case 'endpoints':
          const endpointsResult = await chrome.storage.local.get(['endpoints']);
          data = this.formatEndpointsForExport(endpointsResult.endpoints || {}, format);
          break;
        case 'secrets':
          const secretsResult = await chrome.storage.local.get(['secrets']);
          data = this.formatSecretsForExport(secretsResult.secrets || {}, format);
          break;
        case 'all':
          const allResult = await chrome.storage.local.get([
            'jsFiles', 'endpoints', 'secrets', 'domainData', 'snapshots'
          ]);
          data = this.formatAllDataForExport(allResult, format);
          break;
      }
      
      sendResponse({ success: true, data });
    } catch (error) {
      console.error('Failed to export data:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  formatEndpointsForExport(endpoints, format) {
    if (format === 'burp') {
      const burpData = [];
      Object.values(endpoints).forEach(data => {
        const eps = data.endpoints;
        Object.entries(eps).forEach(([category, categoryEndpoints]) => {
          if (Array.isArray(categoryEndpoints)) {
            categoryEndpoints.forEach(endpoint => {
              burpData.push({
                url: endpoint,
                method: 'GET',
                source: data.url,
                category: category,
                type: 'endpoint',
                extractedAt: data.timestamp
              });
            });
          }
        });
      });
      return JSON.stringify(burpData, null, 2);
    }
    
    return JSON.stringify(endpoints, null, 2);
  }

  formatSecretsForExport(secrets, format) {
    const exportData = {
      exportDate: new Date().toISOString(),
      summary: { totalFiles: Object.keys(secrets).length, totalSecrets: 0 },
      secrets: {}
    };
    
    Object.values(secrets).forEach(data => {
      exportData.summary.totalSecrets += data.secrets.secrets.length;
    });
    
    exportData.secrets = secrets;
    return JSON.stringify(exportData, null, 2);
  }

  formatAllDataForExport(allData, format) {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      format: format,
      data: allData
    }, null, 2);
  }
}

// Initialize the enhanced background service
new LazyEggEnhancedBackground();
