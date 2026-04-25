# ChatGPT Command Navigator

Create smart navigation index for ChatGPT conversations with reference tracking, search and quick jump.

> **What's new in v0.2** — full Excerpt workflow: select any text → save → drag to reorder → Insert / Summarize back into ChatGPT, or export as Markdown / HTML / clipboard. See the [Excerpts](#-excerpts-new-in-v02) section below or the [CHANGELOG](CHANGELOG.md#02---2026-04-25).

## ✨ Features

### 📑 Smart Command Index
- Automatically extract all commands (prompts) you sent in current conversation
- Display in sidebar list
- Click any command to jump to that position instantly
- Sequential numbering for easy reference

### 🔗 Response Quote Tracking
- **Detect when you quote ChatGPT's responses** in your new prompts
- Visual indicator: purple left border for prompts that quote responses
- Badge shows "↩ Quotes previous response"
- Click to highlight both your prompt and the quoted response
- Helps track conversation context and follow-ups

### 🔍 Search & Filter
- Real-time search across your command history
- Highlight matching results
- Show search statistics (N / Total)
- Quickly find specific commands

### 🎨 Modern UI
- 🌓 Automatic dark mode support
- 📱 Responsive design
- ◀▶ Collapsible sidebar with visible tab when collapsed
- 💫 Smooth animations
- 🎯 Clean, distraction-free interface

### ✏️ Excerpts (new in v0.2)

A full "research → integrate → re-ask" workflow built on top of the navigator.

**Capture**
- Select any text on the page → a gradient **Excerpt** button appears next to the selection
- One click saves it to the new **Excerpts** tab (per-conversation, persisted in localStorage)
- Excludes the sidebar itself and ChatGPT's input box; ignores selections shorter than 2 characters

**Organize**
- Each excerpt: checkbox, role badge (A / U), creation time, 3-line preview + "more" expand, copy / delete icons
- **Drag to reorder** any excerpt — gradient drop indicator shows insertion point
- 3-state **All** toggle (none / some / all) and red-on-hover **Clear** button
- Per-conversation isolation; switching conversations swaps the list automatically

**Send back to ChatGPT** (bottom toolbar)
- **Insert** — fill numbered list `1. "..." 2. "..."` into the input (no auto-send)
- **Summarize** — fill an integration prompt + numbered excerpts and **auto-click send**. The prompt explicitly asks ChatGPT to weave the excerpts into a unified summary (not item-by-item) and respond in the source language
- **Append-not-overwrite** — if you've already typed a draft, the payload is appended after `\n\n`; your draft is preserved

**Export**
- **Copy** to clipboard (numbered list, same format as Insert)
- **Markdown** — download `.md` with frontmatter (export time, conversation ID, source URL, count) + blockquote per item
- **HTML** — download self-contained styled `.html` (gradient title, card layout, dark/print media queries)
- Filename: `zNavi_excerpts_YYYYMMDD_HHMM.{md,html}`

**Privacy** — every excerpt lives in your browser's localStorage. Nothing is sent to any server.

## 🚀 Installation

### Quick Install (3 Steps)

1. **Download Extension**
   - Get the `20260208-Chatgpt_Extension` folder

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the extension folder

3. **Test**
   - Visit https://chat.openai.com/
   - Start a conversation
   - See the navigation sidebar on the right!

## 📖 Usage

1. Visit ChatGPT (chat.openai.com or chatgpt.com)
2. Navigation sidebar appears automatically
3. Send messages - they appear in the sidebar list
4. When you quote a previous ChatGPT response:
   - Your new prompt gets a purple left border
   - Shows "↩ Quotes previous response" badge
5. Click any command to jump to it and see context

### Interface Controls

- **Collapse sidebar**: Click ◀ button
- **Expand sidebar**: Click ▶ button OR click the vertical tab
- **Search**: Type keywords in search box
- **Clear search**: Click ✕ button
- **Jump to command**: Click any numbered command
- **See quoted response**: Click a command with ↩ badge

## 🎨 Interface Preview

```
┌───────────────────────────────┐
│ 📑 Command Navigator      ◀  │
├───────────────────────────────┤
│ [Search commands...]      ✕  │
├───────────────────────────────┤
│ 15 commands                   │
├───────────────────────────────┤
│ ┌─────────────────────────┐  │
│ │ ① Help me analyze this  │  │
│ │   data...               │  │
│ └─────────────────────────┘  │
│                               │
│ ┌─────────────────────────┐  │
│ │ ② Can you explain the   │  │
│ │   results...            │  │
│ │   ↩ Quotes previous...  │  │ ← Quoted response
│ └─────────────────────────┘  │
│                               │
│ ┌─────────────────────────┐  │
│ │ ③ Create a summary...   │  │
│ └─────────────────────────┘  │
└───────────────────────────────┘
```

