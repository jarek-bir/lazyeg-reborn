// Enhanced Popup script for Lazy Egg JS Watcher
class LazyEggEnhancedPopup {
  constructor() {
    this.currentTab = 'overview';
    this.stats = {};
    this.endpoints = {};
    this.secrets = {};
    this.domainData = {};
    this.snapshots = {};
    this.exporter = new LazyEggExporter();
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadAllData();
    this.render();
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Export buttons
    document.getElementById('export-comprehensive').addEventListener('click', () => {
      this.exportComprehensiveReport();
    });

    // Endpoints exports
    document.getElementById('export-endpoints-json').addEventListener('click', () => {
      this.exporter.exportEndpoints('json');
    });
    document.getElementById('export-endpoints-burp').addEventListener('click', () => {
      this.exporter.exportEndpoints('burp');
    });
    document.getElementById('export-endpoints-linkfinder').addEventListener('click', () => {
      this.exporter.exportEndpoints('linkfinder');
    });

    // Secrets exports
    document.getElementById('export-secrets-json').addEventListener('click', () => {
      this.exporter.exportSecrets('json');
    });
    document.getElementById('export-secrets-sarif').addEventListener('click', () => {
      this.exporter.exportSecrets('sarif');
    });

    // Other actions
    document.getElementById('clear-all-data').addEventListener('click', () => {
      this.clearAllData();
    });

    document.getElementById('create-snapshot').addEventListener('click', () => {
      this.createSnapshot();
    });

    // Settings (reuse existing popup.js settings logic)
    this.setupSettingsEventListeners();
  }

