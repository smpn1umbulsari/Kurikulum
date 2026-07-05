# Product

## Register

product

## Users
School administrators (Kurikulum), teachers, and school principals (Kepala Sekolah). They are administrative users working under high cognitive load, managing school grades, exam schedules, and attendance. They need a highly legible, clean, and reliable interface that works smoothly on local school networks.

## Product Purpose
SIKAD v4.0 is an offline-first hybrid school information and academic administration system. It allows school staff to manage records locally (using Dexie IndexedDB) and sync them seamlessly to the cloud (Supabase) when online. Success is measured by zero data loss, instant page loads, and clear data visualization.

## Brand Personality
* Clean (Notion/Supabase Studio feel)
* Professional (Modern Enterprise Dashboard)
* Data-Driven (Priority on tables and charts over decorative icons)

## Anti-references
* Saturated, colorful SaaS templates with heavy gradients and trendy shadows.
* Over-rounded cards (border-radius > 16px).
* Tiny, low-contrast text that makes reading pupil lists or grade sheets difficult.
* Sluggish dropdowns and popups that delay administrative workflows.

## Design Principles
1. **Data Over Decoration**: Grids, charts, and tables are SIKAD's primary interface. Visual style should support scanning, not distract from it.
2. **Speed & Efficiency**: Keep animations subtle and short (under 250ms). Never animate keyboard-initiated actions.
3. **Accessibility as a First-class Citizen**: Provide built-in, easily accessible toggle controls for High Contrast Mode and Large Font Size to support senior teachers and visually impaired staff.
4. **Honest Synchronization UI**: State transitions, error banners, and warning modals must be clear about sync status and any risks of data overwrite.

## Accessibility & Inclusion
* Target WCAG 2.1 AA compliance.
* Support high contrast and large font settings dynamically across all pages.
* Ensure clear keyboard navigation with focus outlines on interactive buttons.
