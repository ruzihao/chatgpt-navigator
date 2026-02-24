# Icons Folder

## 📦 Required Icon Files

This extension needs 3 PNG icons (✓ already generated):

- ✅ `icon16.png` - 16x16 pixels (toolbar display)
- ✅ `icon48.png` - 48x48 pixels (extension management page)
- ✅ `icon128.png` - 128x128 pixels (Chrome Web Store)

## 🎨 How to Regenerate

If you want to customize the icon:

### Method 1: Use Python Script (Recommended)

```bash
cd icons/
python3 generate_icons.py
```

This will regenerate all three PNG files from the design in the script.

### Method 2: Edit SVG and Convert

1. Edit `icon.svg` with your preferred design
2. Use online converter: https://www.favicon-generator.org/
3. Upload `icon.svg`
4. Download generated PNGs
5. Rename to `icon16.png`, `icon48.png`, `icon128.png`

### Method 3: Command Line (ImageMagick)

If you have ImageMagick installed:

```bash
convert -background none -size 128x128 icon.svg icon128.png
convert -background none -size 48x48 icon.svg icon48.png
convert -background none -size 16x16 icon.svg icon16.png
```

### Method 4: Design Tools

Use Photoshop, GIMP, Figma, etc.:
1. Open `icon.svg`
2. Export as PNG at 16x16, 48x48, 128x128
3. Save to this folder

## 📐 Current Design

The `icon.svg` and generated PNGs feature:
- 🔵 Blue circular background (#3B82F6 - brand color)
- 📄 White document icon (represents conversation)
- 📋 Blue list area with white items (represents command index)
- 📍 Items with indentation (represents topic hierarchy)
- 🔍 Search icon (only visible at larger sizes)

## ✏️ Customization Tips

If you want to customize the design:

**For Simple Color Change:**
Edit `generate_icons.py` and change the color values:
```python
# Line ~13
fill=(59, 130, 246, 255)  # Change RGB values
```

**For Complete Redesign:**
1. Keep it simple (icons are small)
2. Use high contrast colors
3. Avoid fine details (won't show at 16x16)
4. Test at actual size (especially 16x16)
5. Use a single dominant color

**Design Guidelines:**
- Clear at small sizes (16x16 is tiny!)
- Recognizable at a glance
- Matches the extension's function
- Stands out from other extensions

## ✅ After Regenerating

Once you regenerate icons:

1. Go to `chrome://extensions/`
2. Click refresh button on the extension
3. Icons will update automatically
4. Check all sizes look good

## 🚀 Quick Start (Skip Icons)

**Good news:** You can use the extension without custom icons!

- Icons are already generated and ready to use
- No need to regenerate unless you want to customize
- The extension works perfectly with the default icons provided

---

**Remember:** Icons are already generated and ready. You only need to regenerate if you want to customize the design!
