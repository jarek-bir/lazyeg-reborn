// Domain Snapshot and Asset Mapping Engine
class DomainSnapshotEngine {
  constructor() {
    this.snapshots = new Map();
    this.assetMaps = new Map();
    this.currentSnapshot = null;
    this.isCapturing = false;
    
    this.assetTypes = {
      javascript: { extensions: ['.js', '.mjs'], mimeTypes: ['application/javascript', 'text/javascript'] },
      stylesheet: { extensions: ['.css'], mimeTypes: ['text/css'] },
      image: { extensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'], mimeTypes: ['image/*'] },
      font: { extensions: ['.woff', '.woff2', '.ttf', '.otf'], mimeTypes: ['font/*'] },
      media: { extensions: ['.mp4', '.mp3', '.wav', '.avi'], mimeTypes: ['video/*', 'audio/*'] },
      document: { extensions: ['.pdf', '.doc', '.docx'], mimeTypes: ['application/pdf', 'application/msword'] },
      data: { extensions: ['.json', '.xml', '.csv'], mimeTypes: ['application/json', 'application/xml'] },
      api: { patterns: ['/api/', '/rest/', '/graphql/', '/v1/', '/v2/'] }
    };
  }

  // Start capturing a new snapshot
  startSnapshot(domain = window.location.hostname) {
    const snapshotId = `${domain}_${Date.now()}`;
    
    this.currentSnapshot = {
      id: snapshotId,
      domain: domain,
      url: window.location.href,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      metadata: {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        cookies: document.cookie ? document.cookie.split(';').length : 0,
        localStorage: this.getStorageSize('localStorage'),
        sessionStorage: this.getStorageSize('sessionStorage')
      },
      assets: new Map(),
      performance: {
        navigationTiming: this.getNavigationTiming(),
        resourceTiming: [],
        metrics: {}
      },
      security: {
        protocol: window.location.protocol,
        mixedContent: [],
        csp: this.getCSPInfo(),
        certificates: []
      },
      dom: {
        elements: 0,
        scripts: 0,
        stylesheets: 0,
        images: 0,
        iframes: 0
      },
      network: {
        requests: 0,
        totalSize: 0,
        domains: new Set(),
        protocols: new Set()
      }
    };

    this.isCapturing = true;
    this.captureInitialDOM();
    this.setupPerformanceObserver();
    
    return snapshotId;
  }

  // Stop capturing and finalize snapshot
  stopSnapshot() {
    if (!this.currentSnapshot || !this.isCapturing) {
      return null;
    }

    this.currentSnapshot.endTime = new Date().toISOString();
    this.currentSnapshot.duration = Date.now() - new Date(this.currentSnapshot.startTime).getTime();
    
    // Finalize asset map
    this.generateAssetMap();
    
    // Calculate final metrics
    this.calculateFinalMetrics();
    
    // Store snapshot
    this.snapshots.set(this.currentSnapshot.id, this.currentSnapshot);
    
    this.isCapturing = false;
    const snapshotId = this.currentSnapshot.id;
    this.currentSnapshot = null;
    
    return snapshotId;
  }

  // Capture initial DOM state
  captureInitialDOM() {
    const domStats = {
      elements: document.querySelectorAll('*').length,
      scripts: document.querySelectorAll('script').length,
      stylesheets: document.querySelectorAll('link[rel="stylesheet"], style').length,
      images: document.querySelectorAll('img').length,
      iframes: document.querySelectorAll('iframe').length
    };

    this.currentSnapshot.dom = { ...this.currentSnapshot.dom, ...domStats };

    // Capture existing assets
    this.captureScripts();
    this.captureStylesheets();
    this.captureImages();
    this.captureLinks();
  }

  // Capture all script elements
  captureScripts() {
    document.querySelectorAll('script').forEach(script => {
      if (script.src) {
        this.addAsset(script.src, 'javascript', {
          async: script.async,
          defer: script.defer,
          type: script.type,
          integrity: script.integrity,
          crossOrigin: script.crossOrigin,
          element: 'script'
        });
      } else if (script.textContent) {
        // Inline script
        this.addInlineAsset('javascript', script.textContent, {
          type: script.type,
          element: 'script',
          size: script.textContent.length
        });
      }
    });
  }

  // Capture all stylesheet elements
  captureStylesheets() {
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      this.addAsset(link.href, 'stylesheet', {
        media: link.media,
        integrity: link.integrity,
        crossOrigin: link.crossOrigin,
        element: 'link'
      });
    });

    document.querySelectorAll('style').forEach(style => {
      this.addInlineAsset('stylesheet', style.textContent, {
        media: style.media,
        element: 'style',
        size: style.textContent.length
      });
    });
  }

  // Capture all image elements
  captureImages() {
    document.querySelectorAll('img').forEach(img => {
      if (img.src) {
        this.addAsset(img.src, 'image', {
          alt: img.alt,
          loading: img.loading,
          crossOrigin: img.crossOrigin,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          element: 'img'
        });
      }
    });
  }

  // Capture other link elements
  captureLinks() {
    document.querySelectorAll('link:not([rel="stylesheet"])').forEach(link => {
      if (link.href) {
        const assetType = this.determineAssetType(link.href);
        this.addAsset(link.href, assetType, {
          rel: link.rel,
          type: link.type,
          element: 'link'
        });
      }
    });
  }

  // Add an asset to the current snapshot
  addAsset(url, type, metadata = {}) {
    if (!this.currentSnapshot) return;

    try {
      const urlObj = new URL(url);
      const assetId = this.generateAssetId(url);
      
      const asset = {
        id: assetId,
        url: url,
        type: type,
        domain: urlObj.hostname,
        path: urlObj.pathname,
        protocol: urlObj.protocol,
        size: 0,
        loadTime: 0,
        firstSeen: new Date().toISOString(),
        metadata: metadata,
        security: {
          isSecure: urlObj.protocol === 'https:',
          crossOrigin: metadata.crossOrigin || false,
          hasIntegrity: !!metadata.integrity
        }
      };

      this.currentSnapshot.assets.set(assetId, asset);
      this.currentSnapshot.network.domains.add(urlObj.hostname);
      this.currentSnapshot.network.protocols.add(urlObj.protocol);
      this.currentSnapshot.network.requests++;

    } catch (error) {
      console.warn('Failed to add asset:', url, error);
    }
  }

  // Add inline asset (script/style content)
  addInlineAsset(type, content, metadata = {}) {
    if (!this.currentSnapshot) return;

    const assetId = `inline_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const asset = {
      id: assetId,
      url: null,
      type: type,
      domain: window.location.hostname,
      path: null,
      protocol: window.location.protocol,
      size: content.length,
      loadTime: 0,
      firstSeen: new Date().toISOString(),
      content: content.length > 10000 ? content.substr(0, 10000) + '...' : content,
      metadata: { ...metadata, inline: true },
      security: {
        isSecure: window.location.protocol === 'https:',
        crossOrigin: false,
        hasIntegrity: false
      }
    };

    this.currentSnapshot.assets.set(assetId, asset);
    this.currentSnapshot.network.totalSize += content.length;
  }

  // Setup performance observer for resource timing
  setupPerformanceObserver() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      observer.observe({ entryTypes: ['resource', 'navigation', 'measure', 'mark'] });

      // Store observer for cleanup
      if (this.currentSnapshot) {
        this.currentSnapshot.performanceObserver = observer;
      }

    } catch (error) {
      console.warn('Performance Observer setup failed:', error);
    }
  }

  // Process performance entry
  processPerformanceEntry(entry) {
    if (!this.currentSnapshot) return;

    if (entry.entryType === 'resource') {
      const assetId = this.generateAssetId(entry.name);
      const asset = this.currentSnapshot.assets.get(assetId);
      
      if (asset) {
        asset.size = entry.transferSize || entry.encodedBodySize || 0;
        asset.loadTime = entry.duration;
        asset.timing = {
          startTime: entry.startTime,
          duration: entry.duration,
          domainLookup: entry.domainLookupEnd - entry.domainLookupStart,
          connect: entry.connectEnd - entry.connectStart,
          request: entry.responseStart - entry.requestStart,
          response: entry.responseEnd - entry.responseStart
        };
        
        this.currentSnapshot.network.totalSize += asset.size;
      } else {
        // New asset discovered via performance API
        const assetType = this.determineAssetType(entry.name);
        this.addAsset(entry.name, assetType, {
          discoveredVia: 'performance',
          size: entry.transferSize || entry.encodedBodySize || 0,
          loadTime: entry.duration
        });
      }

      this.currentSnapshot.performance.resourceTiming.push({
        name: entry.name,
        type: entry.initiatorType,
        size: entry.transferSize || entry.encodedBodySize || 0,
        duration: entry.duration,
        startTime: entry.startTime
      });
    }
  }

  // Determine asset type from URL
  determineAssetType(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const search = urlObj.search.toLowerCase();

      // Check by file extension
      for (const [type, config] of Object.entries(this.assetTypes)) {
        if (config.extensions) {
          if (config.extensions.some(ext => pathname.endsWith(ext))) {
            return type;
          }
        }
        
        if (config.patterns) {
          if (config.patterns.some(pattern => pathname.includes(pattern) || search.includes(pattern))) {
            return type;
          }
        }
      }

      // Default categorization
      if (pathname.includes('/api/') || pathname.includes('/rest/')) {
        return 'api';
      }

      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  // Generate unique asset ID
  generateAssetId(url) {
    return btoa(url).replace(/[+=\/]/g, '').substr(0, 16);
  }

  // Get navigation timing
  getNavigationTiming() {
    if (!performance.timing) return {};

    const timing = performance.timing;
    return {
      navigationStart: timing.navigationStart,
      domainLookup: timing.domainLookupEnd - timing.domainLookupStart,
      connect: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      domLoading: timing.domLoading - timing.navigationStart,
      domComplete: timing.domComplete - timing.navigationStart,
      loadComplete: timing.loadEventEnd - timing.navigationStart
    };
  }

  // Get CSP information
  getCSPInfo() {
    const cspHeaders = [];
    const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
    
    metaTags.forEach(meta => {
      cspHeaders.push({
        source: 'meta',
        policy: meta.content
      });
    });

    return {
      hasCSP: cspHeaders.length > 0,
      policies: cspHeaders
    };
  }

  // Get storage size
  getStorageSize(storageType) {
    try {
      const storage = window[storageType];
      let size = 0;
      for (let key in storage) {
        if (storage.hasOwnProperty(key)) {
          size += storage[key].length + key.length;
        }
      }
      return size;
    } catch {
      return 0;
    }
  }

  // Generate comprehensive asset map
  generateAssetMap() {
    if (!this.currentSnapshot) return;

    const assetMap = {
      id: `map_${this.currentSnapshot.id}`,
      domain: this.currentSnapshot.domain,
      createdAt: new Date().toISOString(),
      summary: {
        totalAssets: this.currentSnapshot.assets.size,
        totalSize: this.currentSnapshot.network.totalSize,
        domains: this.currentSnapshot.network.domains.size,
        protocols: Array.from(this.currentSnapshot.network.protocols)
      },
      byType: {},
      byDomain: {},
      dependencies: [],
      criticalPath: [],
      security: {
        mixedContent: [],
        missingIntegrity: [],
        crossOrigin: []
      }
    };

    // Group assets by type and domain
    for (const [id, asset] of this.currentSnapshot.assets) {
      // By type
      if (!assetMap.byType[asset.type]) {
        assetMap.byType[asset.type] = [];
      }
      assetMap.byType[asset.type].push(asset);

      // By domain
      if (!assetMap.byDomain[asset.domain]) {
        assetMap.byDomain[asset.domain] = [];
      }
      assetMap.byDomain[asset.domain].push(asset);

      // Security analysis
      if (window.location.protocol === 'https:' && asset.protocol === 'http:') {
        assetMap.security.mixedContent.push(asset);
      }

      if (asset.domain !== window.location.hostname && !asset.security.hasIntegrity) {
        assetMap.security.missingIntegrity.push(asset);
      }

      if (asset.security.crossOrigin) {
        assetMap.security.crossOrigin.push(asset);
      }
    }

    // Calculate dependencies (simplified)
    assetMap.dependencies = this.calculateDependencies();

    // Identify critical path assets
    assetMap.criticalPath = this.identifyCriticalPath();

    this.assetMaps.set(assetMap.id, assetMap);
    this.currentSnapshot.assetMapId = assetMap.id;
  }

  // Calculate asset dependencies
  calculateDependencies() {
    // Simplified dependency calculation
    // In a full implementation, this would parse JS/CSS for imports
    const dependencies = [];
    
    for (const [id, asset] of this.currentSnapshot.assets) {
      if (asset.type === 'javascript' && asset.metadata.element === 'script') {
        // Scripts that block parsing are dependencies for DOM completion
        if (!asset.metadata.async && !asset.metadata.defer) {
          dependencies.push({
            asset: asset.id,
            dependsOn: [],
            blocks: ['DOMContentLoaded']
          });
        }
      }
    }

    return dependencies;
  }

  // Identify critical path assets
  identifyCriticalPath() {
    const critical = [];
    
    for (const [id, asset] of this.currentSnapshot.assets) {
      // CSS and synchronous JS are typically on critical path
      if (asset.type === 'stylesheet' || 
          (asset.type === 'javascript' && !asset.metadata.async && !asset.metadata.defer)) {
        critical.push({
          assetId: asset.id,
          url: asset.url,
          type: asset.type,
          size: asset.size,
          loadTime: asset.loadTime
        });
      }
    }

    return critical.sort((a, b) => a.loadTime - b.loadTime);
  }

  // Calculate final metrics
  calculateFinalMetrics() {
    if (!this.currentSnapshot) return;

    const metrics = {
      performance: {
        totalLoadTime: this.currentSnapshot.duration,
        averageAssetSize: this.currentSnapshot.network.totalSize / this.currentSnapshot.assets.size,
        domainCount: this.currentSnapshot.network.domains.size,
        requestCount: this.currentSnapshot.network.requests
      },
      security: {
        httpsPercentage: 0,
        crossOriginAssets: 0,
        integrityProtectedAssets: 0,
        mixedContentWarnings: 0
      },
      efficiency: {
        cacheableAssets: 0,
        compressedAssets: 0,
        optimizedImages: 0
      }
    };

    let httpsCount = 0;
    let crossOriginCount = 0;
    let integrityCount = 0;

    for (const [id, asset] of this.currentSnapshot.assets) {
      if (asset.security.isSecure) httpsCount++;
      if (asset.security.crossOrigin) crossOriginCount++;
      if (asset.security.hasIntegrity) integrityCount++;
    }

    metrics.security.httpsPercentage = (httpsCount / this.currentSnapshot.assets.size) * 100;
    metrics.security.crossOriginAssets = crossOriginCount;
    metrics.security.integrityProtectedAssets = integrityCount;

    this.currentSnapshot.performance.metrics = metrics;
  }

  // Get snapshot by ID
  getSnapshot(snapshotId) {
    return this.snapshots.get(snapshotId);
  }

  // Get asset map by ID
  getAssetMap(mapId) {
    return this.assetMaps.get(mapId);
  }

  // Get all snapshots for a domain
  getSnapshotsForDomain(domain) {
    return Array.from(this.snapshots.values())
      .filter(snapshot => snapshot.domain === domain)
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }

  // Compare two snapshots
  compareSnapshots(snapshot1Id, snapshot2Id) {
    const snap1 = this.snapshots.get(snapshot1Id);
    const snap2 = this.snapshots.get(snapshot2Id);

    if (!snap1 || !snap2) {
      throw new Error('One or both snapshots not found');
    }

    return {
      comparison: {
        timeRange: {
          from: snap1.startTime,
          to: snap2.startTime
        },
        assets: {
          added: this.getAddedAssets(snap1, snap2),
          removed: this.getRemovedAssets(snap1, snap2),
          modified: this.getModifiedAssets(snap1, snap2)
        },
        performance: {
          loadTime: {
            before: snap1.duration,
            after: snap2.duration,
            change: snap2.duration - snap1.duration
          },
          totalSize: {
            before: snap1.network.totalSize,
            after: snap2.network.totalSize,
            change: snap2.network.totalSize - snap1.network.totalSize
          },
          requestCount: {
            before: snap1.network.requests,
            after: snap2.network.requests,
            change: snap2.network.requests - snap1.network.requests
          }
        }
      }
    };
  }

  // Get added assets between snapshots
  getAddedAssets(oldSnapshot, newSnapshot) {
    const oldUrls = new Set();
    for (const [id, asset] of oldSnapshot.assets) {
      if (asset.url) oldUrls.add(asset.url);
    }

    const added = [];
    for (const [id, asset] of newSnapshot.assets) {
      if (asset.url && !oldUrls.has(asset.url)) {
        added.push(asset);
      }
    }

    return added;
  }

  // Get removed assets between snapshots
  getRemovedAssets(oldSnapshot, newSnapshot) {
    const newUrls = new Set();
    for (const [id, asset] of newSnapshot.assets) {
      if (asset.url) newUrls.add(asset.url);
    }

    const removed = [];
    for (const [id, asset] of oldSnapshot.assets) {
      if (asset.url && !newUrls.has(asset.url)) {
        removed.push(asset);
      }
    }

    return removed;
  }

  // Get modified assets between snapshots
  getModifiedAssets(oldSnapshot, newSnapshot) {
    const modifications = [];
    const oldAssetsByUrl = new Map();
    
    for (const [id, asset] of oldSnapshot.assets) {
      if (asset.url) oldAssetsByUrl.set(asset.url, asset);
    }

    for (const [id, asset] of newSnapshot.assets) {
      if (asset.url && oldAssetsByUrl.has(asset.url)) {
        const oldAsset = oldAssetsByUrl.get(asset.url);
        if (asset.size !== oldAsset.size || asset.loadTime !== oldAsset.loadTime) {
          modifications.push({
            url: asset.url,
            changes: {
              size: { old: oldAsset.size, new: asset.size },
              loadTime: { old: oldAsset.loadTime, new: asset.loadTime }
            }
          });
        }
      }
    }

    return modifications;
  }

  // Export snapshot data
  exportSnapshot(snapshotId, format = 'json') {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    const assetMap = snapshot.assetMapId ? this.assetMaps.get(snapshot.assetMapId) : null;

    const exportData = {
      snapshot: {
        ...snapshot,
        assets: Object.fromEntries(snapshot.assets)
      },
      assetMap
    };

    switch (format.toLowerCase()) {
      case 'csv':
        return this.exportSnapshotAsCSV(exportData);
      case 'txt':
        return this.exportSnapshotAsText(exportData);
      default:
        return JSON.stringify(exportData, null, 2);
    }
  }

  // Export snapshot as CSV
  exportSnapshotAsCSV(data) {
    let csv = 'Asset ID,URL,Type,Domain,Size,Load Time,Protocol,Is Secure,Cross Origin\n';
    
    for (const [id, asset] of Object.entries(data.snapshot.assets)) {
      csv += `"${asset.id}","${asset.url || 'inline'}","${asset.type}","${asset.domain}",${asset.size},${asset.loadTime},"${asset.protocol}",${asset.security.isSecure},${asset.security.crossOrigin}\n`;
    }
    
    return csv;
  }

  // Export snapshot as text
  exportSnapshotAsText(data) {
    const snapshot = data.snapshot;
    let output = `Domain Snapshot Report\n`;
    output += `Domain: ${snapshot.domain}\n`;
    output += `URL: ${snapshot.url}\n`;
    output += `Captured: ${snapshot.startTime}\n`;
    output += `Duration: ${snapshot.duration}ms\n\n`;
    
    output += `Summary:\n`;
    output += `  Total Assets: ${Object.keys(snapshot.assets).length}\n`;
    output += `  Total Size: ${snapshot.network.totalSize} bytes\n`;
    output += `  Unique Domains: ${snapshot.network.domains.size}\n`;
    output += `  Total Requests: ${snapshot.network.requests}\n\n`;
    
    if (data.assetMap) {
      output += `Asset Breakdown:\n`;
      for (const [type, assets] of Object.entries(data.assetMap.byType)) {
        output += `  ${type}: ${assets.length} assets\n`;
      }
    }
    
    return output;
  }

  // Clear all data
  clear() {
    this.snapshots.clear();
    this.assetMaps.clear();
    this.currentSnapshot = null;
    this.isCapturing = false;
  }

  // Get statistics
  getStats() {
    return {
      totalSnapshots: this.snapshots.size,
      totalAssetMaps: this.assetMaps.size,
      isCurrentlyCapturing: this.isCapturing,
      domains: [...new Set(Array.from(this.snapshots.values()).map(s => s.domain))]
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DomainSnapshotEngine;
} else if (typeof window !== 'undefined') {
  window.DomainSnapshotEngine = DomainSnapshotEngine;
}
