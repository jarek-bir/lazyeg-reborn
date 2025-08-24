// Popup script for Lazy Egg JS Watcher
console.log('POPUP DEBUG: Loading LIGHTWEIGHT popup.js (not enhanced!)');
alert('DEBUG: Loading LIGHTWEIGHT popup.js!');

class LazyEggPopup {
  constructor() {
    console.log('POPUP DEBUG: Creating LazyEggPopup (LIGHTWEIGHT VERSION)');
    this.jsFiles = [];
    this.filteredFiles = [];
    this.groupByDomain = false;
    this.searchTerm = "";
    this.settings = {};

    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadSettings();
    await this.loadData();
    this.render();
  }

  setupEventListeners() {
    // Search functionality
    document.getElementById("search-input").addEventListener("input", (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.filterFiles();
      this.render();
    });

    document.getElementById("clear-search").addEventListener("click", () => {
      document.getElementById("search-input").value = "";
      this.searchTerm = "";
      this.filterFiles();
      this.render();
    });

    // Action buttons
    document
      .getElementById("export-btn")
      .addEventListener("click", () => this.exportFiles());
    document
      .getElementById("copy-btn")
      .addEventListener("click", () => this.copyToClipboard());
    document
      .getElementById("clear-btn")
      .addEventListener("click", () => this.clearData());

    // View toggle
    document.getElementById("toggle-view").addEventListener("click", () => {
      this.groupByDomain = !this.groupByDomain;
      this.render();
    });

    // Settings
    document
      .getElementById("settings-btn")
      .addEventListener("click", () => this.openSettings());
    document
      .getElementById("close-modal")
      .addEventListener("click", () => this.closeSettings());
    document
      .getElementById("save-settings")
      .addEventListener("click", () => this.saveSettings());
    document
      .getElementById("cancel-settings")
      .addEventListener("click", () => this.closeSettings());

    // Close modal on outside click
    document.getElementById("settings-modal").addEventListener("click", (e) => {
      if (e.target.id === "settings-modal") {
        this.closeSettings();
      }
    });
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(["settings"]);
      this.settings = result.settings || {
        autoCapture: true,
        excludePatterns: ["google-analytics", "gtag", "facebook.net"],
      };
    } catch (error) {
      console.error("Failed to load settings:", error);
      this.settings = { autoCapture: true, excludePatterns: [] };
    }
  }

  async loadData() {
    try {
      console.log('Popup: Loading data from storage...');
      const result = await chrome.storage.local.get(["jsFiles"]);
      console.log('Popup: Storage result:', result);
      this.jsFiles = result.jsFiles || [];
      console.log('Popup: Loaded JS files count:', this.jsFiles.length);
      console.log('Popup: First few files:', this.jsFiles.slice(0, 5));
      this.filterFiles();
      this.updateStats();
    } catch (error) {
      console.error("Failed to load data:", error);
      this.jsFiles = [];
      this.filteredFiles = [];
    }
  }

  filterFiles() {
    this.filteredFiles = this.jsFiles.filter((url) =>
      url.toLowerCase().includes(this.searchTerm)
    );
  }

  updateStats() {
    const totalCount = this.jsFiles.length;
    const domains = new Set(
      this.jsFiles.map((url) => {
        try {
          return new URL(url).hostname;
        } catch {
          return "unknown";
        }
      })
    );

    document.getElementById("total-count").textContent = totalCount;
    document.getElementById("domain-count").textContent = domains.size;
  }

  render() {
    const emptyState = document.getElementById("empty-state");
    const filesContainer = document.getElementById("files-container");
    const filesList = document.getElementById("files-list");
    const filteredCount = document.getElementById("filtered-count");
    const toggleView = document.getElementById("toggle-view");

    if (this.filteredFiles.length === 0) {
      emptyState.classList.remove("hidden");
      filesContainer.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    filesContainer.classList.remove("hidden");

    // Update filtered count
    const totalShown = this.filteredFiles.length;
    const totalFiles = this.jsFiles.length;

    if (this.searchTerm) {
      filteredCount.textContent = `${totalShown} of ${totalFiles} files`;
    } else {
      filteredCount.textContent = `${totalFiles} files`;
    }

    // Update toggle button
    toggleView.textContent = this.groupByDomain
      ? "List view"
      : "Group by domain";

    // Render files
    if (this.groupByDomain) {
      this.renderGroupedFiles(filesList);
    } else {
      this.renderListFiles(filesList);
    }
  }

  renderListFiles(container) {
    container.innerHTML = "";

    this.filteredFiles.forEach((url, index) => {
      const li = document.createElement("li");
      li.className = "file-item";

      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;

        li.innerHTML = `
          <div class="file-content">
            <div class="file-domain">${this.escapeHtml(domain)}</div>
            <div class="file-url">${this.highlightSearch(
              this.escapeHtml(url)
            )}</div>
          </div>
        `;
      } catch {
        li.innerHTML = `
          <div class="file-content">
            <div class="file-domain">Invalid URL</div>
            <div class="file-url">${this.highlightSearch(
              this.escapeHtml(url)
            )}</div>
          </div>
        `;
      }

      container.appendChild(li);
    });
  }

  renderGroupedFiles(container) {
    container.innerHTML = "";

    // Group files by domain
    const grouped = {};
    this.filteredFiles.forEach((url) => {
      try {
        const domain = new URL(url).hostname;
        if (!grouped[domain]) {
          grouped[domain] = [];
        }
        grouped[domain].push(url);
      } catch {
        if (!grouped["Invalid URLs"]) {
          grouped["Invalid URLs"] = [];
        }
        grouped["Invalid URLs"].push(url);
      }
    });

    // Sort domains by file count
    const sortedDomains = Object.keys(grouped).sort(
      (a, b) => grouped[b].length - grouped[a].length
    );

    sortedDomains.forEach((domain) => {
      const domainGroup = document.createElement("div");
      domainGroup.className = "domain-group";

      domainGroup.innerHTML = `
        <div class="domain-header">
          <span>${this.escapeHtml(domain)}</span>
          <span class="domain-count">${grouped[domain].length}</span>
        </div>
      `;

      const filesList = document.createElement("ul");
      filesList.className = "files-list";

      grouped[domain].forEach((url) => {
        const li = document.createElement("li");
        li.className = "file-item";
        li.innerHTML = `
          <div class="file-content">
            <div class="file-url">${this.highlightSearch(
              this.escapeHtml(url)
            )}</div>
          </div>
        `;
        filesList.appendChild(li);
      });

      domainGroup.appendChild(filesList);
      container.appendChild(domainGroup);
    });
  }

  highlightSearch(text) {
    if (!this.searchTerm) return text;

    const regex = new RegExp(`(${this.escapeRegex(this.searchTerm)})`, "gi");
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  async exportFiles() {
    try {
      console.log('Export: Starting export with', this.jsFiles.length, 'files');
      console.log('Export: Files to export:', this.jsFiles);
      
      const data = {
        exportDate: new Date().toISOString(),
        totalFiles: this.jsFiles.length,
        files: this.jsFiles,
        domains: [
          ...new Set(
            this.jsFiles.map((url) => {
              try {
                return new URL(url).hostname;
              } catch {
                return "unknown";
              }
            })
          ),
        ],
      };

      console.log('Export: Prepared data:', data);

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      console.log('Export: Created blob, size:', blob.size);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lazy-egg-js-files-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      console.log('Export: Triggering download...');
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification("Files exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      this.showNotification("Export failed!", "error");
    }
  }

  async copyToClipboard() {
    try {
      const text = this.filteredFiles.join("\n");
      await navigator.clipboard.writeText(text);
      this.showNotification(
        `${this.filteredFiles.length} URLs copied to clipboard!`
      );
    } catch (error) {
      console.error("Copy failed:", error);
      this.showNotification("Copy failed!", "error");
    }
  }

  async clearData() {
    if (
      confirm("Are you sure you want to clear all collected JavaScript files?")
    ) {
      try {
        await chrome.storage.local.set({ jsFiles: [] });
        this.jsFiles = [];
        this.filteredFiles = [];
        this.updateStats();
        this.render();

        // Clear badge
        chrome.action.setBadgeText({ text: "" });

        this.showNotification("All data cleared!");
      } catch (error) {
        console.error("Clear failed:", error);
        this.showNotification("Clear failed!", "error");
      }
    }
  }

  openSettings() {
    // Populate settings form
    document.getElementById("auto-capture").checked = this.settings.autoCapture;
    document.getElementById("exclude-patterns").value = (
      this.settings.excludePatterns || []
    ).join("\n");

    document.getElementById("settings-modal").classList.remove("hidden");
  }

  closeSettings() {
    document.getElementById("settings-modal").classList.add("hidden");
  }

  async saveSettings() {
    try {
      const autoCapture = document.getElementById("auto-capture").checked;
      const excludePatterns = document
        .getElementById("exclude-patterns")
        .value.split("\n")
        .map((pattern) => pattern.trim())
        .filter((pattern) => pattern.length > 0);

      this.settings = { autoCapture, excludePatterns };

      await chrome.storage.local.set({ settings: this.settings });
      this.closeSettings();
      this.showNotification("Settings saved!");
    } catch (error) {
      console.error("Save settings failed:", error);
      this.showNotification("Save failed!", "error");
    }
  }

  showNotification(message, type = "success") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === "error" ? "#ff4757" : "#00ff90"};
      color: ${type === "error" ? "#fff" : "#000"};
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      z-index: 2000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 10);

    // Remove after delay
    setTimeout(() => {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new LazyEggPopup();
});
