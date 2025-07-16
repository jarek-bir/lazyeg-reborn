# 🧪 Testing Lazy Egg JS Watcher

## Quick Test Instructions

1. **Load the Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" 
   - Click "Load unpacked" and select this folder
   - You should see "Lazy Egg JS Watcher" appear

2. **Test the Extension**
   - Click the extension icon in the toolbar
   - You should see the popup with "No JavaScript files found yet"
   - Visit any website (e.g., google.com, github.com, stackoverflow.com)
   - Return to the extension popup
   - You should now see JavaScript files listed

3. **Test Features**
   - **Search**: Type in the search box to filter files
   - **Export**: Click "Export" to download a JSON file
   - **Copy**: Click "Copy" to copy URLs to clipboard
   - **Group View**: Click "Group by domain" to organize by website
   - **Settings**: Click the ⚙️ icon to configure exclusions
   - **Clear**: Click "Clear" to remove all data

## Expected Results

- ✅ Extension loads without errors
- ✅ Popup opens and displays correctly
- ✅ JavaScript files are detected on web pages
- ✅ Search functionality works
- ✅ Export creates a JSON file
- ✅ Copy places URLs in clipboard
- ✅ Domain grouping organizes files
- ✅ Settings can be opened and saved
- ✅ Clear function removes all data
- ✅ Badge shows file count on extension icon

## Troubleshooting

### Extension Won't Load
- Check that manifest.json is present
- Ensure Developer mode is enabled
- Look for errors in the Extensions page

### No Files Detected
- Make sure you're visiting HTTP/HTTPS websites
- Check that the site actually loads JavaScript files
- Try visiting a popular site like Google or GitHub

### Console Errors
- Open DevTools on any page to see content script errors
- Open DevTools on the extension popup to see popup errors
- Check the background page console in `chrome://extensions/`

## Test Sites

These sites are good for testing as they load many JS files:

- **Google.com** - Basic site with some JS
- **GitHub.com** - Modern site with many JS files  
- **Stack Overflow** - Site with ads and analytics
- **News sites** - Usually have many tracking scripts
- **E-commerce sites** - Often load lots of JS for functionality

## Performance

The extension should:
- Have minimal impact on page loading
- Not cause any visual changes to websites
- Work on all HTTP/HTTPS sites
- Store data persistently between browser sessions
