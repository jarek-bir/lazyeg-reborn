// Domain Categorization Engine
class DomainCategorizer {
  constructor() {
    this.currentDomain = window.location.hostname;
    this.categories = {
      local: new Set(),
      thirdParty: new Set(),
      cdn: new Set(),
      analytics: new Set(),
      advertising: new Set(),
      social: new Set(),
      security: new Set(),
      payment: new Set(),
      api: new Set(),
      development: new Set()
    };

    // Known domain patterns
    this.patterns = {
      cdn: [
        'cdn.', 'static.', 'assets.', 'js.', 'css.', 'img.',
        'cloudfront.net', 'fastly.com', 'jsdelivr.net', 'unpkg.com',
        'cdnjs.cloudflare.com', 'ajax.googleapis.com', 'maxcdn.bootstrapcdn.com'
      ],
      analytics: [
        'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
        'mixpanel.com', 'segment.com', 'amplitude.com', 'hotjar.com',
        'fullstory.com', 'logrocket.com', 'bugsnag.com', 'sentry.io'
      ],
      advertising: [
        'googlesyndication.com', 'googleadservices.com', 'facebook.com/tr',
        'adsystem.com', 'amazon-adsystem.com', 'bing.com', 'pinterest.com',
        'twitter.com', 'linkedin.com', 'snapchat.com'
      ],
      social: [
        'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com',
        'youtube.com', 'vimeo.com', 'pinterest.com', 'reddit.com',
        'discord.com', 'slack.com', 'teams.microsoft.com'
      ],
      security: [
        'recaptcha.net', 'captcha.com', 'cloudflare.com', 'sucuri.net',
        'incapsula.com', 'fastly.com', 'akamai.com', 'keycdn.com'
      ],
      payment: [
        'stripe.com', 'paypal.com', 'square.com', 'braintree.com',
        'adyen.com', 'klarna.com', 'checkout.com', 'razorpay.com'
      ],
      api: [
        'api.', 'rest.', 'graphql.', 'webhook.', 'gateway.',
        'herokuapp.com', 'vercel.app', 'netlify.app', 'firebase.com'
      ],
      development: [
        'localhost', '127.0.0.1', '0.0.0.0', '192.168.',
        'dev.', 'staging.', 'test.', 'preview.', 'beta.',
        'ngrok.io', 'localtunnel.me', 'github.io', 'gitlab.io'
      ]
    };

    this.domainInfo = new Map();
    this.initializeCategories();
  }

  // Initialize domain categories
  initializeCategories() {
    // Add current domain to local category
    this.categories.local.add(this.currentDomain);
    
    // Add common localhost patterns
    ['localhost', '127.0.0.1', '0.0.0.0', '::1'].forEach(domain => {
      this.categories.local.add(domain);
    });
  }

