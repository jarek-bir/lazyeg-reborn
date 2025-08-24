# Lazy Egg JS Watcher Enhanced 🥚⚡

A powerful browser extension for advanced JavaScript monitoring, endpoint discovery, secret detection, and security analysis. Perfect for security researchers, penetration testers, and bug bounty hunters.

## 🚀 New Features (v5.0)

### 🔍 Live JavaScript Endpoint Extraction (LinkFinder-Lite)

- **Real-time endpoint discovery** from JavaScript files
- **Comprehensive regex patterns** for detecting URLs, API endpoints, routes
- **Framework-specific detection** (React, Vue, Angular, Express.js)
- **GraphQL, WebSocket, and file upload endpoint detection**
- **Export compatibility** with Burp Suite and LinkFinder

### 🔐 Secret Token Detection Engine

- **Advanced regex patterns** for detecting sensitive data:
  - Google API Keys (`AIza...`)
  - Stripe Live/Test Keys (`sk_live_`, `sk_test_`)
  - GitHub Tokens (`ghp_`, `gho_`)
  - AWS Credentials (`AKIA...`)
  - JWT Tokens
  - Database connection strings
  - Private keys (RSA, OpenSSH, DSA, EC)
  - And many more...

- **Severity-based classification** (Critical, High, Medium, Low)
- **Real-time alerts** for critical findings
- **Export to SARIF format** for security tools integration

### 🌐 Domain Categorization System

- **Automatic domain classification**:
  - Local vs Third-party domains
  - CDN, Analytics, Advertising networks
  - Social media, Security services
  - Payment providers, Development domains

- **Risk scoring algorithm** (0-10 scale)
- **Suspicious domain detection**
- **Mixed content warnings**

### 📸 Domain Snapshot & Asset Mapping

- **Complete domain asset inventory**
- **Performance metrics tracking**
- **Security analysis** (HTTPS usage, CSP policies)
- **Asset dependency mapping**
- **Critical path identification**
- **Snapshot comparison** for change detection

### 🚨 Enhanced Alert System

- **Real-time UI alerts** for suspicious findings
- **Severity-based color coding**
- **Actionable alert buttons** (View Details, Export, Dismiss)
- **Non-intrusive overlay system**
- **Automatic cleanup and timeout**

### 📊 Advanced Export Capabilities

- **Multiple export formats**:
  - JSON (structured data)
  - CSV (spreadsheet compatible)
  - Burp Suite format
  - LinkFinder compatible format
  - SARIF (Security Analysis Results)

- **Comprehensive reporting** with security recommendations
- **Filtered exports** by severity, category, or domain

## 🛠️ Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project folder
5. The extension will be installed and ready to use

```bash
git clone https://github.com/your-repo/lazyeg-reborn.git
cd lazyeg-reborn
# Load in Chrome Developer Mode
```

## 📖 Usage

### Basic Monitoring

1. **Install and activate** the extension
2. **Navigate** to any website
3. **Click the extension icon** to open the enhanced interface
4. **Monitor real-time data** in the tabbed interface

### Endpoint Discovery

- View discovered endpoints in the **Endpoints tab**
- **Filter by category**: API routes, GraphQL, WebSocket
- **Export for testing**: Compatible with Burp Suite and LinkFinder
- **Search and sort** by URL patterns

### Secret Detection

- Monitor the **Secrets tab** for detected sensitive data
- **Review severity levels**: Critical alerts need immediate attention
- **Export SARIF reports** for integration with security tools
- **Configure patterns** in settings

### Domain Analysis

- Check **Domains tab** for comprehensive risk assessment
- **Review categories**: CDN, Analytics, Advertising, Social
- **Monitor risk scores**: Focus on high-risk domains (7-10)
- **Track third-party dependencies**

### Snapshots

- Create domain snapshots with the **"Create Snapshot"** button
- **Compare snapshots** over time to detect changes
- **Export asset inventories** for compliance reporting
- **Monitor performance** and security metrics

## 🔗 Integration Examples

### Automated Security Pipeline

```text
1. Browse target application with Lazy Egg Enhanced
2. Export comprehensive report (JSON format)
3. Import endpoints into Burp Suite for automated scanning
4. Import SARIF files into GitHub Security or other tools
5. Generate security assessment reports
```

### Burp Suite Integration

1. Export endpoints using **"Burp Suite"** format
2. Import the JSON file into Burp Suite's target scope
3. Use Burp's **Active Scan** or **Intruder** on discovered endpoints
4. Cross-reference findings with secret detection results

### LinkFinder Integration

1. Export using **"LinkFinder"** format
2. Compare results with traditional LinkFinder scans
3. Use for **automated reconnaissance** in security assessments
4. Integration with **custom scripts** for bulk processing

### SARIF Security Tools

1. Export secrets in **SARIF format**
2. Import into compatible tools:
   - GitHub Security tab
   - Visual Studio Code SARIF viewer
   - Azure DevOps security scanning
   - SonarQube security analysis

