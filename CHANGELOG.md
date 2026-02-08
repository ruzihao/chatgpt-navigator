# Changelog

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
