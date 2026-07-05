# Make Plan: SIKAD v4.0 Design System & Animation

## Context

Based on Dieter Rams design audit (14/30 — REDESIGN verdict). The codebase has a solid foundation (clean sidebar, Inter typography, Indonesian copy, accessibility toggles) but lacks component abstraction and design token discipline.

**Constraints:**
- No performance regression (admin tool, not landing page)
- Offline-first architecture must work
- Indonesian school staff as primary users
- WCAG 2.1 AA accessibility target

---

## Phase 0: Allowed APIs & Patterns Found

### Existing Components (to extend or refactor)
| Component | Path | States Present |
|-----------|------|---------------|
| `EmptyState` | `src/components/ui/EmptyState.tsx` | default, hover, disabled |
| `ToastContainer` | `src/components/ui/Toast.tsx` | success, error, warning, info |
| `SkeletonRow` | `src/components/ui/SkeletonRow.tsx` | loading |
| `SyncToolbar` | `src/components/sync/SyncToolbar.tsx` | default, hover, disabled, loading |

### CSS Foundations (DO NOT modify — already correct)
- `src/index.css:86-92` — `@media (prefers-reduced-motion)` ✅
- `src/index.css:60-73` — toast-in animation ✅
- `src/index.css:75-83` — skeleton-pulse animation ✅
- Custom easing: `--ease-ui-fast: cubic-bezier(0.23, 1, 0.32, 1)` ✅

### Tailwind Config (source of truth)
- Colors: `primary`, `neutral`, `success`, `warning`, `danger`, `info` (see `tailwind.config.js:9-50`)
- Border radius: `small` (8px), `medium` (12px), `large` (16px), `card` (16px)
- Shadows: `card`, `modal`, `floating`

### Existing Pattern: Modal Structure
```
AcademicTermPage.tsx:202-297
  - fixed inset-0 bg-black bg-opacity-50
  - bg-white rounded-card shadow-floating
  - header: px-6 py-4 border-b bg-neutral-50
  - body: p-6 space-y-4
  - footer: flex justify-end gap-3 pt-4 border-t
```

### Existing Pattern: Toolbar Structure
```
GuruPage.tsx:361-407, SiswaPage.tsx:230-280
  - outer: bg-white rounded-2xl border shadow-sm
  - actions row: flex flex-wrap gap-2 p-4 border-b
  - filters row: bg-neutral-50 p-4
```

### Anti-patterns to AVOID
- `bg-blue-600` — use `bg-primary-600` instead (GuruPage.tsx:366)
- `bg-emerald-600` — use `bg-primary-600` instead (SiswaPage.tsx:232)
- `rounded-xl/2xl/3xl` — use config tokens instead (GuruPage.tsx:336-1080)
- `shadow-2xl` — use `shadow-floating` instead (GuruPage.tsx:680,887)
- Inline Tailwind on form inputs — use FormField component instead

---

## Phase 1: Design Token Enforcement + Core Components (Button, Input, Select)

### 1a. Token Audit & ESLint Rule

**What:** Create ESLint comment block in each page to prevent raw Tailwind defaults.

**Files affected:**
- `src/modules/guru/pages/GuruPage.tsx` — replace `bg-blue-600` → `bg-primary-600`, `rounded-xl` → `rounded-medium`, `shadow-2xl` → `shadow-floating`
- `src/modules/siswa/pages/SiswaPage.tsx` — replace `bg-emerald-600` → `bg-primary-600`, `focus:ring-emerald-500` → `focus:ring-primary-500`
- `src/modules/kelas/pages/KelasPage.tsx` — audit for mixed tokens
- `src/modules/calendar/pages/CalendarPage.tsx` — audit for mixed tokens

**Documentation references:**
- Token list: `tailwind.config.js:9-75`
- Evidence of violations: `DESIGN-IS-2026-07-06/01-evidence.md` sections on Visual Evidence

**Verification:**
```bash
grep -r "bg-blue-600\|bg-emerald-600\|rounded-xl\|shadow-2xl" src/modules/*/pages/*.tsx
# Should return 0 matches after fix
```

### 1b. Button Component

**What:** Create `src/components/ui/Button.tsx` with semantic variants and all states.

**Variants (semantic, NOT presentational):**
- `variant="primary"` — filled primary button (actions)
- `variant="secondary"` — outline button (cancel, secondary actions)
- `variant="danger"` — destructive actions
- `variant="ghost"` — tertiary actions
- `variant="icon"` — accessibility icon buttons

