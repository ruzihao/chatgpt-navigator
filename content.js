// zNavi - Content Script
// Monitor ChatGPT page, extract user messages, create smart navigation

class ChatGPTNavigator {
  static DEFAULTS = {
    fontSize: 12,
    theme: 'auto',
    previewLength: 70,
    highlightDuration: 2000,
    referenceMode: true
  };

  constructor() {
    this.messages = [];
    this.sidebar = null;
    this.currentConversationId = null;
    this.observer = null;
    this.settings = { ...ChatGPTNavigator.DEFAULTS };
    this.displayMode = 'reference';
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
      </div>
      <div class="nav-search" id="nav-search-bar">
        <input type="text" id="nav-search-input" placeholder="Search prompt..." />
        <button id="nav-clear-search" title="Close search">✕</button>
      </div>
      <div class="nav-list" id="nav-list"></div>
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
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize
const navigator = new ChatGPTNavigator();
