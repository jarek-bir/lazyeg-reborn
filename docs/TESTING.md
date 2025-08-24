# Testing Guide - Lazy Egg Enhanced

This guide covers testing all the new features in Lazy Egg v5.0.

## 🧪 Quick Testing Setup

### Prerequisites

1. Load the extension in Chrome/Edge with Developer mode enabled
2. Open Chrome DevTools Console to monitor for errors
3. Test on various websites with different JavaScript complexity

## 🔍 Feature Testing

### 1. LinkFinder-Lite (Endpoint Extraction)

**Test Sites:**

- SPAs with React/Vue/Angular (e.g., GitHub, Twitter)
- API-heavy sites (e.g., JSON API documentation sites)
- E-commerce sites with complex routing

**Expected Results:**

- Endpoints tab shows discovered URLs
- Categories include: endpoints, urls, routes, graphql, websockets
- Export buttons generate proper formats

**Test Steps:**

1. Navigate to a complex SPA
2. Wait 30 seconds for analysis
3. Check Endpoints tab
4. Verify export functionality

### 2. Secret Detection

**Test Sites:**

- Development/staging sites (more likely to have exposed secrets)
- Sites with client-side configuration
- GitHub Pages sites with exposed keys

**Test with Known Patterns:**

```javascript
// Example patterns to look for:
const apiKey = "AIzaSyC-example-google-key-here";
const stripeKey = "sk_live_example123456789";
const githubToken = "ghp_example1234567890abcdef";
```

**Expected Results:**

- Secrets tab shows detected patterns
- Severity badges (Critical, High, Medium, Low)
- Real-time alerts for critical secrets
- SARIF export functionality

### 3. Domain Categorization

**Test Sites:**

- Complex sites with many third-party resources
- E-commerce sites (many payment/analytics domains)
- News sites (lots of advertising domains)

**Expected Results:**

- Domains tab shows risk assessment
- Categories: CDN, Analytics, Advertising, Social, etc.
- Risk scores (0-10 scale)
- Suspicious domain alerts

### 4. Domain Snapshots

**Test Steps:**

1. Navigate to a resource-heavy site
2. Click "Create Snapshot" button
3. Wait for snapshot completion
4. Check Snapshots tab

**Expected Results:**

- Asset inventory with counts
- Performance metrics
- Security analysis (HTTPS usage)
- Downloadable snapshot data

### 5. Alert System

**Test Scenarios:**

- Load a site with test secrets (see secret patterns above)
- Visit localhost/development sites (should trigger alerts)
- Use mixed content (HTTP resources on HTTPS sites)

**Expected Results:**

- Colored alert banners appear
- Alert buttons work (View Details, Export, Dismiss)
- Alerts auto-dismiss after timeout
- Alert counter updates in header

## 🚀 Export Testing

### Endpoints Export

1. **JSON Format**: Standard structured data
2. **Burp Suite Format**: Compatible with Burp import
3. **LinkFinder Format**: Compatible with LinkFinder tools
4. **CSV Format**: Spreadsheet compatible

### Secrets Export

1. **JSON Format**: Structured secret data
2. **SARIF Format**: Security analysis standard
3. **CSV Format**: Tabular format
4. **Text Report**: Human-readable format

### Comprehensive Export

- Test the "Export Comprehensive Report" button
- Verify all data types are included
- Check report recommendations section

## 🔧 Settings Testing

### Configuration Options

1. **Auto-capture**: Toggle and verify JS monitoring stops/starts
2. **Secret Detection**: Disable and verify no secrets detected
3. **Endpoint Extraction**: Disable and verify no endpoints found
4. **Alert Preferences**: Test different alert configurations
5. **Exclude Patterns**: Add patterns and verify exclusion

### Settings Persistence

- Change settings and reload extension
- Verify settings are remembered
- Test default settings on first install

## 🐛 Error Testing

### Edge Cases

1. **Invalid URLs**: Test with malformed JavaScript
2. **Large Files**: Test with very large JS files (>1MB)
3. **Many Domains**: Test sites with 50+ third-party domains
4. **Network Errors**: Test with poor connectivity
5. **Extension Reload**: Test during active scanning

### Performance Testing

1. **Memory Usage**: Monitor extension memory consumption
2. **CPU Impact**: Check CPU usage during scanning
3. **Load Times**: Verify minimal impact on page load
4. **Storage Limits**: Test with large amounts of data

## 📊 Integration Testing

### Burp Suite Integration

1. Export endpoints in Burp format
2. Import into Burp Suite
3. Verify endpoints load correctly
4. Test automated scanning

### LinkFinder Integration

1. Export in LinkFinder format
2. Compare with native LinkFinder output
3. Verify compatibility

### SARIF Integration

1. Export secrets in SARIF format
2. Import into compatible tools:
   - GitHub Security tab
   - VS Code SARIF Viewer
   - Azure DevOps

## ✅ Success Criteria

### Core Functionality

- [ ] All tabs load without errors
- [ ] Data persists across browser sessions
- [ ] Export functions generate valid files
- [ ] Settings save and load correctly

### Performance

- [ ] Extension loads in <2 seconds
- [ ] Page load impact <500ms
- [ ] Memory usage <50MB for typical sites
- [ ] No memory leaks during extended use

### Security Features

- [ ] Secrets are properly masked in UI
- [ ] No sensitive data in console logs
- [ ] Alerts trigger for known threat patterns
- [ ] Risk scoring provides meaningful results

### Integration

- [ ] Burp Suite import works correctly
- [ ] SARIF files validate against schema
- [ ] LinkFinder compatibility maintained
- [ ] Export formats are valid

## 🔄 Regression Testing

### Legacy Functionality

- [ ] Basic JS file detection still works
- [ ] Original export functionality intact
- [ ] Search and filtering operational
- [ ] Domain grouping functional

### Backwards Compatibility

- [ ] Old popup.html still accessible (fallback)
- [ ] Previous settings migrate correctly
- [ ] Existing data structure compatible

## 📝 Test Report Template

```text
## Test Session Report

**Date**: [Date]
**Tester**: [Name]
**Extension Version**: v5.0
**Browser**: [Chrome/Edge version]

### Sites Tested
1. [Site 1] - [Purpose]
2. [Site 2] - [Purpose]
3. [Site 3] - [Purpose]

### Results Summary
- **Endpoint Detection**: [Pass/Fail] - [Details]
- **Secret Detection**: [Pass/Fail] - [Details]
- **Domain Analysis**: [Pass/Fail] - [Details]
- **Snapshots**: [Pass/Fail] - [Details]
- **Alerts**: [Pass/Fail] - [Details]
- **Exports**: [Pass/Fail] - [Details]

### Issues Found
1. [Issue description] - [Severity: High/Medium/Low]
2. [Issue description] - [Severity: High/Medium/Low]

### Recommendations
- [Recommendation 1]
- [Recommendation 2]
```

## 🆘 Common Issues & Solutions

### "Extension not loading"

- Ensure Developer mode is enabled
- Check for JavaScript errors in DevTools
- Verify all files are present

### "No data detected"

- Visit HTTP/HTTPS sites (not file:// or chrome://)
- Wait for page to fully load
- Check extension permissions

### "Exports not working"

- Check popup blockers
- Verify sufficient disk space
- Try different export formats

### "Alerts not showing"

- Check alert settings in configuration
- Verify site has detectable patterns
- Check console for JavaScript errors

## 📞 Reporting Issues

When reporting issues, include:

1. Browser version and OS
2. Extension version
3. Site where issue occurred
4. Steps to reproduce
5. Expected vs actual behavior
6. Console errors (if any)
7. Screenshots/recordings if helpful
