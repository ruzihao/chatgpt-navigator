# Changelog

## [0.2] - 2026-04-25

### Added — Excerpts feature

A new "research → integrate → re-ask" workflow built on top of the navigator.

- ✏️ **Floating Excerpt button** — select any text on the page and a gradient "Excerpt" button appears near the selection. One click saves it.
  - Triggers anywhere in page content (assistant replies, user messages, plain page text)
  - Excludes the sidebar itself and ChatGPT's input box
  - Auto-hides on selection collapse, scroll, or empty selection
- 📋 **Excerpts panel** — new "Excerpts" tab in the sidebar header (Navigator / Excerpts toggle)
  - Each excerpt shows a checkbox, role badge (A / U), creation time, preview text (3-line clamp + "more" expand)
  - Per-item actions: copy, delete
  - Per-conversation isolation — excerpts keyed by conversation ID, persist across reloads
  - De-duplication: identical text within the same conversation is rejected with a toast
- 🎯 **Drag-to-reorder** — drag any excerpt to rearrange order
  - Gradient drop indicator (top / bottom edge of target) shows insertion point
  - Click areas (checkbox / copy / delete / expand) are excluded from drag triggers
  - Order persists in localStorage
- 📥 **Send to ChatGPT input**
  - **Insert** — fill numbered list `1. "..." 2. "..."` into the input (no auto-send)
  - **Summarize** — fill an integration prompt + numbered excerpts and **auto-click send**
  - Synthesis prompt instructs the model to integrate excerpts into a unified narrative (not summarize each separately) and respond in the source language
  - **Append-not-overwrite**: if the input box already has text, the payload is appended (`\n\n` separator) with toast confirmation, preserving the user's draft
  - Uses `document.execCommand('insertText' / 'insertLineBreak')` for ProseMirror compatibility
- 🗂 **Export**
  - **Copy** to clipboard (numbered list, same format as Insert)
  - **Markdown** — download `.md` file with frontmatter (export time, conversation ID, source URL, count) + blockquote per item
  - **HTML** — download self-contained styled `.html` file (gradient title, card layout, dark/print media queries)
  - Filename pattern: `zNavi_excerpts_YYYYMMDD_HHMM.{md,html}`
- ✅ **Modern checkboxes** — custom-rendered (no native browser styling)
  - Rounded square outline, brand-gradient fill on check
  - White SVG checkmark for checked, white horizontal bar for indeterminate (select-all partial)
  - Hover ring + focus-visible accessibility ring
- 🎛 **Action toolbar with grouped buttons**
  - Top toolbar (utility): `All` (3-state: none / some / all + icon) and `Clear` (red on hover, danger style)
  - Bottom toolbar: `To ChatGPT` group (Insert / Summarize) + `Export` group (Copy / Markdown / HTML)
  - Solid action buttons vs. ghost utility buttons for visual hierarchy
  - Group labels (`TO CHATGPT`, `EXPORT`) at fixed 64px width for vertical alignment

### Storage

- New `localStorage` key `zNavi-excerpts` keyed by conversation ID:
  ```
  {
    "<uuid>": [{ id, text, createdAt, conversationId, sourceRole, sourceMessageId }, ...],
    "__new__": [...]
  }
  ```
- Existing `zNavi-settings` key extended with `excerptsMaxChars`, `excerptPreviewLength`, `activeTab`

### Technical

- All logic implemented in ISOLATED-world content script (`content.js`)
- No new permissions required (`navigator.clipboard.writeText` works in user-gesture context on https)
- ChatGPT input detection: `#prompt-textarea` → fallback `form [contenteditable="true"]` → `[contenteditable="true"][data-virtualkeyboard="true"]`
- Send button detection: `[data-testid="send-button"]:not([disabled])` → fallback `[aria-label*="Send" i]:not([disabled])`
- Drag-and-drop via native HTML5 (`dragstart` / `dragover` / `drop` / `dragend`) with event delegation on the list container
- Per-conversation reload triggered by `observeConversationChanges` URL hook

### Bug fixes

- Drag indicator no longer renders on the item being dragged (no-op drop suppression)
- Bottom toolbar groups now wrap on narrow sidebar widths (`flex-wrap: wrap`)
- Selection inside ChatGPT's contenteditable input is filtered out (no spurious Excerpt button)
- Selection inside zNavi's sidebar is filtered out (no recursion)

