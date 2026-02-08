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
        <h3>📑 Command Navigator</h3>
        <button id="nav-toggle" title="Collapse/Expand">◀</button>
      </div>
      <div class="nav-search">
        <input type="text" id="nav-search-input" placeholder="Search commands..." />
        <button id="nav-clear-search">✕</button>
      </div>
      <div class="nav-stats">
        <span id="nav-count">0 commands</span>
      </div>
      <div class="nav-list" id="nav-list"></div>
    `;
    
    document.body.appendChild(this.sidebar);
    this.bindSidebarEvents();
  }
  
  bindSidebarEvents() {
    const toggleBtn = document.getElementById('nav-toggle');
    const header = document.querySelector('.nav-header');
    
    const toggleSidebar = () => {
      this.sidebar.classList.toggle('collapsed');
      toggleBtn.textContent = this.sidebar.classList.contains('collapsed') ? '▶' : '◀';
    };
    
    // Click toggle button
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSidebar();
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
  
  observeMessages() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };
    
    this.observer = new MutationObserver((mutations) => {
      let hasNewMessage = false;
      
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1 && this.isUserMessage(node)) {
              hasNewMessage = true;
              break;
            }
          }
        }
      }
      
      if (hasNewMessage) {
        setTimeout(() => this.extractExistingMessages(), 500);
      }
    });
    
    this.observer.observe(targetNode, config);
  }
  
  isUserMessage(element) {
    if (!element.querySelector) return false;
    return element.matches('[data-message-author-role="user"]') ||
           element.querySelector('[data-message-author-role="user"]') !== null;
  }
  
  extractExistingMessages() {
    const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
    
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

  extractQuotedSnippet(element) {
    // Strategy 1: blockquote
    const blockquote = element.querySelector('blockquote');
    if (blockquote) {
      const text = blockquote.textContent.trim();
      if (text) return text.substring(0, 100);
    }

    // Strategy 2: elements with quote/cited/reference classes
    const quoteSelectors = ['[class*="quote"]', '[class*="cited"]', '[class*="reference"]', '[data-message-citation]'];
    for (const sel of quoteSelectors) {
      const el = element.querySelector(sel);
      if (el) {
        const text = el.textContent.trim();
        if (text) return text.substring(0, 100);
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
          if (text) return text.substring(0, 100);
        }
      }
    }

    // Strategy 4: SVG arrow icon (ChatGPT's native reply UI renders arrows as SVG)
    // Find the smallest container above each SVG that has text but isn't the whole message
    const msgText = element.textContent.trim();
    const svgs = element.querySelectorAll('svg');
    for (const svg of svgs) {
      let container = svg.parentElement;
      while (container && container !== element) {
        const text = container.textContent.trim();
        if (text.length > 0 && text.length < msgText.length * 0.8) {
          return text.substring(0, 100);
        }
        container = container.parentElement;
      }
    }

    return '';
  }

  extractQuotedResponse(element, currentIndex, hasAttachments = false) {
    // Check if this message has any quote indicators
    const mainText = element.querySelector('.whitespace-pre-wrap');

    // Strong indicators: reliable signals that the user is quoting a previous response
    const hasStrongIndicator = element.querySelector('blockquote') !== null ||
                                element.querySelector('[class*="quote"]') !== null ||
                                element.querySelector('[class*="cited"]') !== null ||
                                element.querySelector('[class*="reference"]') !== null ||
                                element.querySelector('[data-message-citation]') !== null ||
                                element.innerHTML.includes('↪') ||
                                element.innerHTML.includes('↩');

    // Weak indicator: SVG outside main text could be a quote arrow, but also a file type icon
    const hasSvgIndicator = this.hasSvgOutsideMainText(element, mainText);

    // When attachments are present, SVG alone is unreliable (file icons are SVGs too)
    const hasQuoteIndicator = hasStrongIndicator || (!hasAttachments && hasSvgIndicator);

    if (!hasQuoteIndicator) return null;

    console.log('Found quote indicator in message', currentIndex);

    // Extract the actual quoted snippet text
    const quotedText = this.extractQuotedSnippet(element);

    // Look for matching assistant response before this message
    const allMessages = document.querySelectorAll('[data-message-author-role]');
    let lastAssistantIndex = -1;
    let userMessageCount = 0;

    for (let i = 0; i < allMessages.length; i++) {
      const role = allMessages[i].getAttribute('data-message-author-role');

      if (role === 'user') {
        if (userMessageCount === currentIndex) {
          break;
        }
        userMessageCount++;
      } else if (role === 'assistant') {
        lastAssistantIndex = i;

        // If we have quoted text, try to match it against this response
        if (quotedText) {
          const assistantText = allMessages[i].textContent;
          if (assistantText.includes(quotedText)) {
            console.log('Matched quote to response', lastAssistantIndex);
            return { id: `resp-${lastAssistantIndex}`, element: allMessages[i], preview: quotedText };
          }
        }
      }
    }

    // Couldn't match text — fall back to most recent response, but require evidence:
    // - Strong indicator (blockquote, quote class, arrows): always allow fallback
    // - SVG-only: require meaningful quoted text (>10 chars) to avoid false positives from image/file icons
    if (lastAssistantIndex >= 0 && (hasStrongIndicator || (quotedText && quotedText.length > 10))) {
      console.log('Quote detected, using most recent response', lastAssistantIndex);
      const preview = quotedText || allMessages[lastAssistantIndex].textContent.trim().substring(0, 60);
      return { id: `resp-${lastAssistantIndex}`, element: allMessages[lastAssistantIndex], preview };
    }

    return null;
  }
  
  buildReferenceTree(messages) {
    const allMessages = document.querySelectorAll('[data-message-author-role]');

    messages.forEach((msg) => {
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
        }
      }
    });
  }
  
  renderMessages() {
    const listContainer = document.getElementById('nav-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    this.messages.forEach((msg, index) => {
      const item = this.createMessageItem(msg, index);
      listContainer.appendChild(item);
    });
    
    this.updateStats();
  }
  
  createMessageItem(msg, index) {
    const item = document.createElement('div');
    item.className = 'nav-item';
    item.dataset.messageId = msg.id;
    item.dataset.index = index;
    
    // Add class if this message quotes a response
    if (msg.quotedResponseId) {
      item.classList.add('has-reference');
      if (typeof msg.parentIndex === 'number') {
        item.classList.add('is-child');
      }
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
      <div class="nav-item-number">${index + 1}</div>
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
      statsEl.textContent = `${visibleCount} / ${this.messages.length} commands`;
    }
  }
  
  updateStats() {
    const countEl = document.getElementById('nav-count');
    
    if (countEl) {
      countEl.textContent = `${this.messages.length} command${this.messages.length !== 1 ? 's' : ''}`;
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
