// zNavi - Content Script
// Monitor ChatGPT page, extract user messages, create smart navigation

class ChatGPTNavigator {
  static DEFAULTS = {
    fontSize: 12,
    theme: 'auto',
    previewLength: 70,
    highlightDuration: 2000,
    referenceMode: true,
    openOnLoad: true,
    excerptsMaxChars: 5000,
    excerptPreviewLength: 80,
    activeTab: 'navigator'
  };

  static SELECTALL_ICONS = {
    none: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="10" height="10" rx="2"/></svg>',
    some: '<svg width="12" height="12" viewBox="0 0 12 12" fill="#6366f1" stroke="none"><rect x="1" y="1" width="10" height="10" rx="2"/><rect x="3.2" y="5.2" width="5.6" height="1.6" rx="0.6" fill="white"/></svg>',
    all:  '<svg width="12" height="12" viewBox="0 0 12 12" fill="#6366f1" stroke="none"><rect x="1" y="1" width="10" height="10" rx="2"/><polyline points="3.4,6.2 5.2,8 8.6,4.2" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  constructor() {
    this.messages = [];
    this.sidebar = null;
    this.currentConversationId = null;
    this.observer = null;
    this.settings = { ...ChatGPTNavigator.DEFAULTS };
    this.displayMode = 'reference';
    this.excerpts = [];
    this.selectedExcerptIds = new Set();
    this.activeTab = 'navigator';
    this.floatingBtn = null;
    this.lastSelectionRange = null;
    this.lastSelectionMeta = null;
    this._toastTimer = null;
    this.init();
  }
  
  init() {
    console.log('zNavi initialized');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }
  
  start() {
    this.createSidebar();
    this.observeMessages();
    this.observeConversationChanges();
    this.extractExistingMessages();
    this.initExcerptFeature();
  }
  
