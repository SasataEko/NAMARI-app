---
name: Warm Editorial Flat
colors:
  surface: '#fbf9f2'
  surface-dim: '#dcdad3'
  surface-bright: '#fbf9f2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f4ed'
  surface-container: '#f0eee7'
  surface-container-high: '#eae8e1'
  surface-container-highest: '#e4e2dc'
  on-surface: '#1b1c18'
  on-surface-variant: '#4e4632'
  inverse-surface: '#30312c'
  inverse-on-surface: '#f3f1ea'
  outline: '#807660'
  outline-variant: '#d1c5ab'
  surface-tint: '#745b00'
  primary: '#745b00'
  on-primary: '#ffffff'
  primary-container: '#f5c400'
  on-primary-container: '#685200'
  inverse-primary: '#f1c100'
  secondary: '#b70e3a'
  on-secondary: '#ffffff'
  secondary-container: '#da3051'
  on-secondary-container: '#fffbff'
  tertiary: '#005ac2'
  on-tertiary: '#ffffff'
  tertiary-container: '#b3caff'
  on-tertiary-container: '#0051af'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffe08b'
  primary-fixed-dim: '#f1c100'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#584400'
  secondary-fixed: '#ffdadb'
  secondary-fixed-dim: '#ffb2b7'
  on-secondary-fixed: '#40000e'
  on-secondary-fixed-variant: '#91002b'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a41'
  on-tertiary-fixed-variant: '#004494'
  background: '#fbf9f2'
  on-background: '#1b1c18'
  surface-variant: '#e4e2dc'
typography:
  headline-xl:
    fontFamily: Noto Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Noto Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Noto Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Noto Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Noto Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 17px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Noto Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1.25rem
  margin-lg: 1.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system expresses a refined Japanese editorial sensibility merged with tactile stationery metaphors. The emotional signature is calm, organized, and playful—evoking the tactility of curated paper goods, custom stationery folders, and contemporary Tokyo print magazines. The aesthetic rejects harsh black comic book outlines and heavy brutalist strokes entirely. Instead, depth and categorization are achieved through pure solid color blocks, precise silhouette geometries (scalloped folder tabs, organically contoured conversation speech forms, and die-cut sheet cards), and generous typographic negative space.

The target audience seeks deliberate daily organization, expressive visual note-taking, and intuitive messaging wrapped in an art-directed, serene container. Surfaces sit upon warm oatmeal grounds, creating an atmosphere that feels physical yet ultra-modern and weightless.

## Colors

The palette is anchored by warm oatmeal paper neutrals that form the foundational canvas. Content hierarchy is achieved by color-blocking through a distinct family of five solid accent tones: Lemon Yellow (`#F5C400`), Crimson Rose (`#E73A59`), Sky Blue (`#3A86FF`), Lavender Lilac (`#C4B5FD`), and Mint Green (`#38D399`). These flat color blocks serve as semantic containers, folder tabs, or expressive message nodes.

Text contrast uses deep sumi ink tones (`#191919` for primary headings, `#5A5852` for secondary metadata) rather than pure digital black, preserving the tactile paper character. Overlays, cards, and bottom navigation bars utilize crisp off-white (`#FFFFFF`) or cream parchment (`#F3F1E8`) to float seamlessly above the base neutral canvas (`#F7F5EE`). For dark surfaces or editorial callout states, a rich matte charcoal (`#141414`) replaces the canvas while retaining vivid saturated container accents.

## Typography

Typography pairs geometric clarity with soft, humanistic proportions. Noto Sans handles titles, interface labels, and editorial prose, pairing seamlessly alongside Japanese Gothic counterparts. 

Title sizes feature tight tracking (`-0.02em` to `-0.03em`) and heavy weights (`700` and `800`) to evoke contemporary poster design. In dense body interactions, weight drops to `500` with open line heights to maximize readability over solid color fills. Labels and metadata adopt uppercase or tight bold tracks for scannable information chunking.

## Layout & Spacing

The layout is built upon an 8pt modular rhythm adapted for a fluid single-column mobile experience expanding to a multi-column modular grid on wider surfaces. Edge margins default to `1.25rem` (20px), ensuring tactile cards rest comfortably inside viewport edges with breathing space.

Grid cards (such as folder tiles or media clusters) use a strict 2-column or 3-column distribution with `1rem` gutters. Vertical flow emphasizes clustered grouping: associated items sit close (`0.5rem` to `1rem` gap), while categorical shifts introduce generous breathing space (`1.5rem` to `2rem`). Section modules float without horizontal border dividers, using negative space and pure tonal contrasts to partition layout regions.

## Shapes

The design language favors large organic curvatures, soft folder silhouettes, and generous pill radiuses. Standard rectangular enclosures are replaced with intentional die-cut forms:
- **Folder Shapes:** Flat cards featuring an asymmetrical scooped top edge (`clip-path` or SVG-defined tab notches), creating the distinct stationery folder silhouette.
- **Organic Speech Bubbles:** Chat nodes shaped with smooth fluid bulges and asymmetrical corner radiuses (e.g., `28px 28px 8px 28px` or undulating cloud-like curves).
- **Control Radiuses:** Interactive chips, filter pills, pill badges, and floating bottom navigation shells consistently adopt complete pill radii (`9999px`).

## Components

### Buttons & Action Controls
- **Primary Buttons:** High-contrast pill containers (`border-radius: 9999px`) in solid sumi black (`#191919`) with warm white text, or vibrant accents (Rose or Sky Blue). No borders or gradient fills.
- **Icon / Auxiliary Buttons:** Off-white or muted oatmeal pills (`#ECEAE0`) hosting minimalist mono-line glyphs.

### Cards & Stationery Folders
- **Folder Modules:** Flat saturated fill blocks (Lemon, Mint, Rose, Lavender, Blue). The front facade houses a low scooped pocket cutout where internal document thumbnails peek out from behind. Content labels sit left-aligned in sumi black or dark tones with count badges placed alongside.
- **Editorial Text Cards:** White or cream containers floating on oatmeal backdrops with `24px` rounded corners, zero borders, and subtle ambient shadows (`rgba(0,0,0,0.03)`).

### Interactive Chips & Status Badges
- Compact pill-shaped counters (`height: 24px` to `28px`) rendered in solid black, deep charcoal, or high-contrast tints with bold, tight typography.

### Input Fields & Search Bars
- Recessed pill fields styled in `#EDEAE1` or crisp `#FFFFFF` with no outer border strokes. Placeholder text set in warm stone gray (`#8A877E`).

### Floating Bottom Navigation Bar
- A detached floating pill container centered above the bottom safe area. Styled in semi-translucent crisp white (`rgba(255, 255, 255, 0.85)` with `backdrop-filter: blur(16px)`), holding flat icon tabs and an elevated circular black active pill indicator.