**States per variant:**
- default, hover, focus-visible, active, disabled, loading

**Props:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}
```

**Implementation notes:**
- Use config tokens: `bg-primary-600`, `border-neutral-300`, `rounded-medium`
- Use `--ease-ui-fast` CSS variable for transitions
- Include explicit `focus-visible` styles
- Loading state: show spinner + optional loadingText

**Copy from:**
- Loading state pattern: `SyncToolbar.tsx:81-85` (Loader2 spinner)
- Disabled state: `SyncToolbar.tsx:74-79` (opacity + cursor-not-allowed)

### 1c. Input Component

**What:** Create `src/components/ui/Input.tsx` with label, error, and helper text.

**Props:**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```

**Implementation notes:**
- Auto-generate `id` from `name` if not provided
- Proper `htmlFor`/`id` pairing for accessibility
- Error state: red border + error message below
- Use config tokens: `border-neutral-300`, `focus:ring-primary-500`, `rounded-medium`

**Copy from:**
- Error styling: `AcademicTermPage.tsx:218-220`
- Label structure: `AcademicTermPage.tsx:212-223`

### 1d. Select Component

**What:** Create `src/components/ui/Select.tsx` with label, error, and option support.

**Props:**
```typescript
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}
```

**Copy from:**
- Select structure: `AcademicTermPage.tsx:225-237`

---

## Phase 2: Modal + FormField + Toolbar Components

### 2a. Modal Component

**What:** Create `src/components/ui/Modal.tsx` — reusable modal with focus trap.

**Props:**
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}
```

**Implementation notes:**
- Use `fixed inset-0 z-50 flex items-center justify-center` pattern
- Background: `bg-black/50` (opacity-50)
- Panel: `bg-white rounded-card shadow-floating border border-neutral-200`
- Header: `px-6 py-4 border-b bg-neutral-50`
- Body: `p-6`
- Footer: `flex justify-end gap-3 pt-4 border-t`
- Focus trap: use `useEffect` to trap Tab within modal
- Close on Escape: `useEffect` with `keydown` listener

**Copy from:**
- Structure: `AcademicTermPage.tsx:202-297` (exact pattern)
- Focus management: standard React modal pattern

**States to handle:**
- Open/closed (controlled by `isOpen`)
- Loading state (passed via footer buttons)

### 2b. FormField Component

**What:** Create `src/components/ui/FormField.tsx` — wrapper for label + input + error.

**Props:**
```typescript
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
}
```

**Implementation notes:**
- Wrapper with `space-y-1`
- Label with `text-sm font-medium text-neutral-700`
- Error with `text-xs text-red-600`
- Helper text with `text-xs text-neutral-500`

### 2c. Toolbar Component

**What:** Create `src/components/ui/Toolbar.tsx` — reusable data page toolbar.

**Props:**
```typescript
interface ToolbarProps {
  actions?: React.ReactNode[];  // Buttons on left
  filters?: React.ReactNode;     // Search/filter controls on right
  children?: React.ReactNode;    // Additional content
}
```

**Structure:**
```tsx
<div className="bg-white rounded-card border border-neutral-200 shadow-card overflow-hidden">
  <div className="flex flex-wrap items-center gap-2 p-4 border-b border-neutral-100">
    {actions}
  </div>
  {filters && (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-neutral-50">
      {filters}
    </div>
  )}
</div>
```

**Copy from:**
- Toolbar structure: `GuruPage.tsx:361-439`, `SiswaPage.tsx:230-280`

### 2d. KpiCard Component

**What:** Create `src/components/ui/KpiCard.tsx` — metric display cards.

**Props:**
```typescript
interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}
```

**Structure:**
```tsx
<div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card flex items-center justify-between h-[120px]">
  <div>
    <p className="text-sm font-medium text-neutral-500">{label}</p>
    <p className="text-3xl font-bold text-neutral-800 mt-1">{value}</p>
  </div>
  {icon && <div className="text-neutral-400">{icon}</div>}
