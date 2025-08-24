// Enhanced Export System for Lazy Egg
class LazyEggExporter {
  constructor() {
    this.exportFormats = {
      json: 'JSON Format',
      csv: 'CSV Format', 
      txt: 'Text Report',
      burp: 'Burp Suite Format',
      sarif: 'SARIF Format (Security)',
      linkfinder: 'LinkFinder Compatible'
    };
  }

  // Export endpoints in LinkFinder compatible format
  async exportEndpointsForLinkFinder() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'getEndpoints' }, (endpoints) => {
        const linkfinderData = {
          tool: "LazyEgg-LinkFinder",
          version: "1.0",
          timestamp: new Date().toISOString(),
          endpoints: []
        };

        Object.values(endpoints).forEach(data => {
          const eps = data.endpoints;
          Object.entries(eps).forEach(([category, categoryEndpoints]) => {
            if (Array.isArray(categoryEndpoints)) {
              categoryEndpoints.forEach(endpoint => {
                linkfinderData.endpoints.push({
                  url: endpoint,
                  source: data.url,
                  category: category,
                  method: "GET",
                  type: "discovered"
                });
              });
            }
          });
        });

        resolve(JSON.stringify(linkfinderData, null, 2));
      });
    });
  }

  // Export endpoints for Burp Suite integration
  async exportEndpointsForBurp() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'getEndpoints' }, (endpoints) => {
        const burpData = [];

        Object.values(endpoints).forEach(data => {
          const eps = data.endpoints;
          Object.entries(eps).forEach(([category, categoryEndpoints]) => {
            if (Array.isArray(categoryEndpoints)) {
              categoryEndpoints.forEach(endpoint => {
                try {
                  const url = new URL(endpoint, data.url || window.location.href);
                  burpData.push({
                    protocol: url.protocol.replace(':', ''),
                    host: url.hostname,
                    port: url.port || (url.protocol === 'https:' ? 443 : 80),
                    path: url.pathname + url.search,
                    method: "GET",
                    url: url.href,
                    source: data.url,
                    category: category,
                    comment: `Discovered by LazyEgg from ${data.url}`
                  });
                } catch (e) {
                  // Skip invalid URLs
                }
              });
            }
          });
        });

        resolve(JSON.stringify(burpData, null, 2));
      });
    });
  }

  // Export secrets in SARIF format for security tools
  async exportSecretsAsSARIF() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'getSecrets' }, (secrets) => {
        const sarif = {
          version: "2.1.0",
          $schema: "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json",
          runs: [{
            tool: {
              driver: {
                name: "LazyEgg-SecretDetector",
                version: "1.0.0",
                informationUri: "https://github.com/jarek-bir/lazyeg-reborn",
                rules: []
              }
            },
            results: []
          }]
        };

        const run = sarif.runs[0];
        const ruleMap = new Map();
        let ruleIndex = 0;

        Object.values(secrets).forEach(data => {
          data.secrets.secrets.forEach(secret => {
            // Create rule if not exists
            if (!ruleMap.has(secret.type)) {
              ruleMap.set(secret.type, ruleIndex++);
              run.tool.driver.rules.push({
                id: secret.type.replace(/\s+/g, '_').toLowerCase(),
                name: secret.type,
                shortDescription: { text: secret.type },
                fullDescription: { text: `Detection of ${secret.type} in source code` },
                defaultConfiguration: {
                  level: secret.severity === 'critical' ? 'error' : 
                         secret.severity === 'high' ? 'error' :
                         secret.severity === 'medium' ? 'warning' : 'note'
                },
                properties: {
                  security: true,
                  category: secret.category,
                  severity: secret.severity
                }
              });
            }

            // Add result
            run.results.push({
              ruleId: secret.type.replace(/\s+/g, '_').toLowerCase(),
              ruleIndex: ruleMap.get(secret.type),
              message: { text: `Detected ${secret.type}: ${secret.value}` },
              locations: [{
                physicalLocation: {
                  artifactLocation: { uri: data.url },
                  region: {
                    startLine: secret.line || 1,
                    startColumn: 1
                  }
                }
              }],
              level: secret.severity === 'critical' ? 'error' : 
                     secret.severity === 'high' ? 'error' :
                     secret.severity === 'medium' ? 'warning' : 'note',
              properties: {
                severity: secret.severity,
                category: secret.category,
                masked_value: secret.value
              }
            });
          });
        });

        resolve(JSON.stringify(sarif, null, 2));
      });
    });
  }

  // Export comprehensive report
  async exportComprehensiveReport() {
    return new Promise((resolve) => {
      Promise.all([
        new Promise(res => chrome.runtime.sendMessage({ type: 'getStats' }, res)),
        new Promise(res => chrome.runtime.sendMessage({ type: 'getEndpoints' }, res)),
        new Promise(res => chrome.runtime.sendMessage({ type: 'getSecrets' }, res)),
        new Promise(res => chrome.runtime.sendMessage({ type: 'getDomainData' }, res)),
        new Promise(res => chrome.runtime.sendMessage({ type: 'getSnapshots' }, res))
      ]).then(([stats, endpoints, secrets, domainData, snapshots]) => {
        
        const report = {
          metadata: {
            generatedAt: new Date().toISOString(),
            tool: "LazyEgg Enhanced",
            version: "5.0",
            currentUrl: window.location.href,
            userAgent: navigator.userAgent
          },
          summary: stats,
          findings: {
            endpoints: this.summarizeEndpoints(endpoints),
            secrets: this.summarizeSecrets(secrets),
            domains: this.summarizeDomains(domainData),
            snapshots: this.summarizeSnapshots(snapshots)
          },
          recommendations: this.generateRecommendations(stats, secrets),
          rawData: {
            endpoints,
            secrets,
            domainData,
            snapshots
          }
        };

        resolve(JSON.stringify(report, null, 2));
      });
    });
  }

  summarizeEndpoints(endpoints) {
    const summary = {
      totalFiles: Object.keys(endpoints).length,
      totalEndpoints: 0,
      byCategory: {},
      topDomains: {}
    };

    Object.values(endpoints).forEach(data => {
      Object.entries(data.endpoints).forEach(([category, eps]) => {
        if (Array.isArray(eps)) {
          summary.totalEndpoints += eps.length;
          summary.byCategory[category] = (summary.byCategory[category] || 0) + eps.length;
          
          eps.forEach(endpoint => {
            try {
              const domain = new URL(endpoint, data.url).hostname;
              summary.topDomains[domain] = (summary.topDomains[domain] || 0) + 1;
            } catch (e) {}
          });
        }
      });
    });

    summary.topDomains = Object.entries(summary.topDomains)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [domain, count]) => ({ ...obj, [domain]: count }), {});

    return summary;
  }

  summarizeSecrets(secrets) {
    const summary = {
      totalFiles: Object.keys(secrets).length,
      totalSecrets: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      byType: {}
    };

    Object.values(secrets).forEach(data => {
      summary.totalSecrets += data.secrets.secrets.length;
      
      data.secrets.secrets.forEach(secret => {
        summary.bySeverity[secret.severity]++;
        summary.byType[secret.type] = (summary.byType[secret.type] || 0) + 1;
      });
    });

    return summary;
  }

  summarizeDomains(domainData) {
    return {
      totalAnalyzed: Object.keys(domainData).length,
      analysis: domainData
    };
  }

  summarizeSnapshots(snapshots) {
    return {
      totalSnapshots: Object.keys(snapshots).length,
      latestSnapshot: Object.keys(snapshots).length > 0 ? 
        Object.keys(snapshots).sort().pop() : null
    };
  }

  generateRecommendations(stats, secrets) {
    const recommendations = [];

    // Security recommendations based on secrets
    if (stats.secrets?.bySeverity?.critical > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Security',
        title: 'Critical Secrets Detected',
        description: `Found ${stats.secrets.bySeverity.critical} critical secret(s). Immediate action required.`,
        actions: [
          'Rotate all exposed credentials immediately',
          'Review code for hardcoded secrets', 
          'Implement proper secret management',
          'Set up CI/CD secret scanning'
        ]
      });
    }

    if (stats.secrets?.bySeverity?.high > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Security', 
        title: 'High-Risk Secrets Found',
        description: `Found ${stats.secrets.bySeverity.high} high-risk secret(s).`,
        actions: [
          'Review and rotate exposed secrets',
          'Implement environment variables',
          'Use secret management services'
        ]
      });
    }

    // Endpoint security recommendations
    if (stats.endpoints?.total > 100) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Attack Surface',
        title: 'Large Attack Surface',
        description: `Discovered ${stats.endpoints.total} endpoints across ${stats.endpoints.files} files.`,
        actions: [
          'Review endpoint security',
          'Implement proper authentication',
          'Consider API rate limiting',
          'Review exposed API documentation'
        ]
      });
    }

    // Domain recommendations
    if (stats.jsFiles?.domains > 20) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Third-party Risk',
        title: 'Multiple Third-party Domains',
        description: `Loading resources from ${stats.jsFiles.domains} different domains.`,
        actions: [
          'Review third-party dependencies',
          'Implement Subresource Integrity (SRI)',
          'Consider Content Security Policy (CSP)',
          'Monitor third-party changes'
        ]
      });
    }

    return recommendations;
  }

  // Download file with given content
  downloadFile(content, filename, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Export endpoints in specified format
  async exportEndpoints(format = 'json') {
    let content, filename, mimeType;
    
    switch (format) {
      case 'burp':
        content = await this.exportEndpointsForBurp();
        filename = `lazy-egg-endpoints-burp-${Date.now()}.json`;
        mimeType = 'application/json';
        break;
      case 'linkfinder':
        content = await this.exportEndpointsForLinkFinder();
        filename = `lazy-egg-endpoints-linkfinder-${Date.now()}.json`;
        mimeType = 'application/json';
        break;
      default:
        content = await new Promise(resolve => {
          chrome.runtime.sendMessage({ type: 'getEndpoints' }, resolve);
        });
        content = JSON.stringify(content, null, 2);
        filename = `lazy-egg-endpoints-${Date.now()}.json`;
        mimeType = 'application/json';
    }

    this.downloadFile(content, filename, mimeType);
    return filename;
  }

  // Export secrets in specified format  
  async exportSecrets(format = 'json') {
    let content, filename, mimeType;
    
    switch (format) {
      case 'sarif':
        content = await this.exportSecretsAsSARIF();
        filename = `lazy-egg-secrets-sarif-${Date.now()}.json`;
        mimeType = 'application/json';
        break;
      default:
        content = await new Promise(resolve => {
          chrome.runtime.sendMessage({ type: 'getSecrets' }, resolve);
        });
        content = JSON.stringify(content, null, 2);
        filename = `lazy-egg-secrets-${Date.now()}.json`;
        mimeType = 'application/json';
    }

    this.downloadFile(content, filename, mimeType);
    return filename;
  }

  // Export comprehensive report
  async exportReport() {
    const content = await this.exportComprehensiveReport();
    const filename = `lazy-egg-comprehensive-report-${Date.now()}.json`;
    this.downloadFile(content, filename, 'application/json');
    return filename;
  }
}

// Export for use in popup
if (typeof window !== 'undefined') {
  window.LazyEggExporter = LazyEggExporter;
}
