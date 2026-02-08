// ChatGPT Command Navigator - Content Script
// Monitor ChatGPT page, extract user messages, create smart navigation

class ChatGPTNavigator {
  constructor() {
    this.messages = [];
    this.sidebar = null;
    this.currentConversationId = null;
    this.observer = null;
    this.init();
  }
  
  init() {
    console.log('ChatGPT Command Navigator initialized');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }
  
  start() {
    this.createSidebar();
    this.observeMessages();
    this.extractExistingMessages();
  }
  
  createSidebar() {
    this.sidebar = document.createElement('div');
    this.sidebar.id = 'chatgpt-navigator-sidebar';
    this.sidebar.innerHTML = `
      <div class="nav-header">
        <h3>📑 Navigator <span id="nav-count" class="nav-count-badge">0</span></h3>
        <div class="nav-header-actions">
          <button id="nav-refresh" title="Refresh">↻</button>
          <button id="nav-toggle" title="Collapse/Expand">◀</button>
        </div>
      </div>
      <div class="nav-search">
        <input type="text" id="nav-search-input" placeholder="Search commands..." />
        <button id="nav-clear-search">✕</button>
      </div>
      <div class="nav-list" id="nav-list"></div>
    `;
    
    document.body.appendChild(this.sidebar);
    document.documentElement.classList.add('chatgpt-nav-open');
    this.applyMainContentMargin(320);
    this.bindSidebarEvents();
  }
  
  bindSidebarEvents() {
    const toggleBtn = document.getElementById('nav-toggle');
    const header = document.querySelector('.nav-header');
    
    const toggleSidebar = () => {
      this.sidebar.classList.toggle('collapsed');
      const isCollapsed = this.sidebar.classList.contains('collapsed');
      toggleBtn.textContent = isCollapsed ? '▶' : '◀';
      document.documentElement.classList.toggle('chatgpt-nav-open', !isCollapsed);
      document.documentElement.classList.toggle('chatgpt-nav-collapsed', isCollapsed);
      this.applyMainContentMargin(isCollapsed ? 40 : 320);
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
    
    // Click header when collapsed to expand
    header.addEventListener('click', () => {
      if (this.sidebar.classList.contains('collapsed')) {
        toggleSidebar();
      }
    });
    
    // Search
    const searchInput = document.getElementById('nav-search-input');
    searchInput.addEventListener('input', (e) => {
      this.filterMessages(e.target.value);
    });
    
    // Clear search
    const clearBtn = document.getElementById('nav-clear-search');
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      this.filterMessages('');
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
    if (domResult) return domResult;

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

    // Second pass: flatten multi-level chains so every child points to a top-level ancestor
    messages.forEach((msg) => {
      if (typeof msg.parentIndex !== 'number') return;
      const visited = new Set();
      let current = msg.parentIndex;
      while (typeof messages[current]?.parentIndex === 'number') {
        if (visited.has(current)) break;
        visited.add(current);
        current = messages[current].parentIndex;
      }
      msg.parentIndex = current;
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

    // Build ordered list: top-level messages get sequential numbers,
    // children are inserted right after their parent with sub-numbers
    const displayOrder = [];
    let mainCounter = 0;

    this.messages.forEach((msg, index) => {
      if (typeof msg.parentIndex === 'number') {
        // Skip children here — they are inserted after their parent
        return;
      }

      mainCounter++;
      msg.displayNumber = `${mainCounter}`;
      displayOrder.push({ msg, displayNumber: `${mainCounter}`, originalIndex: index });

      // Insert children of this message right after it
      if (childrenByParent[index]) {
        let subCounter = 0;
        childrenByParent[index].forEach(child => {
          subCounter++;
          const dn = `${mainCounter}.${subCounter}`;
          child.msg.displayNumber = dn;
          displayOrder.push({ msg: child.msg, displayNumber: dn, originalIndex: child.originalIndex });
        });
      }
    });

    // Safety net: append any messages not yet in displayOrder
    const included = new Set(displayOrder.map(d => d.originalIndex));
    this.messages.forEach((msg, index) => {
      if (!included.has(index)) {
        mainCounter++;
        msg.displayNumber = `${mainCounter}`;
        displayOrder.push({ msg, displayNumber: `${mainCounter}`, originalIndex: index });
      }
    });

    return displayOrder;
  }

  renderMessages() {
    const listContainer = document.getElementById('nav-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    try {
      const displayOrder = this.computeDisplayOrder();
      console.log('[Navigator] displayOrder:', displayOrder.length, 'items from', this.messages.length, 'messages');

      if (displayOrder.length === 0 && this.messages.length > 0) {
        // Fallback: render sequentially if display order computation yields nothing
        console.warn('[Navigator] displayOrder empty, falling back to sequential');
        this.messages.forEach((msg, index) => {
          const item = this.createMessageItem(msg, index, `${index + 1}`);
          listContainer.appendChild(item);
        });
      } else {
        displayOrder.forEach(({ msg, displayNumber, originalIndex }) => {
          const item = this.createMessageItem(msg, originalIndex, displayNumber);
          listContainer.appendChild(item);
        });
      }
    } catch (e) {
      console.error('[Navigator] renderMessages error, falling back:', e);
      this.messages.forEach((msg, index) => {
        const item = this.createMessageItem(msg, index, `${index + 1}`);
        listContainer.appendChild(item);
      });
    }

    this.updateStats();
  }
  
  createMessageItem(msg, index, displayNumber) {
    const item = document.createElement('div');
    item.className = 'nav-item';
    item.dataset.messageId = msg.id;
    item.dataset.index = index;
    
    // Add class if this message is a child (references a parent prompt)
    if (typeof msg.parentIndex === 'number') {
      item.classList.add('has-reference');
      item.classList.add('is-child');
    } else if (msg.quotedResponseId) {
      item.classList.add('has-reference');
    }

    // Add class if this message has attachments
    if (msg.attachments) {
      item.classList.add('has-attachment');
    }

    const preview = msg.text.length > 70 ? msg.text.substring(0, 70) + '...' : msg.text;

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
    }, 2000);
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
