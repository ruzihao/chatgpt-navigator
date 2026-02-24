// zNavi - Page Bridge
// Runs in MAIN world to access React fiber internals for quote target resolution.

(function() {
  'use strict';

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function getReactFiber(el) {
    if (!el) return null;
    const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
    return key ? el[key] : null;
  }

  // Extract all UUID strings from an object, up to maxDepth levels deep
  function extractUUIDs(obj, maxDepth, depth, visited) {
    const uuids = [];
    if (depth > maxDepth || !obj || typeof obj !== 'object' || visited.has(obj)) return uuids;
    visited.add(obj);
    try {
      const values = Array.isArray(obj) ? obj : Object.values(obj);
      for (const val of values) {
        if (typeof val === 'string') {
          if (UUID_RE.test(val)) uuids.push(val);
        } else if (typeof val === 'object' && val !== null && depth < maxDepth) {
          uuids.push(...extractUUIDs(val, maxDepth, depth + 1, visited));
        }
      }
    } catch (e) { /* ignore exotic objects */ }
    return uuids;
  }

  function findQuoteTargetId(button, currentMessageId) {
    let fiber = getReactFiber(button);
    let depth = 0;

    while (fiber && depth < 25) {
      const props = fiber.memoizedProps;
      if (props && typeof props === 'object') {
        const uuids = extractUUIDs(props, 2, 0, new Set());
        for (const uuid of uuids) {
          if (uuid === currentMessageId) continue;
          // Verify this UUID corresponds to an actual message element on the page
          const target = document.querySelector('[data-message-id="' + uuid + '"]');
          if (target) return uuid;
        }
      }
      fiber = fiber.return;
      depth++;
    }
    return null;
  }

  function resolveQuotes() {
    const userMsgs = document.querySelectorAll('[data-message-author-role="user"]');
    let resolved = 0;

    userMsgs.forEach(msg => {
      const msgId = msg.getAttribute('data-message-id');
      const mainText = msg.querySelector('.whitespace-pre-wrap');
      const buttons = msg.querySelectorAll('button');

      for (const btn of buttons) {
        // Quote button is outside the main text area and contains an SVG icon
        if (mainText && mainText.contains(btn)) continue;
        if (!btn.querySelector('svg')) continue;
        const btnText = btn.textContent.trim();
        if (btnText.length < 3) continue;

        const targetId = findQuoteTargetId(btn, msgId);
        if (targetId) {
          msg.setAttribute('data-nav-quote-target', targetId);
          resolved++;
          break;
        }
      }
    });

    console.log('[Navigator Bridge] Resolved', resolved, 'quote targets');
  }

  // Listen for resolution requests from the content script (ISOLATED world)
  document.addEventListener('chatgpt-nav-resolve-quotes', () => {
    resolveQuotes();
  });
})();
