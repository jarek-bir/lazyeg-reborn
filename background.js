// Background Service Worker for Lazy Egg JS Watcher
class LazyEggBackground {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Handle extension installation/startup
    chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));

    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Handle tab updates to inject content script
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
  }

  handleInstalled(details) {
    console.log("Lazy Egg JS Watcher installed/updated:", details.reason);

    // Initialize storage
    chrome.storage.local.get(["jsFiles"], (result) => {
      if (!result.jsFiles) {
        chrome.storage.local.set({
          jsFiles: [],
          settings: {
            autoCapture: true,
            excludePatterns: ["google-analytics", "gtag", "facebook.net"],
          },
        });
      }
    });
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    // Only inject when page is fully loaded and it's a valid HTTP(S) URL
    if (
      changeInfo.status === "complete" &&
      tab.url &&
      (tab.url.startsWith("http://") || tab.url.startsWith("https://"))
    ) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["content-script.js"],
        });
      } catch (error) {
        console.warn("Failed to inject content script:", error);
      }
    }
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case "saveJsFiles":
        this.saveJsFiles(message.data);
        break;
      case "getStats":
        this.getStats(sendResponse);
        return true; // Keep message channel open
      default:
        console.warn("Unknown message type:", message.type);
    }
  }

  async saveJsFiles(newJsFiles) {
    try {
      const result = await chrome.storage.local.get(["jsFiles", "settings"]);
      const existingFiles = result.jsFiles || [];
      const settings = result.settings || {};

      // Filter out excluded patterns
      const filteredFiles = newJsFiles.filter((url) => {
        if (!settings.excludePatterns) return true;
        return !settings.excludePatterns.some((pattern) =>
          url.includes(pattern)
        );
      });

      // Merge with existing files (avoid duplicates)
      const allFiles = [...new Set([...existingFiles, ...filteredFiles])];

      await chrome.storage.local.set({
        jsFiles: allFiles,
        lastUpdate: Date.now(),
      });

      // Update badge with count
      chrome.action.setBadgeText({
        text: allFiles.length > 99 ? "99+" : allFiles.length.toString(),
      });
      chrome.action.setBadgeBackgroundColor({ color: "#00ff90" });
    } catch (error) {
      console.error("Failed to save JS files:", error);
    }
  }

  async getStats(sendResponse) {
    try {
      const result = await chrome.storage.local.get(["jsFiles"]);
      const jsFiles = result.jsFiles || [];

      const stats = {
        total: jsFiles.length,
        domains: [
          ...new Set(
            jsFiles.map((url) => {
              try {
                return new URL(url).hostname;
              } catch {
                return "unknown";
              }
            })
          ),
        ].length,
        lastUpdate: result.lastUpdate || 0,
      };

      sendResponse(stats);
    } catch (error) {
      console.error("Failed to get stats:", error);
      sendResponse({ total: 0, domains: 0, lastUpdate: 0 });
    }
  }
}

// Initialize the background service
new LazyEggBackground();