  createSidebar() {
    this.sidebar = document.createElement('div');
    this.sidebar.id = 'chatgpt-navigator-sidebar';
    this.sidebarWidth = 320;
    this.sidebar.innerHTML = `
      <div class="nav-resize-handle" id="nav-resize-handle"></div>
      <div class="nav-header">
        <button id="nav-toggle" class="nav-toggle-btn" title="Collapse sidebar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="1" width="14" height="14" rx="2"/>
            <line x1="6" y1="1" x2="6" y2="15"/>
            <polyline class="nav-toggle-arrow" points="12,6 10,8 12,10"/>
          </svg>
        </button>
        <h3><svg class="nav-logo" width="18" height="18" viewBox="0 0 128 128"><defs><linearGradient id="znavibg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#3B82F6"/><stop offset="100%" stop-color="#6366F1"/></linearGradient></defs><rect x="4" y="4" width="120" height="120" rx="24" fill="url(#znavibg)"/><g fill="none" stroke="white" stroke-linecap="round"><line x1="28" y1="28" x2="100" y2="28" stroke-width="10"/><circle cx="80" cy="44" r="3" fill="white" stroke="none"/><line x1="88" y1="44" x2="100" y2="44" stroke-width="5"/><circle cx="62" cy="58" r="3" fill="white" stroke="none"/><line x1="70" y1="58" x2="96" y2="58" stroke-width="5"/><circle cx="44" cy="72" r="3" fill="white" stroke="none"/><line x1="52" y1="72" x2="88" y2="72" stroke-width="5"/><circle cx="32" cy="86" r="3" fill="white" stroke="none"/><line x1="40" y1="86" x2="80" y2="86" stroke-width="5"/><line x1="28" y1="100" x2="100" y2="100" stroke-width="10"/></g></svg> zNavi <span id="nav-count" class="nav-count-badge">0</span> <button id="nav-refresh" class="nav-inline-btn" title="Refresh">↻</button></h3>
        <div class="nav-header-actions">
          <label class="nav-mode-toggle" title="ON: Reference mode (group by quote threads)">
            <input type="checkbox" id="nav-mode" checked />
            <span class="nav-mode-slider"></span>
          </label>
          <button id="nav-search-btn" title="Search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <button id="nav-settings-btn" title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="nav-settings-panel" id="nav-settings-panel">
        <div class="nav-settings-row">
          <span class="nav-settings-label">Font size</span>
          <div class="nav-settings-control">
            <button class="nav-settings-btn-sm" id="nav-font-dec">−</button>
            <span id="nav-font-val">12</span>
            <button class="nav-settings-btn-sm" id="nav-font-inc">+</button>
          </div>
        </div>
        <div class="nav-settings-row">
          <span class="nav-settings-label">Theme</span>
          <div class="nav-settings-control">
            <select id="nav-theme-select">
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
        <div class="nav-settings-row">
          <span class="nav-settings-label">Open sidebar on load</span>
          <div class="nav-settings-control">
            <label class="nav-mode-toggle">
              <input type="checkbox" id="nav-open-on-load" />
              <span class="nav-mode-slider"></span>
            </label>
          </div>
        </div>
      </div>
      <div class="nav-search" id="nav-search-bar">
        <input type="text" id="nav-search-input" placeholder="Search prompt..." />
        <button id="nav-clear-search" title="Close search">✕</button>
      </div>
      <div class="nav-tabs" id="nav-tabs">
        <button class="nav-tab active" data-tab="navigator">
          Navigator <span class="nav-tab-count" id="nav-tab-count-nav">0</span>
        </button>
        <button class="nav-tab" data-tab="excerpts">
          Excerpts <span class="nav-tab-count" id="nav-tab-count-ex">0</span>
        </button>
      </div>
      <div class="nav-panel nav-panel-navigator active" id="nav-panel-navigator">
        <div class="nav-list" id="nav-list"></div>
      </div>
      <div class="nav-panel nav-panel-excerpts" id="nav-panel-excerpts">
        <div class="nav-excerpts-actions nav-excerpts-actions-top">
          <div class="nav-excerpts-utility">
            <button id="nav-excerpts-selectall-btn" class="nav-excerpt-btn ghost" data-state="none" title="Select all / Deselect all">
              <span class="nav-selectall-icon" aria-hidden="true"></span>
              <span>All</span>
            </button>
            <button id="nav-excerpts-clear" class="nav-excerpt-btn ghost danger" title="Clear all excerpts in this conversation">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 4h10"/>
                <path d="M5 4V2.6A.6.6 0 0 1 5.6 2h4.8a.6.6 0 0 1 .6.6V4"/>
                <path d="M4 4v9.4A1.6 1.6 0 0 0 5.6 15h4.8a1.6 1.6 0 0 0 1.6-1.6V4"/>
              </svg>
              Clear
            </button>
          </div>
        </div>
        <div class="nav-excerpts-list" id="nav-excerpts-list"></div>
        <div class="nav-excerpts-actions nav-excerpts-actions-bottom">
          <div class="nav-excerpts-group">
            <span class="nav-excerpts-group-label">To ChatGPT</span>
            <button id="nav-excerpts-insert" class="nav-excerpt-btn" disabled title="Insert selected excerpts into ChatGPT input (no auto-send)">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8h11"/><path d="M9 4l4 4-4 4"/></svg>
              Insert
            </button>
            <button id="nav-excerpts-summarize" class="nav-excerpt-btn primary" disabled title="Summarize selected excerpts (auto-send)">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2l1.6 4.4L14 8l-4.4 1.6L8 14l-1.6-4.4L2 8l4.4-1.6L8 2z"/></svg>
              Summarize
            </button>
          </div>
          <div class="nav-excerpts-group">
            <span class="nav-excerpts-group-label">Export</span>
            <button id="nav-excerpts-copy-all" class="nav-excerpt-btn" disabled title="Copy selected excerpts to clipboard (numbered list)">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="9" height="11" rx="1.5"/><path d="M3 5v8.5A1.5 1.5 0 0 0 4.5 15H11"/></svg>
              Copy
            </button>
            <button id="nav-excerpts-export-md" class="nav-excerpt-btn" disabled title="Download selected excerpts as Markdown (.md)">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v9"/><path d="M4 7l4 4 4-4"/><path d="M3 14h10"/></svg>
              Markdown
            </button>
            <button id="nav-excerpts-export-html" class="nav-excerpt-btn" disabled title="Download selected excerpts as a styled HTML page">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v9"/><path d="M4 7l4 4 4-4"/><path d="M3 14h10"/></svg>
              HTML
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.sidebar);
    document.documentElement.classList.add('chatgpt-nav-open');
    this.applyMainContentMargin(this.sidebarWidth);
    this.bindSidebarEvents();
    this.bindResizeHandle();
    this.bindSettingsEvents();
    this.loadSettings();
  }
  
  bindSidebarEvents() {
    const toggleBtn = document.getElementById('nav-toggle');
    const header = document.querySelector('.nav-header');
    
    const toggleSidebar = () => {
      this.sidebar.classList.toggle('collapsed');
      const isCollapsed = this.sidebar.classList.contains('collapsed');
      if (isCollapsed) {
        this.sidebar.style.width = '';
        document.getElementById('nav-settings-panel').classList.remove('open');
        document.getElementById('nav-search-bar').classList.remove('open');
      } else {
        this.sidebar.style.width = this.sidebarWidth + 'px';
      }
      document.documentElement.classList.toggle('chatgpt-nav-open', !isCollapsed);
      document.documentElement.classList.toggle('chatgpt-nav-collapsed', isCollapsed);
      this.applyMainContentMargin(isCollapsed ? 40 : this.sidebarWidth);
    };
    
    // Click toggle button
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSidebar();
    });

    // Refresh button
    const refreshBtn = document.getElementById('nav-refresh');
    refreshBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.extractExistingMessages();
    });

    // Mode toggle
    const modeCheckbox = document.getElementById('nav-mode');
    modeCheckbox.addEventListener('change', (e) => {
      e.stopPropagation();
      this.displayMode = modeCheckbox.checked ? 'reference' : 'sequential';
      this.settings.referenceMode = modeCheckbox.checked;
      this.saveSettings();
      const label = modeCheckbox.closest('.nav-mode-toggle');
      label.title = modeCheckbox.checked
        ? 'ON: Reference mode (group by quote threads)'
        : 'OFF: Sequential mode (original order)';
      this.renderMessages();
    });
    
    // Click header when collapsed to expand
    header.addEventListener('click', () => {
      if (this.sidebar.classList.contains('collapsed')) {
        toggleSidebar();
      }
    });
    
    // Search toggle button
    const searchBtn = document.getElementById('nav-search-btn');
    const searchBar = document.getElementById('nav-search-bar');
    const searchInput = document.getElementById('nav-search-input');
    searchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = searchBar.classList.toggle('open');
      if (isOpen) {
        searchInput.focus();
      } else {
        searchInput.value = '';
        this.filterMessages('');
      }
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
      this.filterMessages(e.target.value);
    });

    // Clear & close search
    const clearBtn = document.getElementById('nav-clear-search');
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      this.filterMessages('');
      searchBar.classList.remove('open');
    });
  }
  
  bindResizeHandle() {
    const handle = document.getElementById('nav-resize-handle');
    let startX, startWidth;

    const onMouseMove = (e) => {
      const delta = startX - e.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, 200), 600);
      this.sidebarWidth = newWidth;
      this.sidebar.style.width = newWidth + 'px';
      this.applyMainContentMargin(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      this.sidebar.style.transition = 'width 0.3s ease';
    };

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = this.sidebar.offsetWidth;
      this.sidebar.style.transition = 'none';
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('zNavi-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...ChatGPTNavigator.DEFAULTS, ...parsed };
      }
    } catch (e) { /* ignore */ }

    this.displayMode = this.settings.referenceMode ? 'reference' : 'sequential';

    // Sync UI controls with loaded settings
    const fontVal = document.getElementById('nav-font-val');
    const themeSelect = document.getElementById('nav-theme-select');
    const modeCheckbox = document.getElementById('nav-mode');

    if (fontVal) fontVal.textContent = this.settings.fontSize;
    if (themeSelect) themeSelect.value = this.settings.theme;
    if (modeCheckbox) {
      modeCheckbox.checked = this.settings.referenceMode;
      const label = modeCheckbox.closest('.nav-mode-toggle');
      if (label) label.title = this.settings.referenceMode
        ? 'ON: Reference mode (group by quote threads)'
        : 'OFF: Sequential mode (original order)';
    }

    const openOnLoadCheckbox = document.getElementById('nav-open-on-load');
    if (openOnLoadCheckbox) {
      openOnLoadCheckbox.checked = this.settings.openOnLoad;
    }

    // Apply default collapsed state
    if (!this.settings.openOnLoad) {
      this.sidebar.classList.add('collapsed');
      this.sidebar.style.width = '';
      document.documentElement.classList.remove('chatgpt-nav-open');
      document.documentElement.classList.add('chatgpt-nav-collapsed');
      this.applyMainContentMargin(40);
    }

    this.applySettings();
  }

  saveSettings() {
    try {
      localStorage.setItem('zNavi-settings', JSON.stringify(this.settings));
    } catch (e) { /* ignore */ }
  }

  applySettings() {
    // Font size
    const list = document.getElementById('nav-list');
    if (list) list.style.fontSize = this.settings.fontSize + 'px';

    // Theme
    this.sidebar.removeAttribute('data-theme');
    if (this.settings.theme !== 'auto') {
      this.sidebar.setAttribute('data-theme', this.settings.theme);
    }
  }

  bindSettingsEvents() {
    const settingsBtn = document.getElementById('nav-settings-btn');
    const panel = document.getElementById('nav-settings-panel');

    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('open');
    });

    // Font size +/-
    document.getElementById('nav-font-dec').addEventListener('click', (e) => {
      e.stopPropagation();
      this.settings.fontSize = Math.max(9, this.settings.fontSize - 1);
      document.getElementById('nav-font-val').textContent = this.settings.fontSize;
      this.applySettings();
      this.saveSettings();
    });
    document.getElementById('nav-font-inc').addEventListener('click', (e) => {
      e.stopPropagation();
      this.settings.fontSize = Math.min(18, this.settings.fontSize + 1);
      document.getElementById('nav-font-val').textContent = this.settings.fontSize;
      this.applySettings();
      this.saveSettings();
    });

    // Theme
    document.getElementById('nav-theme-select').addEventListener('change', (e) => {
      e.stopPropagation();
      this.settings.theme = e.target.value;
      this.applySettings();
      this.saveSettings();
    });

    // Open on load
    document.getElementById('nav-open-on-load').addEventListener('change', (e) => {
      e.stopPropagation();
      this.settings.openOnLoad = e.target.checked;
      this.saveSettings();
    });

  }

  applyMainContentMargin(width) {
    // Target ChatGPT's main content containers directly
    const selectors = ['main', '#__next', '[class*="ThreadLayout"]', '[class*="conversation-main"]'];
    let applied = false;
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        el.style.marginRight = width + 'px';
        el.style.transition = 'margin-right 0.3s ease';
        applied = true;
      }
    }
    // Fallback: body direct children except our sidebar
    if (!applied) {
      for (const child of document.body.children) {
        if (child.id === 'chatgpt-navigator-sidebar') continue;
        child.style.marginRight = width + 'px';
        child.style.transition = 'margin-right 0.3s ease';
      }
    }
  }

  observeMessages() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };
    this._refreshTimer = null;
    this._refreshTimer2 = null;

    const scheduleRefresh = (delay = 500) => {
      clearTimeout(this._refreshTimer);
      clearTimeout(this._refreshTimer2);
      // First pass: quick update to show new messages
      this._refreshTimer = setTimeout(() => this.extractExistingMessages(), delay);
      // Second pass: catch quote/reference elements that render later
      this._refreshTimer2 = setTimeout(() => this.extractExistingMessages(), delay + 1500);
    };

    this.observer = new MutationObserver((mutations) => {
      let needsRefresh = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;
            // New user message added
            if (this.isUserMessage(node)) {
              needsRefresh = true;
              break;
            }
            // Image added/loaded inside a user message (lazy-loaded attachments)
            if (node.tagName === 'IMG' || (node.querySelector && node.querySelector('img'))) {
              if (node.closest && node.closest('[data-message-author-role="user"]')) {
                needsRefresh = true;
                break;
              }
            }
          }
        }
        if (needsRefresh) break;
      }

      if (needsRefresh) {
        scheduleRefresh();
      }
    });

    this.observer.observe(targetNode, config);

    // Delayed re-scans to catch lazy-loaded images and async content
    setTimeout(() => this.extractExistingMessages(), 1000);
    setTimeout(() => this.extractExistingMessages(), 3000);
  }

  observeConversationChanges() {
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log('[Navigator] Conversation changed:', lastUrl);
        this.messages = [];
        this.renderMessages();
        // Reload excerpts for the new conversation
        this.selectedExcerptIds.clear();
        this.loadExcerptsForCurrentConversation();
        this.renderExcerpts();
        // Wait for the new conversation to load, then re-extract
        setTimeout(() => this.extractExistingMessages(), 800);
        setTimeout(() => this.extractExistingMessages(), 2500);
      }
    }, 500);
  }

  isUserMessage(element) {
    if (!element.querySelector) return false;
    return element.matches('[data-message-author-role="user"]') ||
           element.querySelector('[data-message-author-role="user"]') !== null;
  }
  
  isInsideOverlay(element) {
    // Only exclude known modal/dialog containers; avoid broad patterns like "overlay"
    return !!element.closest('[role="dialog"], [role="alertdialog"], [data-radix-portal], [class*="modal-"], [class*="Modal"]');
  }

  // Ask the MAIN-world bridge script to resolve quote targets via React fiber
  resolveQuoteTargets() {
    document.dispatchEvent(new CustomEvent('chatgpt-nav-resolve-quotes'));
  }

  extractExistingMessages() {
    // Resolve quote targets via page-bridge (MAIN world React fiber inspection)
    this.resolveQuoteTargets();

    const allUserMessages = document.querySelectorAll('[data-message-author-role="user"]');
    // Filter out messages inside modals/dialogs (e.g. Share popup)
    const userMessages = Array.from(allUserMessages).filter(el => !this.isInsideOverlay(el));

    const newMessages = [];
    userMessages.forEach((msgElement, index) => {
      const text = this.extractMessageText(msgElement);
      const id = `msg-${index}`;
      const attachments = this.detectAttachments(msgElement);
      const quotedResponse = this.extractQuotedResponse(msgElement, index, !!attachments);

      if (text) {
        newMessages.push({
          id,
          text,
          element: msgElement,
          quotedResponseId: quotedResponse ? quotedResponse.id : null,
          quotedResponseElement: quotedResponse ? quotedResponse.element : null,
          quotedResponsePreview: quotedResponse ? quotedResponse.preview : null,
          attachments,
          children: []
        });
      }
    });
    
    // Build reference tree
    this.buildReferenceTree(newMessages);

    this.messages = newMessages;
    this.renderMessages();
  }
  
  extractMessageText(element) {
    const textContainer = element.querySelector('.whitespace-pre-wrap') || element;
    return textContainer.textContent.trim();
  }

  hasSvgOutsideMainText(element, mainTextEl) {
    const svgs = element.querySelectorAll('svg');
    for (const svg of svgs) {
      // If the SVG is NOT inside the main message text container, it's likely a quote arrow
      if (!mainTextEl || !mainTextEl.contains(svg)) {
        return true;
      }
    }
    return false;
  }

  detectAttachments(element) {
    const attachments = [];
    const mainText = element.querySelector('.whitespace-pre-wrap');

    // Strategy 1: Detect uploaded images — <img> anywhere in the message
    const imgs = element.querySelectorAll('img');
    for (const img of imgs) {
      const src = img.src || '';
      // Skip SVG data URIs (UI icons)
      if (src.startsWith('data:image/svg')) continue;
      // Skip images without src
      if (!src) continue;
      // Skip only if both dimensions are known AND both are tiny (icon-sized)
      const w = img.width || img.naturalWidth || 0;
      const h = img.height || img.naturalHeight || 0;
      if (w > 0 && h > 0 && w < 40 && h < 40) continue;
      attachments.push({ type: 'image', name: 'Image' });
    }

    // Strategy 2: Detect file attachments — leaf text nodes matching filename patterns, outside main text
    const allLeafEls = element.querySelectorAll('*');
    for (const el of allLeafEls) {
      if (mainText && mainText.contains(el)) continue;
      if (el.children.length > 0) continue;
      const text = el.textContent.trim();
      if (text.length > 2 && text.length < 200) {
        const match = text.match(/([\w\-. ()]+\.(pdf|docx?|xlsx?|pptx?|csv|txt|json|xml|zip|py|js|ts|html|css|md|png|jpg|jpeg|gif|webp|mp[34]|wav))$/i);
        if (match) {
          const ext = match[2].toLowerCase();
          const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
          attachments.push({ type: isImage ? 'image' : 'file', name: match[1] });
        }
      }
    }

    // Deduplicate
    const seen = new Set();
    const unique = attachments.filter(a => {
      const key = `${a.type}:${a.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.length > 0 ? unique : null;
  }

  normalizeText(text) {
    return text.replace(/\*{1,2}|_{1,2}|`{1,3}|~{2}/g, '').replace(/\s+/g, ' ').trim();
  }

  // Extract the quoted snippet text from the user message element
  extractQuotedSnippet(element) {
    const mainText = element.querySelector('.whitespace-pre-wrap');
    const candidates = [];

    // Strategy 1: blockquote
    const blockquote = element.querySelector('blockquote');
    if (blockquote) {
      const text = blockquote.textContent.trim();
      if (text) candidates.push(text);
    }

    // Strategy 2: elements with quote/cited/reference classes
    const quoteSelectors = ['[class*="quote"]', '[class*="cited"]', '[class*="reference"]', '[data-message-citation]'];
    for (const sel of quoteSelectors) {
      const el = element.querySelector(sel);
      if (el) {
        const text = el.textContent.trim();
        if (text) candidates.push(text);
      }
    }

    // Strategy 3: find containers with ↪ or ↩ Unicode arrows
    const allEls = element.querySelectorAll('*');
    for (const el of allEls) {
      if (el.children.length > 0) continue;
      const t = el.textContent;
      if (t && (t.includes('↪') || t.includes('↩'))) {
        const container = el.closest('div') || el.parentElement;
        if (container) {
          const text = container.textContent.replace(/[↪↩]/g, '').trim();
          if (text) candidates.push(text);
        }
      }
    }

    // Strategy 4: SVG arrow icon — find the container that wraps quoted content
    const svgs = element.querySelectorAll('svg');
    for (const svg of svgs) {
      if (mainText && mainText.contains(svg)) continue;
      let container = svg.parentElement;
      while (container && container !== element) {
        const text = container.textContent.trim();
        // Container must have meaningful text, must not contain the user's main message,
        // and must not BE the main message (to isolate the quoted portion)
        if (text.length > 5 && !(mainText && container.contains(mainText)) && container !== mainText) {
          candidates.push(text);
          break;
        }
        container = container.parentElement;
      }
    }

    // Return the longest candidate (most likely to be meaningful for matching)
    if (candidates.length === 0) return '';
    candidates.sort((a, b) => b.length - a.length);
    console.log('[Navigator] Quote snippet candidates:', candidates.map(c => c.substring(0, 60)));
    return candidates[0];
  }

  // Try to find the quoted source message via bridge-provided attribute or DOM scan
  findQuoteSourceByDOM(element) {
    const allMessages = document.querySelectorAll('[data-message-author-role]');

    // Strategy 1: Use quote target resolved by page-bridge.js (React fiber)
    const quoteTargetId = element.getAttribute('data-nav-quote-target');
    if (quoteTargetId) {
      for (let i = 0; i < allMessages.length; i++) {
        const msgId = allMessages[i].getAttribute('data-message-id');
        if (msgId === quoteTargetId) {
          console.log('[Navigator] Found quote target via React fiber:', quoteTargetId);
          const preview = allMessages[i].textContent.trim().substring(0, 60);
          return { id: `resp-${i}`, element: allMessages[i], preview };
        }
      }
    }

    // Strategy 2: Scan child elements for UUID data attributes (fallback)
    const allChildren = element.querySelectorAll('*');
    for (const child of allChildren) {
      for (const attr of child.attributes) {
        if (['class', 'style', 'src', 'href', 'role', 'tabindex', 'aria-label'].includes(attr.name)) continue;
        const val = attr.value;
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
          for (let i = 0; i < allMessages.length; i++) {
            if (allMessages[i].getAttribute('data-message-author-role') !== 'assistant') continue;
            const msgId = allMessages[i].getAttribute('data-message-id');
            if (msgId === val) {
              console.log('[Navigator] Found quote source by DOM attribute:', attr.name, '=', val);
              const preview = allMessages[i].textContent.trim().substring(0, 60);
              return { id: `resp-${i}`, element: allMessages[i], preview };
            }
            const wrapper = allMessages[i].closest(`[data-message-id="${val}"]`);
            if (wrapper) {
              console.log('[Navigator] Found quote source by wrapper data-message-id:', val);
              const preview = allMessages[i].textContent.trim().substring(0, 60);
              return { id: `resp-${i}`, element: allMessages[i], preview };
            }
          }
        }
      }
    }
    return null;
  }

  extractQuotedResponse(element, currentIndex, hasAttachments = false) {
    const mainText = element.querySelector('.whitespace-pre-wrap');

    // Strong indicators
    const hasStrongIndicator = element.querySelector('blockquote') !== null ||
                                element.querySelector('[class*="quote"]') !== null ||
                                element.querySelector('[class*="cited"]') !== null ||
                                element.querySelector('[class*="reference"]') !== null ||
                                element.querySelector('[data-message-citation]') !== null ||
                                element.innerHTML.includes('↪') ||
                                element.innerHTML.includes('↩');

    // Weak indicator
    const hasSvgIndicator = this.hasSvgOutsideMainText(element, mainText);
    const hasQuoteIndicator = hasStrongIndicator || (!hasAttachments && hasSvgIndicator);

    if (!hasQuoteIndicator) return null;

    console.log('[Navigator] Quote indicator in message', currentIndex, hasStrongIndicator ? '(strong)' : '(svg)');

    // Strategy 1: DOM attribute-based lookup (most reliable)
    const domResult = this.findQuoteSourceByDOM(element);
    if (domResult) {
      // Use the actual quoted snippet from the user message, not the full response
      const snippet = this.extractQuotedSnippet(element);
      if (snippet) domResult.preview = snippet.substring(0, 80);
      return domResult;
    }

    // Strategy 2: Text matching
    const quotedText = this.extractQuotedSnippet(element);
    const normalizedQuote = quotedText ? this.normalizeText(quotedText) : '';
    console.log('[Navigator] Extracted quote text:', normalizedQuote.substring(0, 80) || '(empty)');

    const allMessages = document.querySelectorAll('[data-message-author-role]');
    let lastAssistantIndex = -1;
    let bestMatchIndex = -1;
    let bestMatchScore = 0;
    let userMessageCount = 0;

    for (let i = 0; i < allMessages.length; i++) {
      const role = allMessages[i].getAttribute('data-message-author-role');

      if (role === 'user') {
        if (userMessageCount === currentIndex) break;
        userMessageCount++;
      } else if (role === 'assistant') {
        lastAssistantIndex = i;

        if (normalizedQuote.length > 5) {
          const normalizedAssistant = this.normalizeText(allMessages[i].textContent);

          // Exact normalized substring match
          if (normalizedAssistant.includes(normalizedQuote)) {
            bestMatchIndex = i;
            bestMatchScore = normalizedQuote.length;
          }
          // Partial match: try first 40 chars if full match fails
          else if (bestMatchScore < 40 && normalizedQuote.length >= 40) {
            const partial = normalizedQuote.substring(0, 40);
            if (normalizedAssistant.includes(partial)) {
              bestMatchIndex = i;
              bestMatchScore = 40;
            }
          }
        }
      }
    }

    if (bestMatchIndex >= 0) {
      console.log('[Navigator] Matched quote to assistant at DOM index', bestMatchIndex, 'score:', bestMatchScore);
      return { id: `resp-${bestMatchIndex}`, element: allMessages[bestMatchIndex], preview: quotedText.substring(0, 80) };
    }

    // Fallback to most recent response
    if (lastAssistantIndex >= 0 && (hasStrongIndicator || (normalizedQuote.length > 10))) {
      console.log('[Navigator] No text match, fallback to DOM index', lastAssistantIndex);
      const preview = quotedText || allMessages[lastAssistantIndex].textContent.trim().substring(0, 60);
      return { id: `resp-${lastAssistantIndex}`, element: allMessages[lastAssistantIndex], preview };
    }

    return null;
  }
  
  buildReferenceTree(messages) {
    const allMessages = document.querySelectorAll('[data-message-author-role]');

    messages.forEach((msg, index) => {
      if (msg.quotedResponseId) {
        msg.hasReference = true;

        // Find the parent user prompt: the user message that triggered the quoted response
        const respIndex = parseInt(msg.quotedResponseId.split('-')[1]);
        let parentUserIndex = -1;
        let userCount = 0;
        for (let i = 0; i < allMessages.length && i <= respIndex; i++) {
          if (allMessages[i].getAttribute('data-message-author-role') === 'user') {
            parentUserIndex = userCount;
            userCount++;
          }
        }

        if (parentUserIndex >= 0 && parentUserIndex < messages.length) {
          msg.parentIndex = parentUserIndex;
          console.log(`[Navigator] msg[${index}] parent → msg[${parentUserIndex}] (via resp DOM index ${respIndex})`);
        }
      }
    });

    // Second pass: detect and break circular parent chains
    messages.forEach((msg, index) => {
      if (typeof msg.parentIndex !== 'number') return;
      const visited = new Set();
      let current = index;
      while (typeof messages[current]?.parentIndex === 'number') {
        if (visited.has(current)) {
          // Circular reference — break the chain
          msg.parentIndex = undefined;
          break;
        }
        visited.add(current);
        current = messages[current].parentIndex;
      }
    });
  }

  computeDisplayOrder() {
    // Collect children grouped by parent index
    const childrenByParent = {};
    this.messages.forEach((msg, index) => {
      if (typeof msg.parentIndex === 'number') {
        if (!childrenByParent[msg.parentIndex]) {
          childrenByParent[msg.parentIndex] = [];
        }
        childrenByParent[msg.parentIndex].push({ msg, originalIndex: index });
      }
    });

    const displayOrder = [];

    // Recursively insert a message and its children
    const insertWithChildren = (msg, originalIndex, depth) => {
      const num = `${originalIndex + 1}`;
      msg.displayNumber = num;
      msg.depth = depth;
      displayOrder.push({ msg, displayNumber: num, originalIndex, depth });

      if (childrenByParent[originalIndex]) {
        childrenByParent[originalIndex].forEach(child => {
          insertWithChildren(child.msg, child.originalIndex, depth + 1);
        });
      }
    };

    // Top-level messages, children inserted recursively after parent
    this.messages.forEach((msg, index) => {
      if (typeof msg.parentIndex === 'number') return; // inserted via parent
      insertWithChildren(msg, index, 0);
    });

    // Safety net: append any messages not yet in displayOrder
    const included = new Set(displayOrder.map(d => d.originalIndex));
    this.messages.forEach((msg, index) => {
      if (!included.has(index)) {
        insertWithChildren(msg, index, 0);
      }
    });

    return displayOrder;
  }

  renderSequential(listContainer) {
    this.messages.forEach((msg, index) => {
      const item = this.createMessageItem(msg, index, `${index + 1}`);
      listContainer.appendChild(item);
    });
  }

  renderReference(listContainer) {
    const displayOrder = this.computeDisplayOrder();
    console.log('[Navigator] displayOrder:', displayOrder.length, 'items from', this.messages.length, 'messages');

    if (displayOrder.length === 0 && this.messages.length > 0) {
      console.warn('[Navigator] displayOrder empty, falling back to sequential');
      this.renderSequential(listContainer);
    } else {
      displayOrder.forEach(({ msg, displayNumber, originalIndex, depth }) => {
        const item = this.createMessageItem(msg, originalIndex, displayNumber, depth);
        listContainer.appendChild(item);
      });
    }
  }

  renderMessages() {
    const listContainer = document.getElementById('nav-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    try {
      if (this.displayMode === 'reference') {
        this.renderReference(listContainer);
      } else {
        this.renderSequential(listContainer);
      }
    } catch (e) {
      console.error('[Navigator] renderMessages error, falling back:', e);
      this.renderSequential(listContainer);
    }

    this.updateStats();
  }
  
  createMessageItem(msg, index, displayNumber, depth = 0) {
    const item = document.createElement('div');
    item.className = 'nav-item';
    item.dataset.messageId = msg.id;
    item.dataset.index = index;

    // Add class if this message references a quote
    if (typeof msg.parentIndex === 'number') {
      item.classList.add('has-reference');
      if (this.displayMode === 'reference' && depth > 0) {
        item.classList.add('is-child');
        item.style.marginLeft = (depth * 16) + 'px';
      }
    } else if (msg.quotedResponseId) {
      item.classList.add('has-reference');
    }

    // Add class if this message has attachments
    if (msg.attachments) {
      item.classList.add('has-attachment');
    }

    const maxLen = this.settings.previewLength;
    const preview = msg.text.length > maxLen ? msg.text.substring(0, maxLen) + '...' : msg.text;

    const attachmentBadges = msg.attachments
      ? msg.attachments.map(a => {
          const icon = a.type === 'image' ? '🖼' : '📄';
          return `<div class="nav-item-attachment">${icon} ${this.escapeHtml(a.name)}</div>`;
        }).join('')
      : '';

    item.innerHTML = `
      <div class="nav-item-number">${displayNumber || (index + 1)}</div>
      <div class="nav-item-content">
        <div class="nav-item-text">${this.escapeHtml(preview)}</div>
        ${msg.quotedResponseId ? `<div class="nav-item-reference">↩ ${this.escapeHtml(msg.quotedResponsePreview || 'previous response')}...</div>` : ''}
        ${attachmentBadges}
      </div>
    `;

    // Click to scroll
    item.addEventListener('click', () => {
      this.scrollToMessage(msg.element);
      this.highlightMessage(msg.element);

      // Highlight quoted response (without scrolling away from the prompt)
      if (msg.quotedResponseElement) {
        this.highlightMessage(msg.quotedResponseElement, 'reference');
      }
    });

    return item;
  }
  
  findResponseElement(responseId) {
    // Extract index from responseId like "resp-5"
    const index = parseInt(responseId.split('-')[1]);
    const allMessages = document.querySelectorAll('[data-message-author-role]');
    
    if (allMessages[index]) {
      return allMessages[index];
    }
    
    return null;
  }
  
  scrollToMessage(element) {
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  highlightMessage(element, type = 'primary') {
    if (!element) return;
    
    const className = type === 'reference' ? 'nav-highlighted-reference' : 'nav-highlighted';
    
    element.classList.add(className);
    setTimeout(() => {
      element.classList.remove(className);
    }, this.settings.highlightDuration);
  }
  
  filterMessages(query) {
    const items = document.querySelectorAll('.nav-item');
    let visibleCount = 0;
    
    if (!query) {
      items.forEach(item => {
        item.style.display = '';
        visibleCount++;
      });
      this.updateStats();
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    
    items.forEach(item => {
      const index = parseInt(item.dataset.index);
      const msg = this.messages[index];
      
      if (msg && msg.text.toLowerCase().includes(lowerQuery)) {
        item.style.display = '';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });
    
    const statsEl = document.getElementById('nav-count');
    if (statsEl) {
      statsEl.textContent = `${visibleCount}/${this.messages.length}`;
    }
  }

  updateStats() {
    const countEl = document.getElementById('nav-count');

    if (countEl) {
      countEl.textContent = `${this.messages.length}`;
    }

    const navTabCount = document.getElementById('nav-tab-count-nav');
    if (navTabCount) {
      navTabCount.textContent = `${this.messages.length}`;
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===== Excerpt Feature =====

  getConversationId() {
    const m = location.pathname.match(/\/c\/([^/?#]+)/);
    return m ? m[1] : '__new__';
  }

  initExcerptFeature() {
    this.activeTab = this.settings.activeTab || 'navigator';
    this.loadExcerptsForCurrentConversation();
    this.bindTabEvents();
    this.bindExcerptsPanelEvents();
    this.installSelectionListener();
    this.renderExcerpts();
    this.applyActiveTab();
  }

  loadExcerptsForCurrentConversation() {
    try {
      const raw = localStorage.getItem('zNavi-excerpts');
      const all = raw ? JSON.parse(raw) : {};
      const cid = this.getConversationId();
      this.excerpts = Array.isArray(all[cid]) ? all[cid] : [];
    } catch (e) {
      this.excerpts = [];
    }
  }

  saveExcerpts() {
    try {
      const raw = localStorage.getItem('zNavi-excerpts');
      const all = raw ? JSON.parse(raw) : {};
      const cid = this.getConversationId();
      all[cid] = this.excerpts;
      localStorage.setItem('zNavi-excerpts', JSON.stringify(all));
    } catch (e) { /* quota exceeded, fail silent */ }
  }

  addExcerpt(text, sourceMeta) {
    const trimmed = (text || '').trim();
    if (trimmed.length < 2) return;
    const capped = trimmed.slice(0, this.settings.excerptsMaxChars);
    if (this.excerpts.some(e => e.text === capped)) {
      this.flashExcerptToast('Already saved');
      return;
    }
    const excerpt = {
      id: 'ex-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      text: capped,
      createdAt: Date.now(),
      conversationId: this.getConversationId(),
      sourceRole: (sourceMeta && sourceMeta.role) || null,
      sourceMessageId: (sourceMeta && sourceMeta.messageId) || null
    };
    this.excerpts.unshift(excerpt);
    this.saveExcerpts();
    this.renderExcerpts();
    this.flashExcerptToast('Excerpt saved');
  }

  removeExcerpt(id) {
    this.excerpts = this.excerpts.filter(e => e.id !== id);
    this.selectedExcerptIds.delete(id);
    this.saveExcerpts();
    this.renderExcerpts();
  }

  clearAllExcerpts() {
    if (!this.excerpts.length) return;
    if (!confirm('Clear all excerpts in this conversation?')) return;
    this.excerpts = [];
    this.selectedExcerptIds.clear();
    this.saveExcerpts();
    this.renderExcerpts();
  }

  // ----- Selection detection + floating button -----

  installSelectionListener() {
    document.addEventListener('mouseup', (e) => this.handlePossibleSelection(e), true);
    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) this.hideFloatingBtn();
    });
    window.addEventListener('scroll', () => this.hideFloatingBtn(), true);
  }

  handlePossibleSelection(e) {
    // Skip if mouseup is inside our floating button
    if (this.floatingBtn && this.floatingBtn.contains(e.target)) return;
    // Let ChatGPT's own logic finish first
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        this.hideFloatingBtn();
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 2) {
        this.hideFloatingBtn();
        return;
      }
      const range = sel.getRangeAt(0);
      const anchorNode = range.commonAncestorContainer;
      const anchor = anchorNode.nodeType === 1 ? anchorNode : anchorNode.parentElement;
      if (!anchor) {
        this.hideFloatingBtn();
        return;
      }
      // Ignore selection inside sidebar or input fields
      if (this.sidebar && this.sidebar.contains(anchor)) {
        this.hideFloatingBtn();
        return;
      }
      if (anchor.closest('input, textarea, [contenteditable="true"]')) {
        this.hideFloatingBtn();
        return;
      }

      this.lastSelectionRange = range.cloneRange();
      const msgEl = anchor.closest('[data-message-author-role]');
      this.lastSelectionMeta = {
        role: msgEl ? msgEl.getAttribute('data-message-author-role') : null,
        messageId: msgEl ? msgEl.getAttribute('data-message-id') : null
      };

      const rect = range.getBoundingClientRect();
      this.showFloatingBtn(rect);
    }, 0);
  }

  ensureFloatingBtn() {
    if (this.floatingBtn) return this.floatingBtn;
    const btn = document.createElement('button');
    btn.id = 'znavi-excerpt-floating-btn';
    btn.className = 'znavi-excerpt-floating-btn';
    btn.type = 'button';
    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 3h5l3 3v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
        <path d="M9 3v3h3"/>
      </svg>
      <span>Excerpt</span>
    `;
    // Prevent mousedown from clearing the selection
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const sel = window.getSelection();
      let text = '';
      if (sel && !sel.isCollapsed) {
        text = sel.toString();
      } else if (this.lastSelectionRange) {
        text = this.lastSelectionRange.toString();
      }
      if (text && text.trim()) {
        this.addExcerpt(text, this.lastSelectionMeta || {});
      }
      this.hideFloatingBtn();
      if (sel) sel.removeAllRanges();
    });
    document.body.appendChild(btn);
    this.floatingBtn = btn;
    return btn;
  }

