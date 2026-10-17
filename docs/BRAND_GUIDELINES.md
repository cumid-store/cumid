# CUMID (cumid.store) — Brand Identity & Design Guidelines

## 1. Brand Essence & Tone
CUMID is an Indian personality stationery brand dedicated to square pocket diaries with spiral binding along the top edge.
- **Brand Tone**: Calm, thoughtful, playful, and professional.
- **Visual Feel**: Warm, tactile, generous whitespace, crisp modern typography, and restrained motion.

---

## 2. Colour Palette & Accessibility Contrast

All colours have been adjusted to exceed **WCAG 2.2 Level AA / AAA** contrast requirements against backgrounds. Pale pastel accent colours are **never** used for small body text.

| Colour Name | Hex Code | Role | Contrast Ratio vs Ivory (`#F7F4EF`) |
| :--- | :--- | :--- | :--- |
| **Warm Ivory** | `#F7F4EF` | Primary Background | Base |
| **Deep Charcoal** | `#252321` | Primary Text & Wordmark | **14.2:1 (AAA Pass)** |
| **Charcoal Muted** | `#4D4844` | Secondary Text & Borders | **8.1:1 (AAA Pass)** |
| **Lavender Dark** | `#62537D` | Interactive Links & Buttons | **5.3:1 (AA Pass)** |
| **Muted Lavender** | `#A69ABB` | Accent Badges & Coil Accents | Decorative / Badges |
| **Lavender Soft** | `#EBE6F2` | Tinted Card Backdrops | Background container |
| **Sage Dark** | `#5A6353` | Botanical Headings | **5.4:1 (AA Pass)** |
| **Sage Tint** | `#F4F6F3` | Floral Tile Background | Background container |
| **Peach Dark** | `#8C5943` | Cute / Warm Accents | **5.2:1 (AA Pass)** |
| **Peach Tint** | `#FBF8F5` | Cute Tile Background | Background container |

---

## 3. Logo Suite & Assets

All master vector assets are located in `public/brand/`:

```
public/brand/
├── logo-mark.svg         # Compact "C" symbol (inspired by top spiral & page corner)
├── logo-wordmark.svg     # Primary CUMID wordmark in deep charcoal
├── logo-horizontal.svg   # Primary horizontal lockup (Symbol + Wordmark + Pocket Diaries)
├── logo-dark.svg         # Inverted horizontal logo (Warm ivory on dark backdrops)
├── logo-light.svg        # Standard light background lockup
├── favicon.svg           # High-contrast 64x64 favicon
└── og-image.svg          # 1200x630 social sharing card
```

### The Compact "C" Symbol
- Inspired by the physical mechanics of a pocket diary:
  - Three top-spiral coil punch rings across the upper horizontal arm.
  - Smooth ambidextrous curve forming the letterform "C".
  - Subtle folded page corner notch at the lower terminal.
- **Minimum Size**: $24 \times 24$ pixels (digital) or $8 \times 8$ mm (print).

### Primary Horizontal Lockup
- Comprises the compact "C" symbol on the left, the custom geometric "CUMID" wordmark, and the uppercase tracking subscript "POCKET DIARIES".
- **Minimum Width**: 140 pixels (digital) or 35 mm (print).
- **Clear Space**: Maintain a clear boundary around the logo equal to the height of the letter "C" (minimum $12\text{px}$).

---

## 4. Typography Hierarchy

1. **Headings & Display**: `Plus Jakarta Sans`, sans-serif (Weights: 600, 700, 800)
   - Tight letter-spacing (`tracking-tight`, $-0.02\text{em}$) for confident, architectural headlines.
2. **Body & Interface**: `Inter`, sans-serif (Weights: 400, 500, 600)
   - Relaxed line-height ($1.6$) and comfortable line lengths (60–75 characters max) for effortless reading.
3. **Editorial & Literary Quotes**: `Newsreader`, serif (Weight: 400 italic)
   - Used sparingly for journal excerpts and pull-quotes.

---

## 5. Do's and Don'ts

### Do:
- ✅ Use generous whitespace around diary covers.
- ✅ Always label digital artwork mockups with **"Design preview"**.
- ✅ Keep the top spiral binding visibly centered and prominent.
- ✅ Maintain high contrast charcoal text against warm ivory backgrounds.

### Don't:
- ❌ Do not distort, rotate, or stretch the logo lockups.
- ❌ Do not use generic AI sparkles or intricate floral vines inside the letters.
- ❌ Do not use pale lavender (`#A69ABB`) for body copy text.
- ❌ Do not invent manufacturer claims or sustainability badges without verification.
