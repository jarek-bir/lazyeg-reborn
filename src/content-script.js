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
      const scripts = document.querySelectorAll("script[src]");
      console.log(`Lazy Egg: Found ${scripts.length} script tags`);
      
      scripts.forEach((script) => {
        console.log('Lazy Egg: Checking script:', script.src);
        if (this.isJavaScriptFile(script.src)) {
          const normalized = this.normalizeUrl(script.src);
          this.jsFiles.add(normalized);
          console.log('Lazy Egg: Added JS file:', normalized);
        }
      });
      
      console.log(`Lazy Egg: Total JS files collected: ${this.jsFiles.size}`);
    }

    sendData() {
      console.log(`Lazy Egg: sendData called, files: ${this.jsFiles.size}, lastSent: ${this.lastSentCount}`);
      
      if (this.jsFiles.size > this.lastSentCount) {
        const dataToSend = Array.from(this.jsFiles);
        console.log('Lazy Egg: Sending JS files:', dataToSend);
        
        // Send basic JS files data only
        chrome.runtime
          .sendMessage({
            type: "saveJsFiles",
            data: dataToSend,
          })
          .then(() => {
            console.log('Lazy Egg: Data sent successfully');
          })
          .catch((error) => {
            console.error('Lazy Egg: Failed to send data:', error);
            this.isTracking = false;
          });

        this.lastSentCount = this.jsFiles.size;
      } else {
        console.log('Lazy Egg: No new files to send');
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

        // More patterns for JS detection
        const jsPatterns = [
          "/js/", "/javascript/", "/scripts/", "/static/js/",
          "jquery", "angular", "react", "vue", "bootstrap"
        ];
        
        const isJS = jsPatterns.some((pattern) => pathname.includes(pattern));
        
        console.log(`Lazy Egg: isJS check for ${url}: ${isJS}`);
        return isJS;
      } catch (error) {
        console.log(`Lazy Egg: URL parse error for ${url}:`, error);
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