  setupSettingsEventListeners() {
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      this.openSettings();
    });
    
    document.getElementById('close-modal')?.addEventListener('click', () => {
      this.closeSettings();
    });
    
    document.getElementById('save-settings')?.addEventListener('click', () => {
      this.saveSettings();
    });
    
    document.getElementById('cancel-settings')?.addEventListener('click', () => {
      this.closeSettings();
    });

    // Close modal on outside click
    document.getElementById('settings-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'settings-modal') {
        this.closeSettings();
      }
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    this.currentTab = tabName;
    this.renderCurrentTab();
  }

  async loadAllData() {
    try {
      // Load all data in parallel
      const [stats, endpoints, secrets, domainData, snapshots] = await Promise.all([
        new Promise(resolve => chrome.runtime.sendMessage({ type: 'getStats' }, resolve)),
        new Promise(resolve => chrome.runtime.sendMessage({ type: 'getEndpoints' }, resolve)),
        new Promise(resolve => chrome.runtime.sendMessage({ type: 'getSecrets' }, resolve)),
        new Promise(resolve => chrome.runtime.sendMessage({ type: 'getDomainData' }, resolve)),
        new Promise(resolve => chrome.runtime.sendMessage({ type: 'getSnapshots' }, resolve))
      ]);

      this.stats = stats;
      this.endpoints = endpoints;
      this.secrets = secrets;
      this.domainData = domainData;
      this.snapshots = snapshots;

      // Show alerts if there are critical findings
      this.checkForAlerts();

    } catch (error) {
      console.error('Failed to load data:', error);
      this.stats = { total: 0, domains: 0, alerts: 0 };
      this.endpoints = {};
      this.secrets = {};
      this.domainData = {};
      this.snapshots = {};
    }
  }

  checkForAlerts() {
    let alertMessage = '';
    
    // Check for critical secrets
    const criticalSecrets = this.stats.secrets?.bySeverity?.critical || 0;
    if (criticalSecrets > 0) {
      alertMessage = `🚨 ${criticalSecrets} critical secret(s) detected!`;
    }
    
    // Check for high alerts
    const totalAlerts = this.stats.alerts || 0;
    if (totalAlerts > 0 && !alertMessage) {
      alertMessage = `⚠️ ${totalAlerts} security alert(s) found`;
    }

    if (alertMessage) {
      document.getElementById('alert-banner').classList.add('show');
      document.getElementById('alert-message').textContent = alertMessage;
    }
  }

  render() {
    // Update header stats
    document.getElementById('total-count').textContent = this.stats.jsFiles?.total || 0;
    document.getElementById('alerts-count').textContent = this.stats.alerts || 0;

    // Update overview stats
    document.getElementById('endpoints-count').textContent = this.stats.endpoints?.total || 0;
    document.getElementById('secrets-count').textContent = this.stats.secrets?.total || 0;
    document.getElementById('domains-count').textContent = this.stats.domains?.analyzed || 0;
    document.getElementById('snapshots-count').textContent = this.stats.snapshots?.total || 0;

    // Update tab counts
    document.getElementById('endpoints-total').textContent = `${this.stats.endpoints?.total || 0} endpoints`;
    document.getElementById('secrets-total').textContent = `${this.stats.secrets?.total || 0} secrets`;
    document.getElementById('domains-total').textContent = `${this.stats.domains?.analyzed || 0} domains`;
    document.getElementById('snapshots-total').textContent = `${this.stats.snapshots?.total || 0} snapshots`;

    this.renderCurrentTab();
  }

  renderCurrentTab() {
    switch (this.currentTab) {
      case 'endpoints':
        this.renderEndpoints();
        break;
      case 'secrets':
        this.renderSecrets();
        break;
      case 'domains':
        this.renderDomains();
        break;
      case 'snapshots':
        this.renderSnapshots();
        break;
    }
  }

  renderEndpoints() {
    const container = document.getElementById('endpoints-list');
    
    if (Object.keys(this.endpoints).length === 0) {
      container.innerHTML = '<div class="empty-state">No endpoints discovered yet</div>';
      return;
    }

    let html = '';
    Object.entries(this.endpoints).forEach(([key, data]) => {
      const totalEndpoints = Object.values(data.endpoints)
        .filter(Array.isArray)
        .reduce((sum, arr) => sum + arr.length, 0);

      html += `
        <div class="finding-item">
          <div class="finding-header">
            <strong>JavaScript File</strong>
            <span class="severity-badge severity-medium">${totalEndpoints} endpoints</span>
          </div>
          <div class="finding-url">${data.url}</div>
          <div style="margin-top: 8px; font-size: 10px;">
            ${Object.entries(data.endpoints)
              .filter(([cat, eps]) => Array.isArray(eps) && eps.length > 0)
              .map(([category, endpoints]) => `
                <div style="margin-bottom: 4px;">
                  <strong>${category}:</strong> ${endpoints.length} endpoints
                </div>
              `).join('')}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  renderSecrets() {
    const container = document.getElementById('secrets-list');
    
    if (Object.keys(this.secrets).length === 0) {
      container.innerHTML = '<div class="empty-state">No secrets detected</div>';
      return;
    }

    let html = '';
    Object.entries(this.secrets).forEach(([key, data]) => {
      data.secrets.secrets.forEach(secret => {
        html += `
          <div class="finding-item">
            <div class="finding-header">
              <strong>${secret.type}</strong>
              <span class="severity-badge severity-${secret.severity}">${secret.severity}</span>
            </div>
            <div class="finding-url">${data.url}</div>
            <div style="margin-top: 4px; font-size: 10px; color: #666;">
              Value: <code>${secret.value}</code>
              ${secret.line ? `<br>Line: ${secret.line}` : ''}
            </div>
          </div>
        `;
      });
    });

    container.innerHTML = html;
  }

  renderDomains() {
    const container = document.getElementById('domains-list');
    
    if (Object.keys(this.domainData).length === 0) {
      container.innerHTML = '<div class="empty-state">No domain data available</div>';
      return;
    }

    let html = '';
    Object.entries(this.domainData).forEach(([key, data]) => {
      if (data.suspicious && data.suspicious.length > 0) {
        data.suspicious.forEach(domain => {
          const riskClass = domain.riskScore >= 7 ? 'risk-high' : 
                           domain.riskScore >= 4 ? 'risk-medium' : 'risk-low';
          
          html += `
            <div class="domain-item">
              <div>
                <strong>${domain.domain}</strong>
                <div style="font-size: 9px; color: #666;">
                  ${domain.categories.join(', ')} • ${domain.isLocal ? 'Local' : 'Third-party'}
                </div>
              </div>
              <span class="risk-score ${riskClass}">Risk: ${domain.riskScore}</span>
            </div>
          `;
        });
      }
    });

    if (!html) {
      html = '<div class="empty-state">No suspicious domains detected</div>';
    }

    container.innerHTML = html;
  }

  renderSnapshots() {
    const container = document.getElementById('snapshots-list');
    
    if (Object.keys(this.snapshots).length === 0) {
      container.innerHTML = '<div class="empty-state">No snapshots available</div>';
      return;
    }

    let html = '';
    Object.entries(this.snapshots).forEach(([id, snapshotData]) => {
      const snapshot = snapshotData.snapshot;
      if (!snapshot) return;

      html += `
        <div class="snapshot-item">
          <div class="snapshot-header">${snapshot.domain}</div>
          <div style="font-size: 9px; color: #666; margin-bottom: 8px;">
            ${new Date(snapshot.startTime).toLocaleString()}
          </div>
          <div class="snapshot-stats">
            <div>Assets: ${snapshot.assets ? Object.keys(snapshot.assets).length : 0}</div>
            <div>Domains: ${snapshot.network?.domains?.size || 0}</div>
            <div>Size: ${this.formatBytes(snapshot.network?.totalSize || 0)}</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async exportComprehensiveReport() {
    try {
      const filename = await this.exporter.exportReport();
      this.showNotification(`Comprehensive report exported as ${filename}`);
    } catch (error) {
      console.error('Export failed:', error);
      this.showNotification('Export failed!', 'error');
    }
  }

  async clearAllData() {
    if (confirm('Are you sure you want to clear all collected data? This cannot be undone.')) {
      try {
        await chrome.storage.local.clear();
        
        // Reset local data
        this.stats = { total: 0, domains: 0, alerts: 0 };
        this.endpoints = {};
        this.secrets = {};
        this.domainData = {};
        this.snapshots = {};
        
        // Clear badge
        chrome.action.setBadgeText({ text: '' });
        
        this.render();
        this.showNotification('All data cleared!');
      } catch (error) {
        console.error('Clear failed:', error);
        this.showNotification('Clear failed!', 'error');
      }
    }
  }

  createSnapshot() {
    // Inject a script to create a snapshot on the current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            if (window.DomainSnapshotEngine) {
              const engine = new window.DomainSnapshotEngine();
              const snapshotId = engine.startSnapshot();
              setTimeout(() => {
                const finalId = engine.stopSnapshot();
                console.log('Snapshot created:', finalId);
              }, 5000);
            }
          }
        });
        
        this.showNotification('Creating snapshot... Please wait 5 seconds');
        
        // Reload data after snapshot
        setTimeout(() => {
          this.loadAllData().then(() => this.render());
        }, 6000);
      }
    });
  }

  async openSettings() {
    try {
      const result = await chrome.storage.local.get(['settings']);
      const settings = result.settings || {};
      
      document.getElementById('auto-capture').checked = settings.autoCapture !== false;
      document.getElementById('enable-secret-detection').checked = settings.enableSecretDetection !== false;
      document.getElementById('enable-endpoint-extraction').checked = settings.enableEndpointExtraction !== false;
      document.getElementById('alert-critical-secrets').checked = settings.alertOnCriticalSecrets !== false;
      document.getElementById('exclude-patterns').value = (settings.excludePatterns || []).join('\n');
      
      document.getElementById('settings-modal').classList.remove('hidden');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
  }

  async saveSettings() {
    try {
      const settings = {
        autoCapture: document.getElementById('auto-capture').checked,
        enableSecretDetection: document.getElementById('enable-secret-detection').checked,
        enableEndpointExtraction: document.getElementById('enable-endpoint-extraction').checked,
        alertOnCriticalSecrets: document.getElementById('alert-critical-secrets').checked,
        excludePatterns: document.getElementById('exclude-patterns').value
          .split('\n')
          .map(p => p.trim())
          .filter(p => p.length > 0)
      };

      await chrome.storage.local.set({ settings });
      this.closeSettings();
      this.showNotification('Settings saved!');
    } catch (error) {
      console.error('Save settings failed:', error);
      this.showNotification('Save failed!', 'error');
    }
  }

  showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ff4757' : '#00ff90'};
      color: ${type === 'error' ? '#fff' : '#000'};
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      z-index: 2000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);

    // Remove after delay
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// Initialize enhanced popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new LazyEggEnhancedPopup();
});