</div>
```

**Copy from:**
- KpiCard pattern: `AcademicTermPage.tsx:104-122`

---

## Phase 3: Animation System (Subtle & Purposeful)

### 3a. Animation CSS Variables (extend index.css)

**What:** Add motion design tokens to `src/index.css`.

**Add after existing `:root` block:**
```css
:root {
  /* Existing */
  --ease-ui-fast: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  
  /* New — ease-out-quart (150-250ms for UI) */
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  
  /* Duration scale */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
}
```

**Add keyframe animations:**
```css
/* Fade + slide up for reveals (table rows, cards) */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scale + fade for modals */
@keyframes modal-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Slide in from right for panels */
@keyframes slide-right {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}
```

**Add animation classes:**
```css
.animate-fade-up {
  animation: fade-up var(--duration-normal) var(--ease-out-quart) both;
}

.animate-modal-in {
  animation: modal-in var(--duration-slow) var(--ease-ui-fast) both;
}

.animate-slide-right {
  animation: slide-right var(--duration-normal) var(--ease-out-quart) both;
}

/* Reduced motion — instant transitions */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-up,
  .animate-modal-in,
  .animate-slide-right {
    animation: none;
  }
}
```

### 3b. Button Micro-interactions

**What:** Add subtle press feedback to Button component.

**In Button component CSS:**
```css
/* Active/press state */
button:active:not(:disabled) {
  transform: scale(0.97);
  transition: transform 100ms var(--ease-ui-fast);
}

/* Hover state — slight lift */
button:hover:not(:disabled) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: box-shadow var(--duration-fast) var(--ease-out-quart);
}
```

**Note:** `transform: scale(0.97)` is already in DESIGN.md — implement it in Button component.

### 3c. Table Row Hover Animation

**What:** Add subtle background transition on table row hover.

**In Table component or inline:**
```tsx
<tr className="h-16 hover:bg-primary-50 transition-colors duration-150 ease-out">
```

**Note:** Already present in `AcademicTermPage.tsx:157` — standardize to all tables.

### 3d. Sidebar Navigation Animation

**What:** Add subtle active state transition.

**In MainLayout nav:**
```tsx
<Link className="transition-[background-color,color,transform] duration-150 ease-out">
```

**Existing:** `MainLayout.tsx:74` already has `transition-[transform,background-color,color] duration-150 ease-out`

### 3e. Staggered List Reveal (optional enhancement)

**What:** Add staggered fade-up to table rows on initial load.

**Implementation:**
```tsx
const staggerStyle = {
  animationDelay: `${index * 30}ms`,
};

<tr style={staggerStyle} className="h-16 animate-fade-up ...">
```

**Note:** Use sparingly — only on initial page load, not on every render.

---

## Phase 4: Accessibility Foundation

### 4a. Skip Link

**What:** Add skip-to-content link in MainLayout.

**Implementation:**
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-medium">
  Langsung ke konten utama
</a>
<div id="main-content" tabIndex={-1}>
```

**Place:** After `<body>` or as first child of `<header>`

### 4b. Icon Button aria-label

**What:** Add `aria-label` to all icon-only buttons.

**Files to fix:**
- `MainLayout.tsx:173` — logout button
- `MainLayout.tsx:199-211` — accessibility toggle buttons
- `SyncToolbar.tsx:84,108` — sync buttons
- `GuruPage.tsx:625,632,639` — table action icons

**Implementation:**
```tsx
<button aria-label="Keluar dari aplikasi" ...>
```

### 4c. Form Label Association

**What:** Ensure all form inputs have proper `htmlFor`/`id` pairing.

**Files to fix:**
- `AcademicTermPage.tsx:213-260` — all inputs
- `GuruPage.tsx:712-848` — modal form

**Implementation:**
```tsx
<FormField label="Tahun Ajaran" required>
  <Input 
    id="tahun_ajaran" 
    name="tahun_ajaran" 
    placeholder="2025/2026"
    error={errors.tahun_ajaran?.message}
  />
</FormField>
```

### 4d. Modal Focus Trap

**What:** Ensure modal focus is trapped within the dialog.

**Implementation in Modal component (Phase 2):**
```tsx
const modalRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!isOpen) return;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    
    if (e.key === 'Tab') {
      const focusable = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      
      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;
      
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isOpen, onClose]);
```

### 4e. ARIA Landmarks

**What:** Add missing ARIA landmarks.

**In MainLayout:**
```tsx
<main id="main-content" role="main" aria-label="Konten utama">
<aside aria-label="Navigasi utama">
<nav aria-label="Menu navigasi">
```

**Footer:** Add `<footer>` if not present.

---

## Phase 5: Migration Path

### Strategy: Incremental, Not Big Bang