### When Collapsed

```
                              ┌┐
                              ││
                              │▶│ ← Click to expand
                              ││
                              │r│
                              │o│
                              │t│
                              │a│
                              │v│
                              │i│
                              │g│
                              │a│
                              │N│
                              └┘
```

## 🔧 Technical Details

### Reference Detection

The extension detects when you quote ChatGPT's previous responses:

- Looks for `<blockquote>` or quote-styled elements in your prompts
- Searches backward through conversation to find quoted response
- Creates visual link between your prompt and the quoted response
- Highlights both when you click the prompt

**Note:** Detection works best when you use ChatGPT's built-in quote feature.

### DOM Selectors

Core selectors:
```javascript
// User messages (your prompts)
[data-message-author-role="user"]

// Assistant responses (ChatGPT)
[data-message-author-role="assistant"]

// Quoted content
blockquote, [class*="quote"], [class*="cited"]
```

**Important:** May need adjustment if ChatGPT updates their DOM structure.

## 🛠️ Development

### File Structure

```
20260208-Chatgpt_Extension/
├── manifest.json          # Extension config
├── content.js            # Core logic (~10KB)
├── sidebar.css           # Styles (~7KB)
├── icons/                # PNG icons (16, 48, 128)
├── README.md             # This file
├── INSTALL.md            # Installation guide
└── CHANGELOG.md          # Version history
```

### Core Class

```javascript
class ChatGPTNavigator {
  extractExistingMessages()  // Extract all user prompts
  extractQuotedResponse()    // Detect quoted responses
  buildReferenceTree()       // Build quote relationships
  renderMessages()           // Render command list
  filterMessages()           // Search/filter
  scrollToMessage()          // Jump to message
  highlightMessage()         // Highlight effect
}
```

### Configuration

Currently no user-configurable settings. Future versions may add:
- Custom keyboard shortcuts
- Theme colors
- Reference detection sensitivity

## 🐛 Known Limitations

1. **Quote Detection**: Simplified implementation
   - Works best with ChatGPT's native quote feature
   - May not catch all manual quotes
   - Will be improved in future versions

2. **DOM Dependency**: Relies on ChatGPT's structure
   - May break if ChatGPT updates their DOM
   - Easy to fix by updating selectors

3. **No Timestamps**: ChatGPT doesn't expose message times
   - Using sequential order instead
   - No time-based filtering yet

## 📝 Changelog

### v0.2 (2026-04-25)
- ✏️ **Excerpt workflow** — floating "Excerpt" button on text selection
- 📋 New **Excerpts** tab with per-conversation storage + drag-to-reorder
- 📥 **Insert** / **Summarize** back into ChatGPT input (Summarize uses an integration prompt and auto-sends)
- 🪶 **Append-not-overwrite** — preserves any draft already in the input
- 🗂 Export selected excerpts as **Copy** / **Markdown** / **HTML**
- ✅ Modern custom-rendered checkboxes (gradient fill, indeterminate state)
- 🎛 Restructured action toolbar: utility row at top, output groups at bottom
- 🐛 Fixed drop indicator on the dragged item itself; toolbar wraps on narrow widths

See [CHANGELOG.md](CHANGELOG.md#02---2026-04-25) for full details.

### v0.1 (2026-02-08)
- ✨ Initial release
- 📑 Command index with sequential numbering
- 🔗 **Response quote tracking** (not prompt-to-prompt)
- 🔍 Search and filter
- 💫 Jump and highlight effects
- 🌓 Dark mode support
- ◀▶ Collapsible sidebar with persistent tab
- 🌍 English interface

### Removed from Earlier Versions
- ❌ Topic detection (removed - not useful)
- ❌ Topic titles (removed with topic feature)
- ❌ Topic fold/unfold (removed with topic feature)

## 🤝 Contributing

Issues and Pull Requests welcome!

Possible improvements:
- Better quote detection algorithm
- Export command history
- Keyboard shortcuts
- Command favorites/bookmarks
- Statistics dashboard
- Multi-conversation support

## 📄 License

MIT License

## 🙏 Credits

Thanks to ChatGPT for inspiration and assistance!

---

**Author**: Howard (Hao Zhong)  
**Latest version**: 0.2 (2026-04-25)  
**Initial release**: 0.1 (2026-02-08)
