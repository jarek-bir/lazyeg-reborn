// Content Script for Lazy Egg JS Watcher Enhanced - Lightweight Version
(function () {
  "use strict";

  // Prevent multiple injections
  if (window.lazyEggInjected) {
    return;
  }
  window.lazyEggInjected = true;

  // Lightweight mode - minimal tracking, no heavy analysis
  console.log('Lazy Egg: Starting lightweight JS tracking');

  // Skip heavy sites that cause performance issues
  const heavyHosts = [
    'twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com',
    'youtube.com', 'netflix.com', 'twitch.tv', 'reddit.com'
  ];
  
  if (heavyHosts.some(host => window.location.hostname.includes(host))) {
    console.log('Lazy Egg: Skipping heavy site:', window.location.hostname);
    return;
  }

  class LightweightJSTracker {
    constructor() {
      this.jsFiles = new Set();
      this.isTracking = true;
      this.lastSentCount = 0;
      this.dataInterval = null;
      
      this.init();
    }

    async init() {
      console.log('Lazy Egg: Initializing lightweight tracker');
      
      // Only basic tracking - no heavy modules
      this.setupBasicTracking();
    }

    setupBasicTracking() {
      this.trackExistingScripts();
      this.setupPerformanceObserver();
      // NO FETCH HOOKING - causes performance issues
      
      // Send data less frequently
      this.dataInterval = setInterval(() => this.sendData(), 10000); // 10 seconds
    }

    setupPerformanceObserver() {
      // Simplified performance observer
      if ("PerformanceObserver" in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (this.isJavaScriptFile(entry.name)) {
                this.jsFiles.add(this.normalizeUrl(entry.name));
              }
            }
          });
          observer.observe({ entryTypes: ["resource"] });
        } catch (error) {
          console.warn("Performance Observer failed:", error);
        }
      }
    }

    trackExistingScripts() {
      // Track scripts that are already loaded - simple version
      document.querySelectorAll("script[src]").forEach((script) => {
        if (this.isJavaScriptFile(script.src)) {
          this.jsFiles.add(this.normalizeUrl(script.src));
        }
      });
    }

    sendData() {
      if (this.jsFiles.size > this.lastSentCount) {
        // Send basic JS files data only
        chrome.runtime
          .sendMessage({
            type: "saveJsFiles",
            data: Array.from(this.jsFiles),
          })
          .catch(() => {
            this.isTracking = false;
          });

        this.lastSentCount = this.jsFiles.size;
      }
    }

    normalizeUrl(url) {
      // Handle relative URLs
      if (url.startsWith("//")) {
        return window.location.protocol + url;
      } else if (url.startsWith("/")) {
        return window.location.origin + url;
      } else if (!url.includes("://")) {
        return new URL(url, window.location.href).href;
      }
      return url;
    }

    isJavaScriptFile(url) {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();

        // Check file extension
        if (pathname.endsWith(".js") || pathname.endsWith(".mjs")) {
          return true;
        }

        // Check for common JS patterns in URL
        const jsPatterns = ["/js/", "/javascript/", "/scripts/"];
        return jsPatterns.some((pattern) => pathname.includes(pattern));
      } catch {
        return false;
      }
    }

    stop() {
      this.isTracking = false;
      
      // Clear interval to prevent memory leaks
      if (this.dataInterval) {
        clearInterval(this.dataInterval);
        this.dataInterval = null;
      }
      
      // Clear memory caches
      this.jsFiles.clear();
    }
  }

  // Initialize lightweight tracker
  const tracker = new LightweightJSTracker();

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    tracker.stop();
  });

})();
