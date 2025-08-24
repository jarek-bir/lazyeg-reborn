// LinkFinder Lite - JavaScript endpoint extraction engine
class LinkFinderLite {
  constructor() {
    // Comprehensive regex patterns for endpoint detection
    this.patterns = {
      // Basic URL patterns
      urls: [
        // Standard URLs with protocols
        /(?:https?:)?\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g,
        // Relative URLs
        /(?:^|\s)\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g,
        // API endpoints
        /["'`]\/api\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*["'`]/g,
        /["'`]\/v\d+\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*["'`]/g,
      ],
      
      // JavaScript-specific patterns
      endpoints: [
        // Fetch/Axios calls
        /(?:fetch|axios\.(?:get|post|put|delete|patch))\s*\(\s*["'`]([^"'`]+)["'`]/g,
        // jQuery AJAX
        /\$\.(?:get|post|ajax)\s*\(\s*["'`]([^"'`]+)["'`]/g,
        // XMLHttpRequest
        /\.open\s*\(\s*["'`][^"'`]*["'`]\s*,\s*["'`]([^"'`]+)["'`]/g,
        // Angular HTTP
        /this\.http\.(?:get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/g,
        // React/Vue API calls
        /(?:useEffect|componentDidMount|created|mounted)\s*\([^}]*(?:fetch|axios)\s*\(\s*["'`]([^"'`]+)["'`]/g,
      ],
      
      // Configuration and routing patterns
      routes: [
        // Express.js routes
        /\.(?:get|post|put|delete|patch|use)\s*\(\s*["'`]([^"'`]+)["'`]/g,
        // React Router
        /<Route\s+path\s*=\s*["'`]([^"'`]+)["'`]/g,
        // Vue Router
        /path\s*:\s*["'`]([^"'`]+)["'`]/g,
        // Next.js API routes
        /\/api\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*/g,
      ],
      
      // GraphQL patterns
      graphql: [
        /query\s+\w+\s*\{[^}]+\}/g,
        /mutation\s+\w+\s*\{[^}]+\}/g,
        /subscription\s+\w+\s*\{[^}]+\}/g,
        /["'`]\/graphql["'`]/g,
      ],
      
      // Websocket patterns
      websockets: [
        /new\s+WebSocket\s*\(\s*["'`]([^"'`]+)["'`]/g,
        /ws:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g,
        /wss:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g,
      ],
      
      // File upload endpoints
      uploads: [
        /["'`][^"'`]*upload[^"'`]*["'`]/g,
        /["'`][^"'`]*file[^"'`]*["'`]/g,
        /FormData\s*\(\s*\)/g,
      ],
      
      // API documentation patterns
      docs: [
        /["'`][^"'`]*\/docs[^"'`]*["'`]/g,
        /["'`][^"'`]*\/swagger[^"'`]*["'`]/g,
        /["'`][^"'`]*\/openapi[^"'`]*["'`]/g,
      ]
    };
    
    this.extractedEndpoints = new Map();
    this.processedFiles = new Set();
  }

  // Main extraction method
  extractFromJavaScript(jsContent, sourceUrl = '') {
    const results = {
      endpoints: [],
      urls: [],
      routes: [],
      graphql: [],
      websockets: [],
      uploads: [],
      docs: [],
      metadata: {
        sourceUrl,
        extractedAt: new Date().toISOString(),
        contentLength: jsContent.length,
        patterns: Object.keys(this.patterns).length
      }
    };

    // Clean and prepare content
    const cleanContent = this.cleanJavaScript(jsContent);
    
    // Extract different types of endpoints
    for (const [category, patterns] of Object.entries(this.patterns)) {
      const extracted = this.extractByPatterns(cleanContent, patterns);
      results[category] = this.deduplicateAndClean(extracted);
    }

    // Store results
    if (sourceUrl) {
      this.extractedEndpoints.set(sourceUrl, results);
      this.processedFiles.add(sourceUrl);
    }

    return results;
  }

  // Extract using regex patterns
  extractByPatterns(content, patterns) {
    const matches = [];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Get the captured group or full match
        const extracted = match[1] || match[0];
        matches.push(this.normalizeEndpoint(extracted));
      }
      // Reset regex lastIndex to avoid issues with global flags
      pattern.lastIndex = 0;
    }
    
    return matches;
  }

  // Clean JavaScript content for better parsing
  cleanJavaScript(content) {
    return content
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      // Remove strings that might contain false positives
      .replace(/console\.(log|error|warn|info)\s*\([^)]*\)/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove minification artifacts
      .replace(/;}/g, '}')
      .replace(/;}else/g, '}else');
  }

  // Normalize extracted endpoints
  normalizeEndpoint(endpoint) {
    return endpoint
      .replace(/^["'`]|["'`]$/g, '') // Remove quotes
      .replace(/\\n|\\r|\\t/g, '') // Remove escape characters
      .trim();
  }

  // Remove duplicates and filter invalid entries
  deduplicateAndClean(endpoints) {
    const seen = new Set();
    const cleaned = [];
    
    for (const endpoint of endpoints) {
      if (endpoint && 
          endpoint.length > 3 && 
          endpoint.length < 2000 && 
          !seen.has(endpoint) &&
          this.isValidEndpoint(endpoint)) {
        seen.add(endpoint);
        cleaned.push(endpoint);
      }
    }
    
    return cleaned.sort();
  }

  // Validate if endpoint is meaningful
  isValidEndpoint(endpoint) {
    // Filter out common false positives
    const invalidPatterns = [
      /^[\s\n\r\t]*$/,
      /^[{}[\]()]*$/,
      /^[0-9]+$/,
      /^(true|false|null|undefined)$/i,
      /^(var|let|const|function|class|if|else|for|while|return)$/i,
      /^\w+\s*[=:]\s*\w+$/,
      /^[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]*$/
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(endpoint));
  }

  // Extract from DOM elements
  extractFromDOM() {
    const results = {
      dataAttributes: [],
      actionUrls: [],
      srcUrls: [],
      hrefUrls: []
    };

    // Extract from data attributes
    document.querySelectorAll('[data-url], [data-endpoint], [data-api]').forEach(el => {
      ['data-url', 'data-endpoint', 'data-api'].forEach(attr => {
        const value = el.getAttribute(attr);
        if (value) results.dataAttributes.push(value);
      });
    });

    // Extract from form actions
    document.querySelectorAll('form[action]').forEach(form => {
      const action = form.getAttribute('action');
      if (action) results.actionUrls.push(action);
    });

    // Extract from script src
    document.querySelectorAll('script[src]').forEach(script => {
      results.srcUrls.push(script.src);
    });

    // Extract from links
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && (href.startsWith('/') || href.includes('api'))) {
        results.hrefUrls.push(href);
      }
    });

    return results;
  }

  // Get all extracted endpoints
  getAllEndpoints() {
    const allEndpoints = {
      byFile: Object.fromEntries(this.extractedEndpoints),
      summary: {
        totalFiles: this.processedFiles.size,
        totalEndpoints: 0,
        categories: {}
      }
    };

    // Calculate summary statistics
    for (const [file, data] of this.extractedEndpoints) {
      for (const [category, endpoints] of Object.entries(data)) {
        if (Array.isArray(endpoints)) {
          allEndpoints.summary.totalEndpoints += endpoints.length;
          if (!allEndpoints.summary.categories[category]) {
            allEndpoints.summary.categories[category] = 0;
          }
          allEndpoints.summary.categories[category] += endpoints.length;
        }
      }
    }

    return allEndpoints;
  }

  // Export endpoints in various formats
  exportEndpoints(format = 'json') {
    const data = this.getAllEndpoints();
    
    switch (format.toLowerCase()) {
      case 'burp':
        return this.exportForBurp(data);
      case 'txt':
        return this.exportAsText(data);
      case 'csv':
        return this.exportAsCSV(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  // Export format compatible with Burp Suite
  exportForBurp(data) {
    const endpoints = [];
    
    for (const [file, fileData] of Object.entries(data.byFile)) {
      for (const [category, categoryEndpoints] of Object.entries(fileData)) {
        if (Array.isArray(categoryEndpoints)) {
          categoryEndpoints.forEach(endpoint => {
            endpoints.push({
              url: endpoint,
              method: 'GET',
              source: file,
              category: category,
              type: 'endpoint'
            });
          });
        }
      }
    }
    
    return JSON.stringify(endpoints, null, 2);
  }

  // Export as plain text
  exportAsText(data) {
    let output = `LinkFinder Lite Results\n`;
    output += `Generated: ${new Date().toISOString()}\n`;
    output += `Total Files: ${data.summary.totalFiles}\n`;
    output += `Total Endpoints: ${data.summary.totalEndpoints}\n\n`;
    
    for (const [file, fileData] of Object.entries(data.byFile)) {
      output += `\n=== ${file} ===\n`;
      for (const [category, endpoints] of Object.entries(fileData)) {
        if (Array.isArray(endpoints) && endpoints.length > 0) {
          output += `\n${category.toUpperCase()}:\n`;
          endpoints.forEach(endpoint => {
            output += `  ${endpoint}\n`;
          });
        }
      }
    }
    
    return output;
  }

  // Export as CSV
  exportAsCSV(data) {
    let csv = 'Source File,Category,Endpoint,Extracted At\n';
    
    for (const [file, fileData] of Object.entries(data.byFile)) {
      for (const [category, endpoints] of Object.entries(fileData)) {
        if (Array.isArray(endpoints)) {
          endpoints.forEach(endpoint => {
            const extractedAt = fileData.metadata?.extractedAt || '';
            csv += `"${file}","${category}","${endpoint}","${extractedAt}"\n`;
          });
        }
      }
    }
    
    return csv;
  }

  // Clear all data
  clear() {
    this.extractedEndpoints.clear();
    this.processedFiles.clear();
  }

  // Get statistics
  getStats() {
    return {
      processedFiles: this.processedFiles.size,
      totalEndpoints: Array.from(this.extractedEndpoints.values())
        .reduce((total, data) => {
          return total + Object.values(data)
            .filter(Array.isArray)
            .reduce((sum, arr) => sum + arr.length, 0);
        }, 0),
      categories: Object.keys(this.patterns)
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LinkFinderLite;
} else if (typeof window !== 'undefined') {
  window.LinkFinderLite = LinkFinderLite;
}
