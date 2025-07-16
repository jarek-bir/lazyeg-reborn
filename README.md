# 🥚 Lazy Egg JS Watcher - Reborn

Advanced Chrome extension for monitoring and analyzing JavaScript files loaded on web pages.

## ✨ Features

### Core Functionality
- **Real-time JS Detection** - Monitors JavaScript files as they load
- **Multiple Tracking Methods** - Performance Observer, DOM monitoring, fetch hooking
- **Smart Filtering** - Excludes unwanted files (analytics, tracking, etc.)
- **Domain Grouping** - Organize files by domain for better analysis

### User Interface
- **Modern Design** - Clean, dark theme with green accents
- **Search & Filter** - Find specific JavaScript files quickly
- **Multiple Views** - List view or grouped by domain
- **Export Options** - JSON export and clipboard copy
- **Statistics** - File count and domain metrics

### Advanced Features
- **Settings Panel** - Configure auto-capture and exclusion patterns
- **Data Management** - Clear all data with confirmation
- **Badge Counter** - Shows total JS files in extension icon
- **Error Handling** - Robust error handling throughout

## 🚀 Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your toolbar

## 🎯 Usage

1. **Start Browsing** - Visit any website to begin collecting JS files
2. **View Results** - Click the extension icon to see collected files
3. **Search** - Use the search box to filter results
4. **Export** - Export data as JSON or copy to clipboard
5. **Manage** - Clear data or adjust settings as needed

## ⚙️ Settings

Access settings by clicking the ⚙️ icon in the popup:

- **Auto-capture** - Enable/disable automatic JavaScript file detection
- **Exclude Patterns** - Add patterns to exclude unwanted files
  - Default exclusions: `google-analytics`, `gtag`, `facebook.net`

## 📊 Technical Details

### Architecture
- **Manifest V3** - Uses modern Chrome extension APIs
- **Service Worker** - Background script for data management
- **Content Script** - Injected script for page monitoring
- **Storage API** - Persistent data storage

### Detection Methods
1. **Performance Observer** - Monitors resource loading
2. **DOM Monitoring** - Tracks script element creation
3. **Fetch Hooking** - Intercepts fetch requests
4. **Existing Scripts** - Scans already loaded scripts

### File Structure
```
├── manifest.json         # Extension configuration
├── background.js         # Service worker (data management)
├── content-script.js     # Page injection script
├── popup.html           # Extension popup interface
├── popup.js             # Popup functionality
├── styles.css           # Modern styling
├── consolas.ttf         # Font file
└── README.md           # This file
```

## 🔧 Development

### Version History
- **v4.0** - Complete rewrite with modern UI and advanced features
- **v3.0** - Previous version with basic functionality

### Key Improvements in v4.0
- **Modern UI** - Complete redesign with better UX
- **Advanced Filtering** - Smart exclusion patterns
- **Export Features** - JSON export and clipboard support
- **Domain Grouping** - Better organization of results
- **Error Handling** - Robust error management
- **Performance** - Optimized detection algorithms

## 🐛 Troubleshooting

### Common Issues
1. **No files detected** - Ensure you're visiting HTTP/HTTPS sites
2. **Extension not loading** - Check Developer mode is enabled
3. **Data not saving** - Check extension permissions

### Debug Mode
Open Chrome DevTools on the extension popup to see console logs and debug information.

## 📝 License

This project is open source. Feel free to modify and distribute.

## 🤝 Contributing

Contributions welcome! Please feel free to submit issues and enhancement requests.

---

**Made with 💚 by the Lazy Egg team**

