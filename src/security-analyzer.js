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

    // Trusted enterprise platforms and cloud providers
    this.trustedPlatforms = {
      'atlassian': {
        patterns: [/atlassian/, /jira/, /confluence/, /bitbucket/i],
        ipRanges: ['54.68.', '34.210.', '52.', '18.'], // AWS US-West
        riskReduction: 30
      },
      'microsoft': {
        patterns: [/microsoft/, /office365/, /sharepoint/, /teams/i],
        ipRanges: ['13.', '20.', '40.', '52.'],
        riskReduction: 25
      },
      'google': {
        patterns: [/google/, /googleapis/, /gstatic/, /youtube/i],
        ipRanges: ['8.8.', '35.', '34.'],
        riskReduction: 25
      },
      'aws': {
        patterns: [/amazonaws/, /cloudfront/, /aws/i],
        ipRanges: ['54.', '52.', '18.', '34.', '35.'],
        riskReduction: 20
      },
      'cloudflare': {
        patterns: [/cloudflare/, /cf-/i],
        ipRanges: ['104.', '172.', '173.'],
        riskReduction: 15
      }
    };

    this.suspiciousPatterns = [
      {
        pattern: /[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/,
        score: 20, // Reduced from 15
        description: 'Direct IP address usage',
        canBeReduced: true // Can be reduced by trusted platforms
      },
      {
        pattern: /\.tk$|\.ml$|\.ga$|\.cf$/,
        score: 30,
        description: 'Suspicious free TLD',
        canBeReduced: false
      },
      {
        pattern: /[a-z0-9]{32,}/,  // Increased from 20 to 32 chars
        score: 8, // Reduced from 15
        description: 'Very long hash (likely cache busting)',
        canBeReduced: true
      },
      {
        pattern: /base64|eval|unescape/i,
        score: 25,
        description: 'Potentially dangerous functions',
        canBeReduced: false
      },
      {
        pattern: /\.php\?.*\.js$/,
        score: 20,
        description: 'Dynamic JS generation',
        canBeReduced: true
      },
      {
        pattern: /\/tmp\/|\/temp\//,
        score: 25,
        description: 'Temporary directory usage',
        canBeReduced: false
      },
      {
        pattern: /localhost:[0-9]+/,
        score: 5, // Reduced - common in development
        description: 'Local development server',
        canBeReduced: false
      }
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
      riskLevel: 'low', // low, medium, high, critical
      trustedPlatform: null,
      platformContext: null
    };

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();

      // Check if external
      analysis.isExternal = hostname !== currentDomain;

      // Check for trusted platforms first
      this.identifyTrustedPlatform(url, analysis);

      // Check CDN
      for (const cdn of this.knownCDNs) {
        if (hostname.includes(cdn) || hostname === cdn) {
          analysis.isCDN = true;
          analysis.cdnProvider = cdn;
          break;
        }
      }

      // Check suspicious patterns with context-aware scoring
      this.checkSuspiciousPatternsContextual(url, analysis);

      // Detect libraries and versions
      this.detectLibrary(url, analysis);

      // Calculate risk level with platform context
      this.calculateRiskLevelContextual(analysis);

    } catch (error) {
      analysis.suspiciousScore += 20;
      analysis.suspiciousReasons.push('Invalid URL format');
      analysis.riskLevel = 'high';
    }

    return analysis;
  }

  identifyTrustedPlatform(url, analysis) {
    for (const [platformName, platformInfo] of Object.entries(this.trustedPlatforms)) {
      // Check URL patterns
      const matchesPattern = platformInfo.patterns.some(pattern => pattern.test(url));
      
      // Check IP ranges
      const matchesIP = platformInfo.ipRanges.some(range => url.includes(range));
      
      if (matchesPattern || matchesIP) {
        analysis.trustedPlatform = platformName;
        analysis.platformContext = {
          matchedBy: matchesPattern ? 'pattern' : 'ip',
          riskReduction: platformInfo.riskReduction
        };
        break;
      }
    }
  }

  checkSuspiciousPatternsContextual(url, analysis) {
    for (const patternInfo of this.suspiciousPatterns) {
      if (patternInfo.pattern.test(url)) {
        let score = patternInfo.score;
        
        // Apply risk reduction for trusted platforms
        if (analysis.trustedPlatform && patternInfo.canBeReduced) {
          const reduction = analysis.platformContext.riskReduction;
          score = Math.max(1, score - reduction); // Never go below 1
          analysis.suspiciousReasons.push(
            `${patternInfo.description} (reduced: trusted ${analysis.trustedPlatform})`
          );
        } else {
          analysis.suspiciousReasons.push(patternInfo.description);
        }
        
        analysis.suspiciousScore += score;
      }
    }

    // Additional contextual checks
    if (url.includes('://') && !url.startsWith('https://')) {
      const score = analysis.trustedPlatform ? 5 : 10; // Reduced for trusted platforms
      analysis.suspiciousScore += score;
      analysis.suspiciousReasons.push('Non-HTTPS URL');
    }

    if (url.includes('..') || url.includes('%2e%2e')) {
      analysis.suspiciousScore += 25;
      analysis.suspiciousReasons.push('Path traversal attempt');
    }

    // Smarter long URL detection
    if (url.length > 200) {
      let score = 10;
      if (analysis.trustedPlatform) {
        score = 3; // Enterprise platforms often have long URLs
        analysis.suspiciousReasons.push('Long URL (common for enterprise platforms)');
      } else {
        analysis.suspiciousReasons.push('Unusually long URL');
      }
      analysis.suspiciousScore += score;
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

  calculateRiskLevelContextual(analysis) {
    let score = analysis.suspiciousScore;
    
    // Boost score for truly dangerous patterns
    if (analysis.suspiciousReasons.some(reason => 
        reason.includes('Path traversal') || 
        reason.includes('dangerous functions') ||
        reason.includes('Suspicious free TLD')
    )) {
      score += 20; // These are always serious
    }
    
    // Reduce score for trusted platforms with context
    if (analysis.trustedPlatform) {
      // Additional reduction based on platform trust level
      const platformBonuses = {
        'microsoft': -5,
        'google': -5,
        'atlassian': -10, // Higher trust for enterprise platforms
        'aws': -3,
        'cloudflare': -2
      };
      score += platformBonuses[analysis.trustedPlatform] || 0;
    }
    
    // CDN bonus
    if (analysis.isCDN) {
      score -= 5; // CDNs are generally safer
    }
    
    // Calculate final risk level
    if (score >= 50) {
      analysis.riskLevel = 'critical';
    } else if (score >= 35) {
      analysis.riskLevel = 'high';
    } else if (score >= 15) {
      analysis.riskLevel = 'medium';
    } else {
      analysis.riskLevel = 'low';
    }

    // Override for very safe sources
    if (analysis.isCDN && score < 10) {
      analysis.riskLevel = 'low';
    }
    
    // Override for trusted platforms with low scores
    if (analysis.trustedPlatform && score < 20) {
      analysis.riskLevel = analysis.riskLevel === 'high' ? 'medium' : analysis.riskLevel;
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
