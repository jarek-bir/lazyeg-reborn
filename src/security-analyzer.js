// Security Analyzer for Lazy Egg JS Watcher
class SecurityAnalyzer {
  constructor() {
    this.knownCDNs = [
      'cdnjs.cloudflare.com',
      'cdn.jsdelivr.net',
      'unpkg.com',
      'code.jquery.com',
      'ajax.googleapis.com',
      'stackpath.bootstrapcdn.com',
      'maxcdn.bootstrapcdn.com',
      'use.fontawesome.com',
      'cdn.bootcss.com',
      'ajax.aspnetcdn.com',
      'cdn.datatables.net',
      'cdnjs.com',
      'rawgit.com',
      'gitcdn.github.io',
      'cdn.rawgit.com'
    ];

    this.suspiciousPatterns = [
      /[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/,  // IP addresses
      /\.tk$|\.ml$|\.ga$|\.cf$/,          // Suspicious TLDs
      /[a-z0-9]{20,}/,                    // Long random strings
      /base64|eval|unescape/i,            // Suspicious functions
      /\.php\?.*\.js$/,                   // Dynamic JS from PHP
      /\/tmp\/|\/temp\//,                 // Temp directories
      /localhost:[0-9]+/,                 // Local development servers
      /[0-9]+\.json$|\.jsonp$/           // Data files masquerading as JS
    ];

    this.knownLibraries = {
      'jquery': {
        patterns: [/jquery[.-]([0-9]+\.[0-9]+\.[0-9]+)/i],
        latestVersion: '3.7.1',
        homepage: 'https://jquery.com'
      },
      'react': {
        patterns: [/react[.-]([0-9]+\.[0-9]+\.[0-9]+)/i],
        latestVersion: '18.2.0',
        homepage: 'https://react.dev'
      },
      'vue': {
        patterns: [/vue[.-]([0-9]+\.[0-9]+\.[0-9]+)/i],
        latestVersion: '3.3.4',
        homepage: 'https://vuejs.org'
      },
      'angular': {
        patterns: [/angular[.-]([0-9]+\.[0-9]+\.[0-9]+)/i],
        latestVersion: '16.2.0',
        homepage: 'https://angular.io'
      },
      'bootstrap': {
        patterns: [/bootstrap[.-]([0-9]+\.[0-9]+\.[0-9]+)/i],
        latestVersion: '5.3.1',
        homepage: 'https://getbootstrap.com'
      },
      'lodash': {
        patterns: [/lodash[.-]([0-9]+\.[0-9]+\.[0-9]+)/i],
        latestVersion: '4.17.21',
        homepage: 'https://lodash.com'
      }
    };
  }

  analyzeURL(url, currentDomain) {
    const analysis = {
      url: url,
      isCDN: false,
      isExternal: false,
      cdnProvider: null,
      suspiciousScore: 0,
      suspiciousReasons: [],
      library: null,
      version: null,
      isOutdated: false,
      riskLevel: 'low' // low, medium, high, critical
    };

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();

      // Check if external
      analysis.isExternal = hostname !== currentDomain;

      // Check CDN
      for (const cdn of this.knownCDNs) {
        if (hostname.includes(cdn) || hostname === cdn) {
          analysis.isCDN = true;
          analysis.cdnProvider = cdn;
          break;
        }
      }

      // Check suspicious patterns
      this.checkSuspiciousPatterns(url, analysis);

      // Detect libraries and versions
      this.detectLibrary(url, analysis);

      // Calculate risk level
      this.calculateRiskLevel(analysis);

    } catch (error) {
      analysis.suspiciousScore += 20;
      analysis.suspiciousReasons.push('Invalid URL format');
      analysis.riskLevel = 'high';
    }

    return analysis;
  }

  checkSuspiciousPatterns(url, analysis) {
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(url)) {
        analysis.suspiciousScore += 15;
        analysis.suspiciousReasons.push(`Matches suspicious pattern: ${pattern.source}`);
      }
    }

    // Additional checks
    if (url.includes('://') && !url.startsWith('https://')) {
      analysis.suspiciousScore += 10;
      analysis.suspiciousReasons.push('Non-HTTPS URL');
    }

    if (url.includes('..') || url.includes('%2e%2e')) {
      analysis.suspiciousScore += 25;
      analysis.suspiciousReasons.push('Path traversal attempt');
    }

    if (url.length > 200) {
      analysis.suspiciousScore += 10;
      analysis.suspiciousReasons.push('Unusually long URL');
    }
  }

  detectLibrary(url, analysis) {
    for (const [libName, libInfo] of Object.entries(this.knownLibraries)) {
      for (const pattern of libInfo.patterns) {
        const match = url.match(pattern);
        if (match) {
          analysis.library = libName;
          analysis.version = match[1];
          
          // Check if outdated
          if (this.isVersionOutdated(match[1], libInfo.latestVersion)) {
            analysis.isOutdated = true;
            analysis.suspiciousScore += 5;
            analysis.suspiciousReasons.push(`Outdated ${libName} version (${match[1]} vs ${libInfo.latestVersion})`);
          }
          break;
        }
      }
      if (analysis.library) break;
    }
  }

  isVersionOutdated(currentVersion, latestVersion) {
    try {
      const current = currentVersion.split('.').map(num => parseInt(num, 10));
      const latest = latestVersion.split('.').map(num => parseInt(num, 10));

      for (let i = 0; i < Math.max(current.length, latest.length); i++) {
        const curr = current[i] || 0;
        const lat = latest[i] || 0;
        
        if (curr < lat) return true;
        if (curr > lat) return false;
      }
      return false;
    } catch {
      return false;
    }
  }

  calculateRiskLevel(analysis) {
    if (analysis.suspiciousScore >= 50) {
      analysis.riskLevel = 'critical';
    } else if (analysis.suspiciousScore >= 30) {
      analysis.riskLevel = 'high';
    } else if (analysis.suspiciousScore >= 15) {
      analysis.riskLevel = 'medium';
    } else {
      analysis.riskLevel = 'low';
    }

    // Override for very safe sources
    if (analysis.isCDN && analysis.suspiciousScore < 10) {
      analysis.riskLevel = 'low';
    }
  }

  generateSecurityReport(jsFiles, currentDomain) {
    const analyses = jsFiles.map(url => this.analyzeURL(url, currentDomain));
    
    const report = {
      totalFiles: jsFiles.length,
      externalFiles: analyses.filter(a => a.isExternal).length,
      cdnFiles: analyses.filter(a => a.isCDN).length,
      suspiciousFiles: analyses.filter(a => a.suspiciousScore > 0).length,
      outdatedLibraries: analyses.filter(a => a.isOutdated).length,
      riskDistribution: {
        low: analyses.filter(a => a.riskLevel === 'low').length,
        medium: analyses.filter(a => a.riskLevel === 'medium').length,
        high: analyses.filter(a => a.riskLevel === 'high').length,
        critical: analyses.filter(a => a.riskLevel === 'critical').length
      },
      cdnProviders: [...new Set(analyses.filter(a => a.cdnProvider).map(a => a.cdnProvider))],
      detectedLibraries: analyses.filter(a => a.library).map(a => ({
        library: a.library,
        version: a.version,
        isOutdated: a.isOutdated,
        url: a.url
      })),
      highRiskFiles: analyses.filter(a => ['high', 'critical'].includes(a.riskLevel)),
      analyses: analyses
    };

    return report;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityAnalyzer;
} else {
  window.SecurityAnalyzer = SecurityAnalyzer;
}
