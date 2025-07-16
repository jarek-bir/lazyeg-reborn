// Content Script for Lazy Egg JS Watcher
(function () {
  "use strict";

  // Prevent multiple injections
  if (window.lazyEggInjected) {
    return;
  }
  window.lazyEggInjected = true;

  class JSTracker {
    constructor() {
      this.jsFiles = new Set();
      this.isTracking = true;
      this.lastSentCount = 0;
      this.init();
    }

    init() {
      this.setupPerformanceObserver();
      this.hookScriptCreation();
      this.hookFetch();
      this.trackExistingScripts();

      // Send data periodically to avoid too many messages
      setInterval(() => this.sendData(), 2000);
    }

    setupPerformanceObserver() {
      if ("PerformanceObserver" in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              this.trackUrl(entry.name);
            }
          });
          observer.observe({ entryTypes: ["resource"] });
        } catch (error) {
          console.warn("Performance Observer failed:", error);
        }
      }
    }

    hookScriptCreation() {
      const originalCreateElement = document.createElement;
      document.createElement = (...args) => {
        const element = originalCreateElement.apply(document, args);

        if (args[0] && args[0].toLowerCase() === "script") {
          const originalSetAttribute = element.setAttribute;
          element.setAttribute = (name, value) => {
            if (name === "src") {
              this.trackUrl(value);
            }
            return originalSetAttribute.call(element, name, value);
          };

          // Also watch for direct src property assignment
          Object.defineProperty(element, "src", {
            set: (value) => {
              this.trackUrl(value);
              element.setAttribute("src", value);
            },
            get: () => element.getAttribute("src"),
          });
        }

        return element;
      };
    }

    hookFetch() {
      const originalFetch = window.fetch;
      window.fetch = (...args) => {
        const url = args[0];
        if (typeof url === "string") {
          this.trackUrl(url);
        } else if (url instanceof Request) {
          this.trackUrl(url.url);
        }
        return originalFetch.apply(window, args);
      };
    }

    trackExistingScripts() {
      // Track scripts that are already loaded
      document.querySelectorAll("script[src]").forEach((script) => {
        this.trackUrl(script.src);
      });
    }

    trackUrl(url) {
      if (!this.isTracking || !url) return;

      try {
        const normalizedUrl = this.normalizeUrl(url);
        if (this.isJavaScriptFile(normalizedUrl)) {
          this.jsFiles.add(normalizedUrl);
        }
      } catch (error) {
        // Silently ignore invalid URLs
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

        // Check content-type in URL parameters (some CDNs use this)
        if (urlObj.searchParams.get("type") === "application/javascript") {
          return true;
        }

        // Check for common JS patterns in URL
        const jsPatterns = [
          "/js/",
          "/javascript/",
          "/scripts/",
          "jquery",
          "angular",
          "react",
          "vue",
          "bootstrap",
          "lodash",
          "underscore",
        ];

        return (
          jsPatterns.some((pattern) => pathname.includes(pattern)) &&
          !pathname.includes(".css") &&
          !pathname.includes(".html")
        );
      } catch {
        return false;
      }
    }

    sendData() {
      if (this.jsFiles.size > this.lastSentCount) {
        chrome.runtime
          .sendMessage({
            type: "saveJsFiles",
            data: Array.from(this.jsFiles),
          })
          .catch(() => {
            // Extension context may be invalidated, stop tracking
            this.isTracking = false;
          });

        this.lastSentCount = this.jsFiles.size;
      }
    }

    stop() {
      this.isTracking = false;
    }
  }

  // Initialize tracker
  const tracker = new JSTracker();

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    tracker.stop();
  });
})();