### Known limitations

- New conversations (URL still pointing at `/c/__new__` placeholder) keep excerpts under the `__new__` key; on first send the URL changes but excerpts are not migrated. MVP-acceptable; revisit later.
- Summarize during a streaming response: send button selector temporarily fails; toast `Send button not available`. Text remains in the input box.

---

## [0.1] - 2026-02-08

### Added
- ✨ Initial release
- 📑 **Command index** - automatic extraction of all user prompts
  - Sequential numbering (1, 2, 3...)
  - Click to jump to any command
  - Scroll with smooth animation
- 🔗 **Response quote tracking** - detect when user quotes ChatGPT responses
  - Purple left border for prompts quoting responses
  - "↩ Quotes previous response" badge
  - Click highlights both prompt and quoted response
  - Different highlight colors (blue for prompt, purple for response)
- 🔍 **Search and filter**
  - Real-time filtering as you type
  - Case-insensitive search
  - Show N / Total statistics
  - Clear button (✕)
- 💫 **Jump and highlight effects**
  - Smooth scroll to message
  - 2-second blue pulse for prompt
  - 2-second purple pulse for quoted response
  - Dual highlighting when quote exists
- 🌓 **Dark mode support**
  - Auto-detects system preference
  - Consistent styling in both modes
  - Smooth transitions
- 🌍 **English interface**
  - All UI text in English
  - Clear, concise labels
- ◀▶ **Collapsible sidebar**
  - Click ◀ to collapse
  - 40px vertical tab remains visible
  - Click tab or ▶ to expand
  - Smooth slide animation

### Features in Detail

**Navigation**
- Sidebar on right (320px wide)
- Sticky header with controls
- Scrollable command list
- Numbered items for easy reference

**Quote Detection**
- Detects `<blockquote>` elements
- Searches for matching assistant response
- Visual indicators (border + badge)
- Dual highlighting on click

**Search**
- Filter commands in real-time
- Case-insensitive matching
- Updates count dynamically
- Easy to clear

**UI/UX**
- Clean, modern design
- Responsive layout
- Custom scrollbar
- Hover effects
- Accessible (keyboard navigation)

### Technical Details

**Core Files**
- `manifest.json` (747 bytes)
- `content.js` (~10KB)
- `sidebar.css` (~7KB)
- `icons/*.png` (3 files: 16x16, 48x48, 128x128)

**Key Methods**
- `extractQuotedResponse()` - detect quotes to ChatGPT responses
- `findResponseElement()` - locate quoted response in DOM
- `highlightMessage()` - dual highlighting effect
- `buildReferenceTree()` - track quote relationships

**DOM Selectors**
- User: `[data-message-author-role="user"]`
- Assistant: `[data-message-author-role="assistant"]`
- Quotes: `blockquote, [class*="quote"]`

### Removed Features

**Topic Detection** (Removed)
- ❌ Auto topic detection
- ❌ Topic titles
- ❌ Topic fold/unfold
- ❌ Topic statistics
- **Reason**: Not useful in practice, adds complexity

**Changed**: Quote detection now correctly identifies:
- ✅ User quoting ChatGPT **responses** (correct)
- ❌ User quoting own previous **prompts** (removed)

### Known Limitations

1. **Quote Detection**: Simplified algorithm
   - Best with ChatGPT's native quote UI
   - May miss some manual quotes
   - Will improve in future versions

2. **DOM Dependency**: Depends on ChatGPT structure
   - Selectors may need updates
   - Easy to fix when ChatGPT changes

3. **No Timestamps**: ChatGPT doesn't show times
   - Using sequential order
   - No time-based features yet

### Future Improvements (Planned)

- Better quote detection (AI-based matching?)
- Export command history (JSON/Markdown)
- Keyboard shortcuts (J/K navigation?)
- Command favorites/bookmarks
- Statistics dashboard
- Multi-conversation support
- Custom themes

---

**Version**: 0.1  
**Release Date**: 2026-02-08  
**Author**: Howard (Hao Zhong)  
**Status**: Stable, ready for use