  showFloatingBtn(rect) {
    const btn = this.ensureFloatingBtn();
    const btnW = 86;
    const btnH = 28;
    // Place above the selection, right-aligned; if no room above, place below
    let top = rect.top + window.scrollY - btnH - 6;
    if (top < window.scrollY + 4) {
      top = rect.bottom + window.scrollY + 6;
    }
    let left = rect.right + window.scrollX - btnW;
    left = Math.max(window.scrollX + 4, Math.min(left, window.scrollX + window.innerWidth - btnW - 4));
    btn.style.top = top + 'px';
    btn.style.left = left + 'px';
    btn.classList.add('visible');
  }

  hideFloatingBtn() {
    if (this.floatingBtn) this.floatingBtn.classList.remove('visible');
  }

  flashExcerptToast(msg) {
    if (!this.sidebar) return;
    let toast = document.getElementById('znavi-excerpt-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'znavi-excerpt-toast';
      this.sidebar.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), 1500);
  }

  // ----- Tab switching -----

  bindTabEvents() {
    const tabs = document.querySelectorAll('#nav-tabs .nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = tab.getAttribute('data-tab');
        this.setActiveTab(name);
      });
    });
  }

  setActiveTab(name) {
    this.activeTab = name;
    this.settings.activeTab = name;
    this.saveSettings();
    this.applyActiveTab();
  }

  applyActiveTab() {
    const name = this.activeTab || 'navigator';
    document.querySelectorAll('#nav-tabs .nav-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === name);
    });
    document.querySelectorAll('#chatgpt-navigator-sidebar .nav-panel').forEach(p => {
      p.classList.toggle('active', p.id === 'nav-panel-' + name);
    });
    // Closing search / settings when leaving navigator tab
    if (name !== 'navigator') {
      document.getElementById('nav-search-bar')?.classList.remove('open');
      document.getElementById('nav-settings-panel')?.classList.remove('open');
    }
  }

  // ----- Excerpt panel rendering + events -----

  bindExcerptsPanelEvents() {
    const clearBtn = document.getElementById('nav-excerpts-clear');
    const insertBtn = document.getElementById('nav-excerpts-insert');
    const summarizeBtn = document.getElementById('nav-excerpts-summarize');
    const selectAllBtn = document.getElementById('nav-excerpts-selectall-btn');
    const list = document.getElementById('nav-excerpts-list');

    clearBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearAllExcerpts();
    });

    selectAllBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const total = this.excerpts.length;
      if (total === 0) return;
      const allSelected = this.selectedExcerptIds.size === total;
      if (allSelected) {
        this.selectedExcerptIds.clear();
      } else {
        this.excerpts.forEach(x => this.selectedExcerptIds.add(x.id));
      }
      this.renderExcerpts();
    });

    insertBtn?.addEventListener('click', () => this.insertExcerpts(false));
    summarizeBtn?.addEventListener('click', () => this.insertExcerpts(true));

    document.getElementById('nav-excerpts-export-md')?.addEventListener('click', () => this.exportExcerpts('md'));
    document.getElementById('nav-excerpts-export-html')?.addEventListener('click', () => this.exportExcerpts('html'));
    document.getElementById('nav-excerpts-copy-all')?.addEventListener('click', () => this.copyExcerpts());

    // Drag-and-drop reordering
    list?.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.nav-excerpt-item');
      if (!item) return;
      // Suppress drag if starting from interactive children
      if (e.target.closest('.nav-excerpt-checkbox, .nav-excerpt-delete, .nav-excerpt-copy, .nav-excerpt-expand, .nav-excerpt-full')) {
        e.preventDefault();
        return;
      }
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', item.dataset.id); } catch (_) {}
      this._dragId = item.dataset.id;
    });

    list?.addEventListener('dragover', (e) => {
      const item = e.target.closest('.nav-excerpt-item');
      if (!item) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      list.querySelectorAll('.drop-target-above, .drop-target-below').forEach(el => {
        el.classList.remove('drop-target-above', 'drop-target-below');
      });
      // Don't show drop indicator on the item being dragged (it's a no-op drop)
      if (item.classList.contains('dragging')) return;
      const position = this.getDragPosition(item, e.clientY);
      item.classList.add(position === 'above' ? 'drop-target-above' : 'drop-target-below');
    });

    list?.addEventListener('dragleave', (e) => {
      // Only clear when leaving the list entirely
      if (!list.contains(e.relatedTarget)) {
        list.querySelectorAll('.drop-target-above, .drop-target-below').forEach(el => {
          el.classList.remove('drop-target-above', 'drop-target-below');
        });
      }
    });

    list?.addEventListener('drop', (e) => {
      e.preventDefault();
      const item = e.target.closest('.nav-excerpt-item');
      if (!item) return;
      const fromId = (e.dataTransfer.getData('text/plain') || this._dragId);
      const toId = item.dataset.id;
      const position = this.getDragPosition(item, e.clientY);
      this.reorderExcerpt(fromId, toId, position);
    });

    list?.addEventListener('dragend', () => {
      list.querySelectorAll('.dragging, .drop-target-above, .drop-target-below').forEach(el => {
        el.classList.remove('dragging', 'drop-target-above', 'drop-target-below');
      });
      this._dragId = null;
    });

    list?.addEventListener('click', (e) => {
      const item = e.target.closest('.nav-excerpt-item');
      if (!item) return;
      const id = item.dataset.id;
      if (e.target.closest('.nav-excerpt-delete')) {
        this.removeExcerpt(id);
        return;
      }
      if (e.target.closest('.nav-excerpt-copy')) {
        this.copyOneExcerpt(id);
        return;
      }
      if (e.target.closest('.nav-excerpt-expand')) {
        item.classList.toggle('expanded');
        return;
      }
    });

    list?.addEventListener('change', (e) => {
      if (e.target.classList.contains('nav-excerpt-checkbox')) {
        const item = e.target.closest('.nav-excerpt-item');
        if (!item) return;
        const id = item.dataset.id;
        if (e.target.checked) this.selectedExcerptIds.add(id);
        else this.selectedExcerptIds.delete(id);
        item.classList.toggle('selected', e.target.checked);
        this.updateExcerptActionsState();
      }
    });
  }

  renderExcerpts() {
    const list = document.getElementById('nav-excerpts-list');
    const tabCount = document.getElementById('nav-tab-count-ex');
    if (tabCount) tabCount.textContent = String(this.excerpts.length);
    if (!list) return;

    if (!this.excerpts.length) {
      list.innerHTML = `<div class="nav-excerpts-empty">Select text on the page, then click "Excerpt".</div>`;
      this.updateExcerptActionsState();
      return;
    }

    const maxLen = this.settings.excerptPreviewLength;
    list.innerHTML = this.excerpts.map(ex => {
      const needsTruncate = ex.text.length > maxLen;
      const preview = needsTruncate ? ex.text.slice(0, maxLen) + '…' : ex.text;
      const checked = this.selectedExcerptIds.has(ex.id);
      const roleLabel = ex.sourceRole === 'assistant' ? 'A'
        : (ex.sourceRole === 'user' ? 'U' : '');
      const roleBadge = roleLabel
        ? `<span class="nav-excerpt-role role-${ex.sourceRole}">${roleLabel}</span>`
        : '';
      return `
        <div class="nav-excerpt-item ${checked ? 'selected' : ''}" data-id="${ex.id}" draggable="true">
          <input type="checkbox" class="nav-excerpt-checkbox" ${checked ? 'checked' : ''} />
          <div class="nav-excerpt-body">
            <div class="nav-excerpt-meta">
              ${roleBadge}
              <span class="nav-excerpt-time">${this.formatExcerptTime(ex.createdAt)}</span>
            </div>
            <div class="nav-excerpt-text">${this.escapeHtml(preview)}</div>
            ${needsTruncate ? `<button class="nav-excerpt-expand" type="button">more</button>` : ''}
            <div class="nav-excerpt-full">${this.escapeHtml(ex.text)}</div>
          </div>
          <button class="nav-excerpt-copy" type="button" title="Copy this excerpt">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="9" height="11" rx="1.5"/><path d="M3 5v8.5A1.5 1.5 0 0 0 4.5 15H11"/></svg>
          </button>
          <button class="nav-excerpt-delete" type="button" title="Delete">×</button>
        </div>
      `;
    }).join('');

    this.updateExcerptActionsState();
  }

  updateExcerptActionsState() {
    const n = this.selectedExcerptIds.size;
    const total = this.excerpts.length;
    const insertBtn = document.getElementById('nav-excerpts-insert');
    const summarizeBtn = document.getElementById('nav-excerpts-summarize');
    const exportMdBtn = document.getElementById('nav-excerpts-export-md');
    const exportHtmlBtn = document.getElementById('nav-excerpts-export-html');
    const copyAllBtn = document.getElementById('nav-excerpts-copy-all');
    const selectAllBtn = document.getElementById('nav-excerpts-selectall-btn');
    const clearBtn = document.getElementById('nav-excerpts-clear');
    if (insertBtn) insertBtn.disabled = n === 0;
    if (summarizeBtn) summarizeBtn.disabled = n === 0;
    if (exportMdBtn) exportMdBtn.disabled = n === 0;
    if (exportHtmlBtn) exportHtmlBtn.disabled = n === 0;
    if (copyAllBtn) copyAllBtn.disabled = n === 0;
    if (clearBtn) clearBtn.disabled = total === 0;

    if (selectAllBtn) {
      const state = total === 0 ? 'none' : (n === 0 ? 'none' : (n === total ? 'all' : 'some'));
      selectAllBtn.dataset.state = state;
      selectAllBtn.disabled = total === 0;
      const iconSpan = selectAllBtn.querySelector('.nav-selectall-icon');
      if (iconSpan) iconSpan.innerHTML = ChatGPTNavigator.SELECTALL_ICONS[state];
    }
  }

  formatExcerptTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ----- Insert into ChatGPT input -----

  buildExcerptPayload(selectedList, forSummary) {
    const body = selectedList.map((ex, i) =>
      `${i + 1}. "${ex.text.replace(/"/g, '“')}"`
    ).join('\n\n');
    return forSummary ? `Please synthesize the following excerpts into a coherent, integrated summary — do NOT summarize each item separately. Identify the underlying themes, connect related ideas across items, and weave them into a unified narrative. Respond in the same language as the excerpts below — do not translate.\n\n${body}` : body;
  }

  async insertExcerpts(autoSend) {
    // Preserve original excerpt order (ascending) when building payload
    const selected = this.excerpts.filter(e => this.selectedExcerptIds.has(e.id)).slice().reverse();
    if (!selected.length) return;

    const text = this.buildExcerptPayload(selected, autoSend);

    const input = document.querySelector('#prompt-textarea')
               || document.querySelector('form [contenteditable="true"]')
               || document.querySelector('[contenteditable="true"][data-virtualkeyboard="true"]');
    if (!input) {
      this.flashExcerptToast('ChatGPT input not found');
      return;
    }

    input.focus();

    const existingText = (input.textContent || '').trim();
    const isAppend = existingText.length > 0;

    const sel = window.getSelection();
    const range = document.createRange();

    if (isAppend) {
      // Move caret to end without deleting existing content
      range.selectNodeContents(input);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      // Two line breaks to separate the new payload from the user's draft
      try { document.execCommand('insertLineBreak', false); } catch (e) { /* ignore */ }
      try { document.execCommand('insertLineBreak', false); } catch (e) { /* ignore */ }
    } else {
      // Empty input — replace flow (selectAll → delete → insert)
      range.selectNodeContents(input);
      sel.removeAllRanges();
      sel.addRange(range);
      try { document.execCommand('delete', false); } catch (e) { /* ignore */ }
    }

    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        try { document.execCommand('insertLineBreak', false); } catch (e) { /* ignore */ }
      }
      if (lines[i]) {
        try { document.execCommand('insertText', false, lines[i]); } catch (e) { /* ignore */ }
      }
    }

    // Defensive input event to nudge React state sync
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));

    if (isAppend && !autoSend) {
      this.flashExcerptToast('Appended to existing input');
    }

    if (autoSend) {
      // Wait for React state + send button enablement
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise(r => setTimeout(r, 80));
      const sendBtn = document.querySelector('button[data-testid="send-button"]:not([disabled])')
                   || document.querySelector('button[aria-label*="Send" i]:not([disabled])');
      if (sendBtn) {
        sendBtn.click();
        this.selectedExcerptIds.clear();
        this.renderExcerpts();
      } else {
        this.flashExcerptToast('Send button not available');
      }
    } else {
      this.selectedExcerptIds.clear();
      this.renderExcerpts();
    }
  }

  // ----- Export -----

  getSelectedExcerptsInOrder() {
    // Display order = newest-first; export in chronological (oldest-first) order
    return this.excerpts
      .filter(e => this.selectedExcerptIds.has(e.id))
      .slice()
      .reverse();
  }

  exportFilenameStem() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
    return `zNavi_excerpts_${ts}`;
  }

  buildExcerptMarkdown(selected) {
    const cid = this.getConversationId();
    const url = location.href;
    const now = new Date().toISOString();
    const header =
`# zNavi Excerpts

- **Exported**: ${now}
- **Conversation**: ${cid}
- **Source**: ${url}
- **Count**: ${selected.length}

---
`;
    const body = selected.map((ex, i) => {
      const role = ex.sourceRole ? ` _(${ex.sourceRole})_` : '';
      const time = new Date(ex.createdAt).toLocaleString();
      return `## ${i + 1}.${role}\n\n*Saved at ${time}*\n\n> ${ex.text.replace(/\n/g, '\n> ')}\n`;
    }).join('\n');
    return header + '\n' + body;
  }

  triggerDownload(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  buildExcerptHtml(selected) {
    const cid = this.getConversationId();
    const now = new Date().toLocaleString();
    const esc = s => this.escapeHtml(s);
    const items = selected.map((ex, i) => {
      const role = ex.sourceRole ? `<span class="role role-${ex.sourceRole}">${ex.sourceRole}</span>` : '';
      const time = new Date(ex.createdAt).toLocaleString();
      return `
        <article class="ex">
          <header><span class="num">${i + 1}</span>${role}<span class="time">${esc(time)}</span></header>
          <blockquote>${esc(ex.text).replace(/\n/g, '<br>')}</blockquote>
        </article>`;
    }).join('');
    return `<!doctype html>
<html><head><meta charset="utf-8"><title>zNavi Excerpts</title>
<style>
  @page { margin: 18mm; }
  * { box-sizing: border-box; }
  body { font: 14px/1.6 -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; color: #111827; max-width: 760px; margin: 0 auto; padding: 32px 24px; background: #fafbfc; }
  h1 { font-size: 22px; margin: 0 0 6px; background: linear-gradient(135deg, #3b82f6, #6366f1); -webkit-background-clip: text; background-clip: text; color: transparent; display: inline-block; }
  .meta { color: #6b7280; font-size: 11px; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 14px; }
  .meta div { margin: 2px 0; }
  .ex { margin: 16px 0; page-break-inside: avoid; background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
  .ex header { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #6b7280; margin-bottom: 8px; }
  .num { background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; border-radius: 10px; padding: 1px 8px; font-weight: 600; font-size: 11px; }
  .role { text-transform: uppercase; font-weight: 600; padding: 1px 6px; border-radius: 3px; color: white; font-size: 9px; letter-spacing: 0.04em; }
  .role-assistant { background: #6366f1; }
  .role-user { background: #10b981; }
  .time { font-variant-numeric: tabular-nums; margin-left: auto; }
  blockquote { margin: 0; padding: 6px 12px; border-left: 3px solid #6366f1; white-space: pre-wrap; word-break: break-word; color: #1f2937; }
  .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 10px; text-align: center; }
  @media print { body { padding: 0; background: white; } .ex { border: none; padding: 0; background: transparent; } }
  @media (prefers-color-scheme: dark) {
    body { background: #111827; color: #e5e7eb; }
    .ex { background: #1f2937; border-color: #374151; }
    blockquote { color: #e5e7eb; }
    .meta { border-bottom-color: #374151; }
    .footer { border-top-color: #374151; }
  }
</style></head><body>
  <h1>zNavi Excerpts</h1>
  <div class="meta">
    <div><strong>Exported:</strong> ${esc(now)}</div>
    <div><strong>Conversation:</strong> ${esc(cid)}</div>
    <div><strong>Source:</strong> ${esc(location.href)}</div>
    <div><strong>Count:</strong> ${selected.length}</div>
  </div>
  ${items}
  <div class="footer">Generated by zNavi</div>
</body></html>`;
  }

  exportExcerpts(format) {
    const selected = this.getSelectedExcerptsInOrder();
    if (!selected.length) return;
    const stem = this.exportFilenameStem();

    if (format === 'md') {
      const md = this.buildExcerptMarkdown(selected);
      this.triggerDownload(`${stem}.md`, md, 'text/markdown;charset=utf-8');
      this.flashExcerptToast(`Exported ${selected.length} as .md`);
      return;
    }

    if (format === 'html') {
      const html = this.buildExcerptHtml(selected);
      this.triggerDownload(`${stem}.html`, html, 'text/html;charset=utf-8');
      this.flashExcerptToast(`Exported ${selected.length} as .html`);
      return;
    }
  }

  // ----- Clipboard -----

  async writeClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) { /* fall through */ }
    // Fallback: hidden textarea + execCommand('copy')
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) { return false; }
  }

  async copyOneExcerpt(id) {
    const ex = this.excerpts.find(e => e.id === id);
    if (!ex) return;
    const ok = await this.writeClipboard(ex.text);
    this.flashExcerptToast(ok ? 'Copied' : 'Copy failed');
  }

  async copyExcerpts() {
    const selected = this.getSelectedExcerptsInOrder();
    if (!selected.length) return;
    const text = this.buildExcerptPayload(selected, false);
    const ok = await this.writeClipboard(text);
    this.flashExcerptToast(ok ? `Copied ${selected.length} excerpts` : 'Copy failed');
  }

  // ----- Reorder -----

  getDragPosition(item, clientY) {
    const rect = item.getBoundingClientRect();
    return (clientY - rect.top) < rect.height / 2 ? 'above' : 'below';
  }

  reorderExcerpt(fromId, toId, position) {
    if (!fromId || !toId || fromId === toId) return;
    const fromIdx = this.excerpts.findIndex(e => e.id === fromId);
    const toIdx = this.excerpts.findIndex(e => e.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;

    const [moved] = this.excerpts.splice(fromIdx, 1);
    // Recompute target index after removal
    let insertAt = this.excerpts.findIndex(e => e.id === toId);
    if (insertAt < 0) insertAt = this.excerpts.length;
    if (position === 'below') insertAt += 1;
    this.excerpts.splice(insertAt, 0, moved);

    this.saveExcerpts();
    this.renderExcerpts();
  }
}

// Initialize
const navigator = new ChatGPTNavigator();