**Phase 5a: AcademicTermPage Migration**
1. Replace inline `<button>` with `<Button>` component
2. Replace inline `<input>` with `<Input>` component
3. Replace inline `<select>` with `<Select>` component
4. Wrap inputs with `<FormField>`
5. Replace modal structure with `<Modal>` component
6. Replace toolbar with `<Toolbar>` + `<KpiCard>`

**Phase 5b: GuruPage Migration**
1. Same pattern as AcademicTermPage
2. Fix token violations: `bg-blue-600` → `bg-primary-600`

**Phase 5c: SiswaPage Migration**
1. Same pattern
2. Fix token violations: `bg-emerald-600` → `bg-primary-600`, `focus:ring-emerald-500` → `focus:ring-primary-500`

**Phase 5d: Remaining Pages**
- CalendarPage, KelasPage, DashboardKurikulum, Assessment pages
- Each page uses same patterns — standardize as we go

### Cutover Criteria

- **New pages:** MUST use component library (no inline Tailwind for interactive elements)
- **Existing pages:** Migrate incrementally during feature work or bug fixes
- **Rejected pattern:** No inline `<button>`, `<input>`, `<select>` for new components

---

## Verification Checklist

### Phase 1 (Token Enforcement + Core Components)
- [ ] `grep -r "bg-blue-600\|bg-emerald-600" src/modules/` returns 0 matches
- [ ] `grep -r "rounded-xl\|rounded-2xl\|rounded-3xl" src/modules/` returns 0 matches (except intentional cases)
- [ ] Button component renders all 5 variants correctly
- [ ] Button states: default, hover, focus-visible, active, disabled, loading all work
- [ ] Input component: label associates with input via htmlFor/id
- [ ] Input component: error state shows red border + message
- [ ] Select component: options render correctly

### Phase 2 (Modal + FormField + Toolbar + KpiCard)
- [ ] Modal opens/closes correctly
- [ ] Modal focus trap works (Tab cycles within modal)
- [ ] Modal closes on Escape key
- [ ] Modal closes on overlay click (if enabled)
- [ ] FormField wraps inputs with label + error
- [ ] Toolbar renders actions + filters correctly
- [ ] KpiCard displays label + value + icon

### Phase 3 (Animation)
- [ ] `animate-fade-up` class works on list items
- [ ] `animate-modal-in` class works on modal open
- [ ] Button press feedback (scale 0.97) works
- [ ] Table row hover transition works
- [ ] All animations respect `prefers-reduced-motion`

### Phase 4 (Accessibility)
- [ ] Skip link visible on focus
- [ ] All icon buttons have aria-label
- [ ] All form inputs have associated labels
- [ ] Modal focus is trapped
- [ ] ARIA landmarks present: header, nav, main, aside

### Phase 5 (Migration)
- [ ] AcademicTermPage uses all new components
- [ ] GuruPage uses all new components + token fixes
- [ ] SiswaPage uses all new components + token fixes
- [ ] No inline Tailwind on interactive elements in migrated pages

---

## Anti-pattern Guards

1. **DO NOT** add new inline `<button>`, `<input>`, `<select>` — use components
2. **DO NOT** use `bg-blue-600` or `bg-emerald-600` — use config tokens
3. **DO NOT** add `animate-spin` on idle elements — only on loading states
4. **DO NOT** add `@keyframes` without corresponding `prefers-reduced-motion` override
5. **DO NOT** build ALL components before migrating ANY page — incremental delivery

---

## File Deliverables

```
src/components/ui/
├── Button.tsx          # Phase 1
├── Input.tsx           # Phase 1
├── Select.tsx          # Phase 1
├── Modal.tsx           # Phase 2
├── FormField.tsx       # Phase 2
├── Toolbar.tsx         # Phase 2
├── KpiCard.tsx         # Phase 2
└── (existing: EmptyState, Toast, SkeletonRow — no changes)

src/index.css           # Phase 3 — add animation tokens

src/app/layouts/
└── MainLayout.tsx     # Phase 4 — skip link, aria landmarks

src/modules/academic-term/pages/
└── AcademicTermPage.tsx  # Phase 5 — migrate to components

src/modules/guru/pages/
└── GuruPage.tsx         # Phase 5 — migrate + token fixes

src/modules/siswa/pages/
└── SiswaPage.tsx        # Phase 5 — migrate + token fixes
```
