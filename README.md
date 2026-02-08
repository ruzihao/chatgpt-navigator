# ChatGPT Command Navigator

Create smart navigation index for ChatGPT conversations with reference tracking, search and quick jump.

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
**Date**: 2026-02-08  
**Version**: 0.1
