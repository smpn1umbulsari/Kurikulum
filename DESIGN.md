---
name: SIKAD v4.0 Design System
description: Visual guidelines and tokens for SIKAD v4.0 academic administration.
colors:
  primary: "#356EFF"
  primary-dark: "#1D4ED8"
  primary-light: "#EEF4FF"
  neutral-bg: "#F9FAFB"
  neutral-text: "#111827"
  neutral-border: "#E5E7EB"
  success: "#22C55E"
  warning: "#F59E0B"
  danger: "#EF4444"
typography:
  display:
    fontFamily: "Inter, Segoe UI, sans-serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: "1.2"
  body:
    fontFamily: "Inter, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: "1.5"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
  card:
    backgroundColor: "#FFFFFF"
    rounded: "{rounded.lg}"
---

# Design System: SIKAD v4.0

## 1. Overview

**Creative North Star: "The Administrative Control Center"**

SIKAD v4.0 is a highly structured, data-centric interface designed to serve school administrators under high workload and cognitive stress. It prioritizes layout density, readability, and speed. The visual system features clean borders, light background canvases, and high-contrast tables. It rejects colorful, decorative gradients and over-rounded borders in favor of a clean Notion-meets-Supabase Studio aesthetic.

**Key Characteristics:**
* Light backgrounds for day-to-day administrative reading.
* 4px grid spacing system with comfortable form inputs.
* Prominent, high-contrast, scrollable data tables.
* Snappy transitions (under 250ms) for high efficiency.

## 2. Colors

The SIKAD color system uses clean academic blues alongside soft neutral grays to emphasize data without visual clutter.

### Primary
* **Academic Blue** (#356EFF): The primary accent color for active navigation tabs, main primary action buttons, and highlighted selections.
* **Deep Royal Blue** (#1D4ED8): Used for hover states on primary buttons.
* **Light Blue Tint** (#EEF4FF): Used for background callouts, active indicators, and table hover highlights.

### Neutral
* **Canvas Light** (#F9FAFB): The default body canvas background.
* **Pure Ink** (#111827): Used for primary text, ensuring excellent readability against light backgrounds.
* **Border Gray** (#E5E7EB): The default color for dividers, tables, and card outlines.

### Named Rules
**The 10% Accent Rule.** The primary Academic Blue accent must not cover more than 10% of any given screen. Primary colors are reserved for actionable targets, not decoration.

## 3. Typography

**Display Font:** Inter (with fallbacks Segoe UI, Arial, sans-serif)  
**Body Font:** Inter (with fallbacks Segoe UI, Arial, sans-serif)

### Hierarchy
* **Display** (Bold, 48px, 1.2): Used sparingly on landing/login hero pages.
* **Headline** (Bold, 36px, 1.2): Used for primary page titles.
* **Title** (Semi-Bold, 24px, 1.3): Used for card titles and section headers.
* **Body** (Regular, 18px, 1.5): The main copy text size. Line length is capped at 75ch.
* **Label** (Medium, 14px, 1.4): Used for form labels, table headers, and badges.

### Named Rules
**The Legibility First Rule.** All body text and numbers must maintain a contrast ratio of at least 4.5:1 against the background. Muted gray text is strictly forbidden for body content.

## 4. Elevation

SIKAD v4.0 is a flat-by-default, clean interface. It relies on border outlines (`#E5E7EB`) rather than heavy drop shadows to distinguish cards and content divisions.

### Shadow Vocabulary
* **Card Rest** (`shadow-sm`): Subtle 1px boundary shadow.
* **Modal Floating** (`shadow-lg` / `shadow-xl`): Used to lift popups and confirmation dialogs off the canvas.

### Named Rules
**The Flat-By-Default Rule.** Do not use shadows on list items, form inputs, or static tables. Elevation shadows are reserved for floating interfaces (modals, dropdowns, toasts).

## 5. Components

### Buttons
* **Shape:** Rounded-medium (12px radius).
* **Primary:** Styled with `bg-primary-600` (hex #1D4ED8) and white text. Height is medium (48px / `h-12`).
* **Hover / Focus:** Transitions to `bg-primary-700` with a subtle scale-down press feedback (`transform: scale(0.97)` on `:active`).

### Cards / Containers
* **Corner Style:** Rounded-large (16px radius).
* **Background:** Pure white (`#FFFFFF`) with a 1px border (`border-neutral-200`) and subtle `shadow-sm`.
* **Internal Padding:** Spacing step 6 (24px).

### Inputs / Fields
* **Style:** Height is 56px (`h-14`) with a 12px border radius. Border is `#D1D5DB` at rest.
* **Focus:** Outline rings transition to Academic Blue (`ring-2 ring-primary-500`) with no layout shift.

## 6. Do's and Don'ts

### Do:
* **Do** use strict 4px spacing increments for all component alignments and padding.
* **Do** provide an explicit focus-visible outline for keyboard-driven navigation.
* **Do** implement a fast, responsive mobile sidebar overlay for viewports under 768px.

### Don't:
* **Don't** use decorative gradient text (`background-clip: text`) or colorful background stripes.
* **Don't** apply a border-radius larger than 16px to cards, sections, or containers.
* **Don't** use a side-stripe colored border as a status indicator on cards or alert alerts. Use full border tints or prefix icons.
