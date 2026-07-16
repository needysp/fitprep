---
name: Aura
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#55433d'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#88726c'
  outline-variant: '#dbc1b9'
  surface-tint: '#99462a'
  primary: '#99462a'
  on-primary: '#ffffff'
  primary-container: '#d97757'
  on-primary-container: '#541400'
  inverse-primary: '#ffb59e'
  secondary: '#5f5e5c'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfdc'
  on-secondary-container: '#636260'
  tertiary: '#615e5a'
  on-tertiary: '#ffffff'
  tertiary-container: '#95918d'
  on-tertiary-container: '#2c2a27'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59e'
  on-primary-fixed: '#390b00'
  on-primary-fixed-variant: '#7a2f15'
  secondary-fixed: '#e5e2df'
  secondary-fixed-dim: '#c8c6c3'
  on-secondary-fixed: '#1c1c1a'
  on-secondary-fixed-variant: '#474745'
  tertiary-fixed: '#e7e2dd'
  tertiary-fixed-dim: '#cac6c1'
  on-tertiary-fixed: '#1d1b19'
  on-tertiary-fixed-variant: '#494643'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  xxl: 80px
  container-max: 1120px
  gutter: 24px
---

## Brand & Style

This design system is built on the principles of **Calm Minimalism**. It seeks to reduce cognitive load by utilizing a "bleached" aesthetic—high-key values, expansive whitespace, and a sophisticated, airy atmosphere. The personality is intellectual, professional, and helpful, mirroring the experience of a thoughtful dialogue.

The style blends **Minimalism** with subtle **Tonal Layering**. It avoids harsh lines and heavy containers in favor of soft transitions and breathing room. The emotional response is one of clarity and focus, positioning the product as a dependable tool for deep work and clear communication.

## Colors

The palette is anchored by "Paper" and "Parchment" tones rather than pure digital whites to create a more organic, readable experience.

- **Primary (Apricot):** `#D97757` is used sparingly for call-to-action buttons, active states, and critical highlights. It is a desaturated, sophisticated orange that feels human rather than aggressive.
- **Backgrounds:** The primary interface surface uses `#FBF9F7`. Secondary surfaces (sidebars, secondary panels) use `#F4F0EB`.
- **Neutrals:** Typography is rendered in `#1A1A1A` for high contrast, while secondary text uses `#6B6B6B`.
- **Accents:** Use a very light tint of the primary color (`#FFF1E9`) for hover states on subtle interactive elements.

## Typography

This design system utilizes **Inter** across all levels to maintain a systematic, utilitarian, and clean appearance. 

The typographic hierarchy relies on generous line heights (1.6 for body text) to enhance readability and contribute to the "airy" feel. Headlines use a slightly tighter letter spacing and heavier weights to provide a clear structural anchor for the page. For mobile devices, display and large headline sizes are reduced to ensure they do not overwhelm the smaller viewport.

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid Hybrid**. Content is typically centered within a max-width container (1120px) to keep line lengths readable for text-heavy interfaces. 

- **Grid:** A 12-column grid is used for desktop with a 24px gutter. 
- **Rhythm:** Spacing follows a 4px baseline, but the system leans heavily on `xl` (48px) and `xxl` (80px) gaps between major sections to maintain the minimalist "bleached" aesthetic.
- **Mobile:** Margins shrink to 16px. Elements that are side-by-side on desktop generally stack vertically on mobile to maintain white space.

## Elevation & Depth

Depth is communicated through **Soft Ambient Shadows** and **Tonal Layering** rather than heavy borders.

- **Level 0 (Base):** The main background (`#FBF9F7`).
- **Level 1 (Cards/Floating Elements):** White (`#FFFFFF`) surfaces with a very soft, diffused shadow: `0 4px 20px rgba(0, 0, 0, 0.04)`.
- **Level 2 (Modals/Popovers):** White surfaces with a more pronounced but still light shadow: `0 12px 40px rgba(0, 0, 0, 0.08)`.
- **Interactions:** Hovering over a card should not typically increase shadow depth, but rather subtly shift the background color or provide a fine 1px border in the secondary color.

## Shapes

The design system uses a consistent **Rounded** language to soften the professional tone and make the interface feel more approachable.

- **Standard Elements:** Buttons, input fields, and small cards use an 8px (`0.5rem`) radius.
- **Large Elements:** Large containers and featured sections use a 16px (`1rem`) radius.
- **Full Rounding:** Progress bars, tags, and search inputs may use a pill-shape (circular ends) to differentiate them from structural layout elements.

## Components

### Buttons
- **Primary:** Filled with the primary apricot color, white text, 8px radius. 
- **Secondary:** Transparent background with a fine `#EAE5E0` border and primary color text.
- **Ghost:** No background or border, primary color text. Used for low-emphasis actions.

### Input Fields
Inputs should feel integrated. Use a white background with a 1px border in `#EAE5E0`. On focus, the border transitions to the primary apricot color with a subtle 2px outer glow of the same color at 10% opacity.

### Cards
Cards are white with an 8px or 16px radius. They should not have borders unless they are used on a white background, in which case a `#F4F0EB` border is used for definition.

### Lists & Navigation
Navigation items use `label-md`. The active state is indicated by a subtle apricot indicator line (2px wide) or by changing the text color to the primary accent. Avoid background highlights for nav items unless they are mobile-only patterns.

### Chips & Tags
Tags are used for categorization. They feature a light parchment background (`#F4F0EB`) and neutral text, using a fully rounded (pill) shape to distinguish them from buttons.