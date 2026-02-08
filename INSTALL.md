# Quick Installation Guide

## 🎯 3-Step Installation

### Step 1: Icons (Already Done!)

PNG icons are already generated:
- ✓ `icon16.png` (16x16)
- ✓ `icon48.png` (48x48)
- ✓ `icon128.png` (128x128)

Skip to Step 2!

### Step 2: Load Extension

1. Open Chrome browser
2. Go to: `chrome://extensions/`
3. Enable "**Developer mode**" (top right toggle)
4. Click "**Load unpacked**"
5. Select this folder: `20260208-Chatgpt_Extension`
6. Done!

### Step 3: Test

1. Visit https://chat.openai.com/
2. Start a conversation (send a few messages)
3. Check if navigation sidebar appears on right
4. Click a command number to test jump
5. Try quoting a ChatGPT response to see reference tracking

## 🎨 What You'll See

After successful installation:

```
ChatGPT page with sidebar on right
┌─────────────────┐
│ 📑 Command Nav  │ ← Header
│ [Search...]  ✕  │ ← Search box
│ 15 commands     │ ← Stats
│                 │
│ ┌─────────────┐ │
│ │ ① Command 1 │ │ ← Click to jump
│ └─────────────┘ │
│                 │
│ ┌─────────────┐ │
│ │ ② Command 2 │ │
│ │   ↩ Quotes  │ │ ← Reference badge
│ └─────────────┘ │
│                 │
│ ┌─────────────┐ │
│ │ ③ Command 3 │ │
│ └─────────────┘ │
└─────────────────┘
```

## 🔍 Features to Test

### 1. Command Index
- Send several messages
- Each appears in sidebar with number
- Click any number to jump to that message
- Message highlights with blue pulse

### 2. Response Quote Tracking
**How to test:**
1. Get a response from ChatGPT
2. Use ChatGPT's quote feature (hover over response, click quote icon)
3. Send your new message with the quote
4. Your new command shows:
   - Purple left border
   - "↩ Quotes previous response" badge
5. Click it to see both messages highlighted

### 3. Search
- Type keywords in search box
- Matching commands stay visible
- Others hidden
- Stats update to "N / Total commands"
- Click ✕ to clear

### 4. Collapse/Expand
- Click ◀ to collapse sidebar
- 40px vertical tab remains visible
- Click tab (anywhere on it) to expand
- Or click ▶ button to expand

### 5. Highlight Effect
- Click any command
- Page scrolls smoothly
- Message pulses blue for 2 seconds
- If it quotes a response, that pulses purple too

## 🐛 Troubleshooting

### Sidebar Not Showing

**Solution 1: Refresh**
- Refresh ChatGPT page (F5)
- Or start new conversation

**Solution 2: Check Console**
- Open DevTools (F12)
- Look for "ChatGPT Command Navigator initialized"
- Check for errors

**Solution 3: Verify URL**
- Must be `chat.openai.com` or `chatgpt.com`
- Doesn't work on other domains

### Quote Not Detected

**This is normal if:**
- You typed the quote manually (not using ChatGPT's quote button)
- The quote is very short (< 20 characters)
- Detection is simplified in v0.1

**To improve detection:**
- Use ChatGPT's native quote feature
- Quote longer text snippets (> 30 characters)

### Search Not Working

- Make sure search box is focused
- Try clicking in box then typing
- Check for input method issues
- Click ✕ to clear and try again

### Sidebar Won't Expand

- Make sure you're clicking the vertical tab
- Try clicking the ▶ button specifically
- Check if browser zoom is affecting layout

## 🎨 Customization

### Change Sidebar Width

Edit `sidebar.css` line ~6:

```css
#chatgpt-navigator-sidebar {
  width: 320px;  /* Change to 400px, etc. */
}
```

### Change Colors

Edit `sidebar.css`:

```css
/* Command number color */
.nav-item-number {
  background: #3b82f6;  /* Change here */
}

/* Quote indicator color */
.nav-item.has-reference {
  border-left-color: #8b5cf6;  /* Change here */
}
```

### After Editing

1. Go to `chrome://extensions/`
2. Click refresh button on extension
3. Refresh ChatGPT page
4. Changes applied!

## ✅ Success Indicators

✓ Extension shows in `chrome://extensions/`  
✓ Sidebar appears on ChatGPT  
✓ Commands appear when you send messages  
✓ Clicking commands scrolls to message  
✓ Search filters commands  
✓ Collapsed sidebar shows vertical tab  
✓ Quote detection shows purple border  

## 🆘 Still Having Issues?

1. **Check README.md** for full documentation
2. **Inspect Console** for errors (F12)
3. **Verify URL** is chat.openai.com or chatgpt.com
4. **Disable other extensions** to test conflicts
5. **Clear cache** and reload page

## 🚀 Next Steps

After installation:

1. **Use regularly**: Build your command index over time
2. **Test quoting**: Use ChatGPT's quote feature to see tracking
3. **Try search**: Find old commands quickly
4. **Customize**: Adjust colors/width to your preference
5. **Provide feedback**: Report bugs or suggest features

---

**Need Help?**
- See README.md for detailed docs
- Check browser console for errors
- Ensure correct ChatGPT URL

**Enjoying it?**
- Share with friends!
- Provide feedback for improvements
- Star the project (if on GitHub)

---

Happy navigating! 🎉
