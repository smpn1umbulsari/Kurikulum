# 14-UI-Design-System.md

# UI DESIGN SYSTEM

## SIKAD v4.0

Version: 4.0

Status: APPROVED

Design Philosophy:

```text
Clean
Professional
Fast
Accessible
Mobile First
Data Driven
```

---

# TUJUAN

Menjamin seluruh UI SIKAD memiliki:

```text
Konsistensi

Keterbacaan

Kecepatan Penggunaan

Aksesibilitas

Kemudahan Maintenance
```

---

# DESIGN PRINCIPLES

## Principle 1

Data lebih penting daripada dekorasi.

---

## Principle 2

Form lebih penting daripada animasi.

---

## Principle 3

Mobile First.

---

## Principle 4

Dashboard harus fokus pada informasi.

---

## Principle 5

Seluruh komponen reusable.

---

# DESIGN LANGUAGE

Style:

```text
Modern Enterprise Dashboard
```

---

Inspirasi:

```text
Linear

Stripe Dashboard

Notion

Vercel Dashboard

Supabase Studio
```

---

# COLOR SYSTEM

## Primary

```text
Primary 50  #EEF4FF
Primary 100 #D9E7FF
Primary 200 #BAD3FF
Primary 300 #8EB6FF
Primary 400 #5D92FF
Primary 500 #356EFF
Primary 600 #1D4ED8
Primary 700 #1E40AF
Primary 800 #1E3A8A
Primary 900 #172554
```

---

## Neutral

```text
Gray 50  #F9FAFB
Gray 100 #F3F4F6
Gray 200 #E5E7EB
Gray 300 #D1D5DB
Gray 400 #9CA3AF
Gray 500 #6B7280
Gray 600 #4B5563
Gray 700 #374151
Gray 800 #1F2937
Gray 900 #111827
```

---

## Success

```text
Green 500
Green 600
```

---

## Warning

```text
Amber 500
Amber 600
```

---

## Danger

```text
Red 500
Red 600
```

---

## Info

```text
Sky 500
Sky 600
```

---

# STATUS COLORS

## Academic

```text
Draft       = Gray

Published   = Blue

Finalized   = Green
```

---

## Attendance

```text
Hadir = Green

Izin = Amber

Sakit = Sky

Alpa = Red
```

---

## Workload

```text
Underload = Amber

Ideal = Green

Overload = Red
```

---

# TYPOGRAPHY

Font:

```text
Inter
```

Fallback:

```text
Segoe UI

Arial
```

---

# FONT SCALE

## Display

```text
48px
```

---

## H1

```text
36px
```

---

## H2

```text
30px
```

---

## H3

```text
24px
```

---

## H4

```text
20px
```

---

## Body

```text
18px
```

---

## Small

```text
14px
```

---

# SPACING SYSTEM

Base Unit:

```text
4px
```

---

Scale:

```text
1 = 4px

2 = 8px

3 = 12px

4 = 16px

5 = 20px

6 = 24px

8 = 32px

10 = 40px

12 = 48px
```

---

# BORDER RADIUS

## Small

```text
8px
```

---

## Medium

```text
12px
```

---

## Large

```text
16px
```

---

## Card

```text
16px
```

---

# SHADOWS

## Card

```text
shadow-sm
```

---

## Modal

```text
shadow-lg
```

---

## Floating

```text
shadow-xl
```

---

# LAYOUT SYSTEM

## Container

```text
max-width: 1440px
```

---

## Content Padding

Desktop:

```text
24px
```

---

Mobile:

```text
16px
```

---

# GRID SYSTEM

Desktop:

```text
12 Columns
```

---

Tablet:

```text
8 Columns
```

---

Mobile:

```text
4 Columns
```

---

# BUTTON SYSTEM

## Primary Button

Purpose:

```text
Main Action
```

---

Style:

```text
bg-primary-600

text-white

hover:bg-primary-700
```

---

## Secondary Button

```text
border

background white
```

---

## Danger Button

```text
bg-red-600
```

---

## Ghost Button

```text
Transparent
```

---

# BUTTON SIZE

## Small

```text
h-10
```

---

## Medium