  // Categorize a domain
  categorizeDomain(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      const fullDomain = domain;
      
      // Check if already categorized
      if (this.domainInfo.has(domain)) {
        return this.domainInfo.get(domain);
      }

      const info = {
        domain: fullDomain,
        isLocal: this.isLocalDomain(domain),
        isThirdParty: !this.isLocalDomain(domain),
        categories: [],
        subdomains: this.extractSubdomains(domain),
        topLevelDomain: this.extractTLD(domain),
        isSecure: urlObj.protocol === 'https:',
        port: urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80'),
        firstSeen: new Date().toISOString(),
        requestCount: 1,
        resourceTypes: new Set(),
        riskScore: 0
      };

      // Categorize based on patterns
      info.categories = this.identifyCategories(domain);
      
      // Calculate risk score
      info.riskScore = this.calculateRiskScore(domain, info);
      
      // Add to appropriate category sets
      if (info.isLocal) {
        this.categories.local.add(domain);
      } else {
        this.categories.thirdParty.add(domain);
      }

      info.categories.forEach(category => {
        if (this.categories[category]) {
          this.categories[category].add(domain);
        }
      });

      // Store domain info
      this.domainInfo.set(domain, info);
      
      return info;
    } catch (error) {
      console.warn('Failed to categorize domain:', url, error);
      return {
        domain: url,
        isLocal: false,
        isThirdParty: true,
        categories: ['unknown'],
        error: error.message,
        riskScore: 5
      };
    }
  }

  // Check if domain is local/same-origin
  isLocalDomain(domain) {
    // Same domain
    if (domain === this.currentDomain) {
      return true;
    }

    // Subdomain of current domain
    if (domain.endsWith('.' + this.currentDomain)) {
      return true;
    }

    // Current domain is subdomain of this domain
    if (this.currentDomain.endsWith('.' + domain)) {
      return true;
    }

    // Local development patterns
    const localPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /\.local$/,
      /\.test$/,
      /\.dev$/
    ];

    return localPatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return domain === pattern || domain.endsWith('.' + pattern);
      } else {
        return pattern.test(domain);
      }
    });
  }

  // Identify domain categories
  identifyCategories(domain) {
    const categories = [];

    for (const [category, patterns] of Object.entries(this.patterns)) {
      if (patterns.some(pattern => {
        if (typeof pattern === 'string') {
          return domain.includes(pattern);
        } else {
          return pattern.test(domain);
        }
      })) {
        categories.push(category);
      }
    }

    // If no specific category found, classify as general third-party
    if (categories.length === 0 && !this.isLocalDomain(domain)) {
      categories.push('thirdParty');
    }

    return categories;
  }

  // Extract subdomains
  extractSubdomains(domain) {
    const parts = domain.split('.');
    if (parts.length <= 2) return [];
    
    return parts.slice(0, -2);
  }

  // Extract top-level domain
  extractTLD(domain) {
    const parts = domain.split('.');
    return parts.slice(-2).join('.');
  }

  // Calculate risk score (0-10, where 10 is highest risk)
  calculateRiskScore(domain, info) {
    let score = 0;

    // Base score for third-party domains
    if (info.isThirdParty) {
      score += 2;
    }

    // Security-related adjustments
    if (!info.isSecure) {
      score += 3; // HTTP is riskier than HTTPS
    }

    // Category-based scoring
    if (info.categories.includes('advertising')) score += 2;
    if (info.categories.includes('analytics')) score += 1;
    if (info.categories.includes('social')) score += 1;
    if (info.categories.includes('development')) score += 3;
    if (info.categories.includes('security')) score -= 1; // Security services are generally safer
    if (info.categories.includes('payment')) score -= 1; // Payment providers are usually well-secured

    // Domain characteristics
    if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
      score += 2; // Local development can be risky in production
    }

    // Suspicious patterns
    const suspiciousPatterns = [
      /\d+\.\d+\.\d+\.\d+/, // IP addresses
      /[a-z]{10,}\.com/, // Very long domain names
      /-.{20,}/, // Long hyphenated sections
      /\d{4,}/, // Long number sequences
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(domain))) {
      score += 2;
    }

    // Normalize to 0-10 scale
    return Math.min(10, Math.max(0, Math.round(score)));
  }

  // Update domain info when new resources are loaded
  updateDomainInfo(url, resourceType = 'unknown') {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      if (this.domainInfo.has(domain)) {
        const info = this.domainInfo.get(domain);
        info.requestCount++;
        info.resourceTypes.add(resourceType);
        info.lastSeen = new Date().toISOString();
      } else {
        // First time seeing this domain
        const info = this.categorizeDomain(url);
        if (info) {
          info.resourceTypes.add(resourceType);
        }
      }
    } catch (error) {
      console.warn('Failed to update domain info:', url, error);
    }
  }

  // Get domain statistics
  getDomainStats() {
    const stats = {
      total: this.domainInfo.size,
      local: this.categories.local.size,
      thirdParty: this.categories.thirdParty.size,
      byCategory: {},
      riskDistribution: { low: 0, medium: 0, high: 0 },
      topDomains: [],
      securitySummary: {
        httpsCount: 0,
        httpCount: 0,
        localDevCount: 0,
        suspiciousCount: 0
      }
    };

    // Calculate category statistics
    for (const [category, domains] of Object.entries(this.categories)) {
      stats.byCategory[category] = domains.size;
    }

    // Calculate risk distribution and security summary
    for (const [domain, info] of this.domainInfo) {
      const riskLevel = info.riskScore <= 3 ? 'low' : 
                       info.riskScore <= 6 ? 'medium' : 'high';
      stats.riskDistribution[riskLevel]++;

      if (info.isSecure) {
        stats.securitySummary.httpsCount++;
      } else {
        stats.securitySummary.httpCount++;
      }

      if (info.categories.includes('development')) {
        stats.securitySummary.localDevCount++;
      }

      if (info.riskScore >= 7) {
        stats.securitySummary.suspiciousCount++;
      }
    }

    // Get top domains by request count
    stats.topDomains = Array.from(this.domainInfo.entries())
      .sort(([,a], [,b]) => b.requestCount - a.requestCount)
      .slice(0, 10)
      .map(([domain, info]) => ({
        domain,
        requests: info.requestCount,
        categories: info.categories,
        riskScore: info.riskScore,
        isLocal: info.isLocal
      }));

    return stats;
  }

  // Get detailed domain information
  getDomainDetails(domain) {
    return this.domainInfo.get(domain.toLowerCase()) || null;
  }

  // Get all domains in a specific category
  getDomainsByCategory(category) {
    if (!this.categories[category]) {
      return [];
    }

    return Array.from(this.categories[category]).map(domain => {
      const info = this.domainInfo.get(domain);
      return {
        domain,
        info: info || { error: 'No detailed info available' }
      };
    });
  }

  // Export domain categorization data
  exportDomainData(format = 'json') {
    const data = {
      exportDate: new Date().toISOString(),
      currentDomain: this.currentDomain,
      stats: this.getDomainStats(),
      domains: Object.fromEntries(this.domainInfo),
      categories: Object.fromEntries(
        Object.entries(this.categories).map(([key, set]) => [key, Array.from(set)])
      )
    };

    switch (format.toLowerCase()) {
      case 'csv':
        return this.exportAsCSV(data);
      case 'txt':
        return this.exportAsText(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  // Export as CSV
  exportAsCSV(data) {
    let csv = 'Domain,Category,Risk Score,Is Local,Is Secure,Request Count,Resource Types,First Seen\n';
    
    for (const [domain, info] of Object.entries(data.domains)) {
      const categories = info.categories.join(';');
      const resourceTypes = Array.from(info.resourceTypes || []).join(';');
      csv += `"${domain}","${categories}",${info.riskScore},${info.isLocal},${info.isSecure},${info.requestCount},"${resourceTypes}","${info.firstSeen}"\n`;
    }
    
    return csv;
  }

  // Export as text report
  exportAsText(data) {
    let output = `Domain Categorization Report\n`;
    output += `Generated: ${data.exportDate}\n`;
    output += `Current Domain: ${data.currentDomain}\n\n`;
    
    output += `Summary:\n`;
    output += `  Total Domains: ${data.stats.total}\n`;
    output += `  Local Domains: ${data.stats.local}\n`;
    output += `  Third-party Domains: ${data.stats.thirdParty}\n\n`;
    
    output += `Risk Distribution:\n`;
    output += `  Low Risk: ${data.stats.riskDistribution.low}\n`;
    output += `  Medium Risk: ${data.stats.riskDistribution.medium}\n`;
    output += `  High Risk: ${data.stats.riskDistribution.high}\n\n`;
    
    output += `Categories:\n`;
    for (const [category, count] of Object.entries(data.stats.byCategory)) {
      if (count > 0) {
        output += `  ${category}: ${count}\n`;
      }
    }
    output += '\n';
    
    if (data.stats.topDomains.length > 0) {
      output += `Top Domains by Activity:\n`;
      data.stats.topDomains.forEach((domain, index) => {
        output += `  ${index + 1}. ${domain.domain} (${domain.requests} requests, risk: ${domain.riskScore})\n`;
      });
    }
    
    return output;
  }

  // Clear all data
  clear() {
    this.domainInfo.clear();
    Object.keys(this.categories).forEach(category => {
      this.categories[category].clear();
    });
    this.initializeCategories();
  }

  // Get suspicious domains (high risk score)
  getSuspiciousDomains(minRiskScore = 7) {
    return Array.from(this.domainInfo.entries())
      .filter(([domain, info]) => info.riskScore >= minRiskScore)
      .map(([domain, info]) => ({ domain, ...info }))
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  // Check if a domain should trigger an alert
  shouldAlert(domain, info = null) {
    if (!info) {
      info = this.getDomainDetails(domain);
    }
    
    if (!info) return false;

    // Alert conditions
    return (
      info.riskScore >= 8 || // High risk score
      (!info.isSecure && !info.isLocal) || // HTTP third-party
      (info.categories.includes('development') && !info.isLocal) || // Dev domains in production
      info.categories.includes('suspicious') // Explicitly marked as suspicious
    );
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DomainCategorizer;
} else if (typeof window !== 'undefined') {
  window.DomainCategorizer = DomainCategorizer;
}