## 🎯 Use Cases

### 🕵️ Security Research

- **Discover hidden endpoints** in SPAs and web applications
- **Map attack surfaces** with comprehensive domain analysis
- **Identify sensitive data exposure** in client-side code
- **Track third-party dependencies** and supply chain risks
- **Monitor for new vulnerabilities** through continuous scanning

### 🎯 Penetration Testing

- **Automate reconnaissance** phase of penetration tests
- **Supplement manual testing** with automated discovery
- **Export findings** directly to testing tools (Burp Suite)
- **Document scope expansion** with discovered endpoints
- **Generate evidence** for penetration testing reports

### 🐛 Bug Bounty Hunting

- **Continuous monitoring** of target applications
- **Automated discovery** of new attack vectors
- **Track changes** in target applications over time
- **Export evidence** for bug bounty submissions
- **Integrate with automation** workflows

### 🔒 Security Auditing

- **Assess client-side security** posture
- **Document exposed APIs** and sensitive data
- **Generate compliance reports** with SARIF exports
- **Monitor third-party integrations** for security risks

## 🔍 Detection Capabilities

### Endpoint Patterns

- REST API endpoints (`/api/`, `/v1/`, `/v2/`)
- GraphQL endpoints (`/graphql`, `/query`)
- WebSocket connections (`ws://`, `wss://`)
- Framework routes (React Router, Vue Router, Express)
- File paths and static resources
- AJAX and Fetch request URLs

### Secret Patterns

- **API Keys**: Google, Stripe, GitHub, AWS, Slack, Discord
- **Authentication Tokens**: JWT, OAuth, Bearer tokens
- **Database Credentials**: Connection strings, passwords
- **Private Keys**: RSA, ECDSA, SSH keys
- **Webhook URLs**: Slack, Discord, Microsoft Teams
- **Custom patterns**: Configurable regex for organization-specific secrets

### Domain Categories

- **Local**: Same-origin, localhost, development domains
- **CDN**: CloudFlare, AWS CloudFront, Fastly, KeyCDN
- **Analytics**: Google Analytics, Adobe Analytics, Mixpanel
- **Advertising**: Google Ads, Facebook Pixel, Amazon DSP
- **Social**: Twitter, Facebook, LinkedIn, Pinterest widgets
- **Development**: Staging, testing, preview environments

## ⚙️ Configuration

### Settings Panel

Access the settings through the ⚙️ icon in the extension popup:

- **Auto-capture**: Enable/disable automatic JavaScript monitoring
- **Secret Detection**: Toggle secret scanning on/off
- **Endpoint Extraction**: Control LinkFinder functionality
- **Alert Preferences**: Configure alert types and timing
- **Exclude Patterns**: Add domains or patterns to ignore
- **Export Preferences**: Set default export formats

### Performance Tuning

- **Batch Processing**: Adjustable batch sizes for large sites
- **Rate Limiting**: Control analysis frequency
- **Storage Limits**: Configure data retention policies
- **Memory Management**: Automatic cleanup of old data

## 🚀 Advanced Features

### Real-time Analysis Engine

- **Background processing** with minimal performance impact
- **Incremental updates** as new JavaScript files are discovered
- **Smart caching** to avoid re-analyzing unchanged content
- **Performance monitoring** to ensure browser responsiveness

### Export System

- **Format validation** ensures compatibility with target tools
- **Batch exports** for processing multiple domains
- **Filtered exports** by date range, severity, or category
- **Automated reporting** with customizable templates

### Security Integration

- **CI/CD pipeline integration** through command-line exports
- **API endpoints** for automated data retrieval
- **Webhook notifications** for critical findings
- **SIEM integration** through standardized formats

## 🔧 Development

### File Structure

```text
lazyeg-reborn/
├── manifest.json              # Extension manifest
├── background.js              # Service worker
├── content-script.js          # Enhanced content script
├── popup-enhanced.html        # New tabbed interface
├── popup-enhanced.js          # Enhanced popup logic
├── linkfinder-lite.js         # Endpoint extraction engine
├── secret-detector.js         # Secret detection engine
├── domain-categorizer.js      # Domain analysis system
├── domain-snapshot.js         # Snapshot functionality
├── enhanced-export.js         # Advanced export system
├── alert-system.js            # Real-time alert system
└── styles.css                 # Enhanced styling
```

### Extension Architecture

- **Manifest V3** compatibility for modern browsers
- **Service Worker** background processing
- **Content Script** injection for real-time analysis
- **Modular Design** with separate analysis engines
- **Cross-tab Communication** for comprehensive monitoring

## 📋 Testing

See `TESTING.md` for comprehensive testing instructions including:

- Feature testing procedures
- Integration testing with security tools
- Performance and regression testing
- Common issues and troubleshooting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Original Lazy Egg concept and implementation
- LinkFinder project for endpoint discovery patterns
- Security community for regex patterns and testing
- Chrome Extension developers for best practices

## Built with ❤️ for the security community
