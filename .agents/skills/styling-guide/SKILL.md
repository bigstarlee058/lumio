---
name: styling-guide
description: Comprehensive guidelines for the Finflow design system, prioritizing a professional LinkedIn-inspired aesthetic.
---

# Finflow Professional Styling Guide (LinkedIn Aesthetic)

This guide defines the visual language and implementation rules for the Finflow platform. All new components and modifications must strictly adhere to these principles to maintain a premium, professional, and consistent user experience.

## 1. Core Philosophy: The LinkedIn Aesthetic
Finflow is built for financial clarity and professional trust. Our design draws heavy inspiration from LinkedIn's minimalist, clean, and accessibility-focused interface.

- **Professionalism over Playfulness**: Use clean lines, subtle transitions, and a restrained color palette.
- **Content is King**: The UI should never distract from the financial data.
- **Sleek Minimalism**: Avoid heavy shadows, excessive gradients, or loud colors.

## 2. Color Palette
The colors are derived from professional fintech standards.

| Token | Value | Usage |
| :--- | :--- | :--- |
| **Primary** | `#0a66c2` | Principal actions, branding, active states, links. |
| **Primary Hover** | `#004182` | Hover states for primary buttons/links. |
| **Background** | `#f3f2ef` | Global page background (LinkedIn Grey). |
| **Surface/Card** | `#ffffff` | Content containers, cards, navigation bars. |
| **Border** | `#e0e0e0` | Subtle dividers, input borders, card outlines. |
| **Text Primary** | `#191919` | Main headings, body text, high-contrast labels. |
| **Text Secondary**| `#666666` | Descriptions, timestamps, less important metadata. |

## 3. Iconography Rules
**CRITICAL**: Use outline-style icons only. High-fidelity stroke icons provide a lighter, more modern feel.

- **Library**: Lucide-React.
- **Style**: Stroke only (`fill="none"`).
- **Exceptions**: Use filled icons *only* for specific binary states (e.g., a "Favorited" star, a "Selected" radio button).
- **Stroke Width**: Default to `2` for a balanced look.
- **Colors**: Use `muted-foreground` (`#666666`) for general icons, and `primary` (`#0a66c2`) only for active navigation or highlighted items.

## 4. Components & Components Styling

### Buttons
Buttons should feel solid and clickable without being bulky.
- **Primary Button**: 
  - Background: `#0a66c2`
  - Text: White (`#ffffff`)
  - Border: None
  - Hover: Background `#004182`
  - Shape: Rounded (typically 24px or 50% height for pill-shape) or moderate radius (8px).
- **Secondary/Outline Button**:
  - Border: 1px solid `#0a66c2`
  - Text: `#0a66c2`
  - Hover: Subtle primary background (`rgba(10, 102, 194, 0.1)`).

### Cards
Cards are the primary building block for data.
- **Background**: White (`#ffffff`).
- **Border**: Thin 1px border (`#e0e0e0`). Do **not** use heavy shadows.
- **Interactions**: On hover, use a very subtle elevation (shadow) or a slight border-color change to `#d1d1d1`.

### Navigation & Headers
- **Global Header**: Sticky, white background, blur effect (`backdrop-blur`).
- **Navigation Items**: 
  - Active: Small 2px bottom border with the Primary color (`#0a66c2`).
  - Font: Semi-bold for active, Medium for inactive.

## 5. Typography
- **Primary Typeface**: Sans-serif (prefer "Nunitoga", system-ui, or Inter).
- **Logo Style**: 
  - Font: Nunitoga
  - Size: 20px
  - Weight: 700 (Bold)
  - Letter Spacing: 3.5px
  - Transform: UPPERCASE
  - Color: `#0a66c2`

## 6. Layout & Spacing
- **Global Padding**: Use a standard container max-width with responsive horizontal padding (typically 16px to 24px).
- **Background Integrity**: Use the LinkedIn background color (`#f3f2ef`) for all main page views to make white cards "pop".
- **Density**: Maintain a comfortable white space ratio. Financial data needs room to breathe.

---

*Always verify your changes against these rules. If a requested design contradicts these principles, prioritize the LinkedIn aesthetic for consistency.*