```text
h-12
```

---

## Large

```text
h-14
```

---

# CARD SYSTEM

Default:

```text
rounded-2xl

border

bg-white

shadow-sm
```

---

Padding:

```text
24px
```

---

# FORM SYSTEM

## Input Height

```text
56px
```

---

## Textarea Min Height

```text
120px
```

---

## Label

```text
Font Medium
```

---

## Validation

Color:

```text
Red 600
```

---

# TABLE SYSTEM

Primary Data Component.

---

# Table Rules

Header:

```text
Sticky
```

---

Row Height:

```text
64px
```

---

Cell Padding:

```text
16px
```

---

# TABLE COLORS

Header:

```text
Gray 50
```

---

Hover:

```text
Primary 50
```

---

Selected:

```text
Primary 100
```

---

# MODAL SYSTEM

Width:

## Small

```text
480px
```

---

## Medium

```text
720px
```

---

## Large

```text
960px
```

---

# DRAWER SYSTEM

Used For:

```text
Detail View

Quick Edit

Preview
```

---

# BADGE SYSTEM

## Success

```text
Green
```

---

## Warning

```text
Amber
```

---

## Danger

```text
Red
```

---

## Info

```text
Blue
```

---

# DASHBOARD SYSTEM

Priority:

```text
Cards
Charts
Tables
```

---

# KPI CARD

Structure:

```text
Label

Value

Trend

Icon
```

---

Height:

```text
120px
```

---

# CHART SYSTEM

Library:

```text
Recharts
```

---

Allowed:

```text
Line

Bar

Area

Donut
```

---

Avoid:

```text
3D Chart

Pie Explosion

Decorative Chart
```

---

# ICON SYSTEM

Library:

```text
Lucide React
```

---

Forbidden:

```text
Mixed Icon Library
```

---

# LOADING SYSTEM

## Skeleton

Required.

---

Forbidden:

```text
Blank Screen
```

---

# EMPTY STATE

Must Show:

```text
Icon

Title

Description

Action
```

---

# ERROR STATE

Must Show:

```text
Error Message

Retry Button
```

---

# MOBILE DESIGN

Priority:

```text
Teacher Usage
```

---

Target Width:

```text
360px+

390px+

412px+
```

---

# RESPONSIVE BREAKPOINTS

```text
sm = 640

md = 768

lg = 1024

xl = 1280

2xl = 1536
```

---

# ACCESSIBILITY

Target:

```text
WCAG AAA (Khusus Pengguna Lansia)
```

---

## Aksesibilitas Khusus Lansia

```text
1. Font Size Toggle (A- / A / A+) di navbar untuk zoom teks dinamis s.d 150%.
2. Desain Layout "Action-First": Kurangi teks narasi panjang, tampilkan tombol tindakan menu besar.
3. Rasio Kontras Minimum 7:1 untuk teks utama terhadap latar belakang.
```

---

Requirements:

```text
Keyboard Navigation

Visible Focus

Color Contrast

Screen Reader Labels
```

---

# DARK MODE

Phase:

```text
Future Release
```

---

Current:

```text
Light Mode Only
```

---

# COMPONENT LIBRARY

Recommended:

```text
shadcn/ui
```

---

Base:

```text
Radix UI
```

---

# DESIGN TOKENS

File:

```text
src/app/theme/tokens.ts
```

---

Must Contain:

```text
Colors

Spacing

Typography

Radius

Shadow
```

---

# ACCEPTANCE CRITERIA

✓ Consistent UI

✓ Mobile Friendly

✓ Enterprise Style

✓ Accessible

✓ Reusable Components

✓ Dashboard Ready

✓ Data Entry Optimized

✓ Tailwind Compatible

✓ shadcn Compatible

✓ Future Dark Mode Ready

---

# FINAL DESIGN PRINCIPLE

SIKAD v4.0 bukan aplikasi promosi atau marketing.

SIKAD adalah:

```text
Data Intensive System
```

Maka prioritas desain adalah:

```text
Readability
↓
Speed
↓
Consistency
↓
Aesthetics
```

bukan:

```text
Animation
↓
Visual Effects
↓
Decoration
```
