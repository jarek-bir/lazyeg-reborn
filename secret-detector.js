// Secret Token Detection Engine
class SecretDetector {
  constructor() {
    // Comprehensive regex patterns for secret detection
    this.patterns = {
      // API Keys
      apiKeys: {
        google: {
          pattern: /AIza[0-9A-Za-z\-_]{35}/g,
          name: 'Google API Key',
          severity: 'high'
        },
        stripe: {
          pattern: /sk_live_[0-9a-zA-Z]{24,}/g,
          name: 'Stripe Live Secret Key',
          severity: 'critical'
        },
        stripeTest: {
          pattern: /sk_test_[0-9a-zA-Z]{24,}/g,
          name: 'Stripe Test Secret Key',
          severity: 'medium'
        },
        github: {
          pattern: /ghp_[A-Za-z0-9_]{36}/g,
          name: 'GitHub Personal Access Token',
          severity: 'high'
        },
        githubOAuth: {
          pattern: /gho_[A-Za-z0-9_]{36}/g,
          name: 'GitHub OAuth Access Token',
          severity: 'high'
        },
        aws: {
          pattern: /AKIA[0-9A-Z]{16}/g,
          name: 'AWS Access Key',
          severity: 'critical'
        },
        awsSecret: {
          pattern: /[A-Za-z0-9/+=]{40}/g,
          name: 'AWS Secret Key (potential)',
          severity: 'medium'
        },
        slack: {
          pattern: /xox[baprs]-[0-9]{12}-[0-9]{12}-[0-9a-zA-Z]{24}/g,
          name: 'Slack Token',
          severity: 'high'
        },
        discord: {
          pattern: /[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}/g,
          name: 'Discord Bot Token',
          severity: 'high'
        },
        facebook: {
          pattern: /[0-9]{15,16}\|[0-9a-zA-Z_-]{27}/g,
          name: 'Facebook Access Token',
          severity: 'medium'
        },
        twitter: {
          pattern: /[1-9][0-9]+-[0-9a-zA-Z]{40}/g,
          name: 'Twitter Access Token',
          severity: 'medium'
        }
      },

      // JWT Tokens
      jwt: {
        pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
        name: 'JWT Token',
        severity: 'medium'
      },

      // Database Connection Strings
      database: {
        mongodb: {
          pattern: /mongodb:\/\/[^\s'"]+/g,
          name: 'MongoDB Connection String',
          severity: 'high'
        },
        mysql: {
          pattern: /mysql:\/\/[^\s'"]+/g,
          name: 'MySQL Connection String',
          severity: 'high'
        },
        postgres: {
          pattern: /postgres(?:ql)?:\/\/[^\s'"]+/g,
          name: 'PostgreSQL Connection String',
          severity: 'high'
        },
        redis: {
          pattern: /redis:\/\/[^\s'"]+/g,
          name: 'Redis Connection String',
          severity: 'medium'
        }
      },

      // Private Keys
      privateKeys: {
        rsa: {
          pattern: /-----BEGIN RSA PRIVATE KEY-----[\s\S]*?-----END RSA PRIVATE KEY-----/g,
          name: 'RSA Private Key',
          severity: 'critical'
        },
        openssh: {
          pattern: /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----/g,
          name: 'OpenSSH Private Key',
          severity: 'critical'
        },
        dsa: {
          pattern: /-----BEGIN DSA PRIVATE KEY-----[\s\S]*?-----END DSA PRIVATE KEY-----/g,
          name: 'DSA Private Key',
          severity: 'critical'
        },
        ec: {
          pattern: /-----BEGIN EC PRIVATE KEY-----[\s\S]*?-----END EC PRIVATE KEY-----/g,
          name: 'EC Private Key',
          severity: 'critical'
        }
      },

      // Miscellaneous Secrets
      miscellaneous: {
        password: {
          pattern: /(?:password|passwd|pwd)\s*[=:]\s*["']([^"']{8,})["']/gi,
          name: 'Hardcoded Password',
          severity: 'high'
        },
        apiSecret: {
          pattern: /(?:api[_-]?secret|secret[_-]?key)\s*[=:]\s*["']([^"']{16,})["']/gi,
          name: 'API Secret',
          severity: 'high'
        },
        authToken: {
          pattern: /(?:auth[_-]?token|access[_-]?token)\s*[=:]\s*["']([^"']{20,})["']/gi,
          name: 'Authentication Token',
          severity: 'medium'
        },
        sessionSecret: {
          pattern: /session[_-]?secret\s*[=:]\s*["']([^"']{16,})["']/gi,
          name: 'Session Secret',
          severity: 'high'
        },
        encryptionKey: {
          pattern: /(?:encryption[_-]?key|encrypt[_-]?key)\s*[=:]\s*["']([^"']{16,})["']/gi,
          name: 'Encryption Key',
          severity: 'critical'
        }
      },

      // Cloud Service Keys
      cloud: {
        heroku: {
          pattern: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
          name: 'Heroku API Key',
          severity: 'medium'
        },
        mailgun: {
          pattern: /key-[0-9a-zA-Z]{32}/g,
          name: 'Mailgun API Key',
          severity: 'medium'
        },
        sendgrid: {
          pattern: /SG\.[0-9A-Za-z\-_]{22}\.[0-9A-Za-z\-_]{43}/g,
          name: 'SendGrid API Key',
          severity: 'medium'
        },
        twilio: {
          pattern: /AC[a-zA-Z0-9_\-]{32}/g,
          name: 'Twilio Account SID',
          severity: 'medium'
        },
        paypal: {
          pattern: /access_token\$production\$[0-9a-z]{16}\$[0-9a-f]{32}/g,
          name: 'PayPal Access Token',
          severity: 'high'
        }
      }
    };

    this.detectedSecrets = new Map();
    this.scannedFiles = new Set();
  }

  // Main scanning method
  scanForSecrets(content, sourceUrl = '', contentType = 'javascript') {
    const results = {
      secrets: [],
      metadata: {
        sourceUrl,
        contentType,
        scannedAt: new Date().toISOString(),
        contentLength: content.length,
        totalPatterns: this.getTotalPatternCount()
      }
    };

    // Clean content for better detection
    const cleanContent = this.cleanContent(content, contentType);
    
    // Scan with all pattern categories
    for (const [category, patterns] of Object.entries(this.patterns)) {
      const categorySecrets = this.scanCategory(cleanContent, category, patterns, sourceUrl);
      results.secrets.push(...categorySecrets);
    }

    // Remove duplicates and sort by severity
    results.secrets = this.deduplicateAndSort(results.secrets);

    // Store results
    if (sourceUrl) {
      this.detectedSecrets.set(sourceUrl, results);
      this.scannedFiles.add(sourceUrl);
    }

    return results;
  }

  // Scan a specific category of patterns
  scanCategory(content, category, patterns, sourceUrl) {
    const secrets = [];

    if (patterns.pattern) {
      // Single pattern category (like JWT)
      const matches = this.findMatches(content, patterns.pattern);
      matches.forEach(match => {
        secrets.push({
          type: patterns.name,
          category,
          value: this.maskSecret(match.value),
          fullValue: match.value,
          position: match.position,
          line: match.line,
          severity: patterns.severity || 'medium',
          sourceUrl,
          context: this.getContext(content, match.position)
        });
      });
    } else {
      // Multiple patterns in category
      for (const [patternName, patternData] of Object.entries(patterns)) {
        const matches = this.findMatches(content, patternData.pattern);
        matches.forEach(match => {
          secrets.push({
            type: patternData.name,
            category,
            subtype: patternName,
            value: this.maskSecret(match.value),
            fullValue: match.value,
            position: match.position,
            line: match.line,
            severity: patternData.severity || 'medium',
            sourceUrl,
            context: this.getContext(content, match.position)
          });
        });
      }
    }

    return secrets;
  }

  // Find all matches for a pattern
  findMatches(content, pattern) {
    const matches = [];
    let match;

    // Reset pattern lastIndex
    pattern.lastIndex = 0;

    while ((match = pattern.exec(content)) !== null) {
      const value = match[1] || match[0]; // Use captured group if available
      const position = match.index;
      const line = this.getLineNumber(content, position);

      matches.push({ value, position, line });

      // Prevent infinite loops with zero-width matches
      if (match.index === pattern.lastIndex) {
        pattern.lastIndex++;
      }
    }

    return matches;
  }

  // Get line number for a position
  getLineNumber(content, position) {
    return content.substring(0, position).split('\n').length;
  }

  // Get context around a match
  getContext(content, position, contextLength = 100) {
    const start = Math.max(0, position - contextLength);
    const end = Math.min(content.length, position + contextLength);
    return content.substring(start, end);
  }

  // Mask sensitive values for display
  maskSecret(secret) {
    if (secret.length <= 8) {
      return '*'.repeat(secret.length);
    }
    
    const start = secret.substring(0, 4);
    const end = secret.substring(secret.length - 4);
    const middle = '*'.repeat(Math.max(4, secret.length - 8));
    
    return start + middle + end;
  }

  // Clean content for better detection
  cleanContent(content, contentType) {
    switch (contentType.toLowerCase()) {
      case 'javascript':
      case 'js':
        return content
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
          .replace(/\/\/.*$/gm, ''); // Remove line comments
      
      case 'html':
        return content
          .replace(/<!--[\s\S]*?-->/g, ''); // Remove HTML comments
      
      case 'css':
        return content
          .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove CSS comments
      
      default:
        return content;
    }
  }

  // Remove duplicates and sort by severity
  deduplicateAndSort(secrets) {
    const seen = new Set();
    const unique = [];

    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    for (const secret of secrets) {
      const key = `${secret.type}:${secret.fullValue}:${secret.sourceUrl}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(secret);
      }
    }

    return unique.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.type.localeCompare(b.type);
    });
  }

  // Get total number of patterns
  getTotalPatternCount() {
    let count = 0;
    for (const patterns of Object.values(this.patterns)) {
      if (patterns.pattern) {
        count += 1;
      } else {
        count += Object.keys(patterns).length;
      }
    }
    return count;
  }

  // Get all detected secrets
  getAllSecrets() {
    const allSecrets = {
      byFile: Object.fromEntries(this.detectedSecrets),
      summary: {
        totalFiles: this.scannedFiles.size,
        totalSecrets: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        byCategory: {}
      }
    };

    // Calculate summary statistics
    for (const [file, data] of this.detectedSecrets) {
      allSecrets.summary.totalSecrets += data.secrets.length;
      
      data.secrets.forEach(secret => {
        allSecrets.summary.bySeverity[secret.severity]++;
        
        if (!allSecrets.summary.byCategory[secret.category]) {
          allSecrets.summary.byCategory[secret.category] = 0;
        }
        allSecrets.summary.byCategory[secret.category]++;
      });
    }

    return allSecrets;
  }

  // Export secrets in various formats
  exportSecrets(format = 'json', includeSensitive = false) {
    const data = this.getAllSecrets();
    
    if (!includeSensitive) {
      // Remove full values from export
      for (const [file, fileData] of Object.entries(data.byFile)) {
        fileData.secrets.forEach(secret => {
          delete secret.fullValue;
          delete secret.context;
        });
      }
    }
    
    switch (format.toLowerCase()) {
      case 'csv':
        return this.exportSecretsAsCSV(data);
      case 'txt':
        return this.exportSecretsAsText(data);
      case 'sarif':
        return this.exportSecretsAsSARIF(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  // Export as CSV
  exportSecretsAsCSV(data) {
    let csv = 'Source File,Type,Category,Severity,Masked Value,Line,Scanned At\n';
    
    for (const [file, fileData] of Object.entries(data.byFile)) {
      fileData.secrets.forEach(secret => {
        csv += `"${file}","${secret.type}","${secret.category}","${secret.severity}","${secret.value}",${secret.line},"${fileData.metadata.scannedAt}"\n`;
      });
    }
    
    return csv;
  }

  // Export as text report
  exportSecretsAsText(data) {
    let output = `Secret Detection Report\n`;
    output += `Generated: ${new Date().toISOString()}\n`;
    output += `Total Files Scanned: ${data.summary.totalFiles}\n`;
    output += `Total Secrets Found: ${data.summary.totalSecrets}\n\n`;
    
    output += `Severity Breakdown:\n`;
    for (const [severity, count] of Object.entries(data.summary.bySeverity)) {
      if (count > 0) {
        output += `  ${severity.toUpperCase()}: ${count}\n`;
      }
    }
    output += '\n';
    
    for (const [file, fileData] of Object.entries(data.byFile)) {
      if (fileData.secrets.length > 0) {
        output += `\n=== ${file} ===\n`;
        fileData.secrets.forEach(secret => {
          output += `  [${secret.severity.toUpperCase()}] ${secret.type}\n`;
          output += `    Value: ${secret.value}\n`;
          output += `    Line: ${secret.line}\n\n`;
        });
      }
    }
    
    return output;
  }

  // Export as SARIF format (Static Analysis Results Interchange Format)
  exportSecretsAsSARIF(data) {
    const sarif = {
      version: "2.1.0",
      $schema: "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json",
      runs: [{
        tool: {
          driver: {
            name: "SecretDetector",
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

    for (const [file, fileData] of Object.entries(data.byFile)) {
      fileData.secrets.forEach(secret => {
        // Create rule if not exists
        if (!ruleMap.has(secret.type)) {
          ruleMap.set(secret.type, ruleIndex++);
          run.tool.driver.rules.push({
            id: secret.type.replace(/\s+/g, '_').toLowerCase(),
            name: secret.type,
            shortDescription: { text: secret.type },
            defaultConfiguration: {
              level: secret.severity === 'critical' ? 'error' : 
                     secret.severity === 'high' ? 'error' :
                     secret.severity === 'medium' ? 'warning' : 'note'
            }
          });
        }

        // Add result
        run.results.push({
          ruleId: secret.type.replace(/\s+/g, '_').toLowerCase(),
          ruleIndex: ruleMap.get(secret.type),
          message: { text: `Found ${secret.type}: ${secret.value}` },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: file },
              region: {
                startLine: secret.line,
                startColumn: 1
              }
            }
          }],
          level: secret.severity === 'critical' ? 'error' : 
                 secret.severity === 'high' ? 'error' :
                 secret.severity === 'medium' ? 'warning' : 'note'
        });
      });
    }

    return JSON.stringify(sarif, null, 2);
  }

  // Get statistics
  getStats() {
    const allSecrets = this.getAllSecrets();
    return {
      scannedFiles: this.scannedFiles.size,
      totalSecrets: allSecrets.summary.totalSecrets,
      severityBreakdown: allSecrets.summary.bySeverity,
      categoryBreakdown: allSecrets.summary.byCategory,
      totalPatterns: this.getTotalPatternCount()
    };
  }

  // Clear all data
  clear() {
    this.detectedSecrets.clear();
    this.scannedFiles.clear();
  }

  // Check if content contains potential secrets
  hasSecrets(content) {
    // Quick check with some common patterns
    const quickPatterns = [
      /AIza[0-9A-Za-z\-_]{35}/,
      /sk_live_[0-9a-zA-Z]{24,}/,
      /ghp_[A-Za-z0-9_]{36}/,
      /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/,
      /-----BEGIN.*PRIVATE KEY-----/
    ];

    return quickPatterns.some(pattern => pattern.test(content));
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecretDetector;
} else if (typeof window !== 'undefined') {
  window.SecretDetector = SecretDetector;
}
