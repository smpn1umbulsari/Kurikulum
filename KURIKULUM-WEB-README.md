# Kurikulum Web - Guru Panel

Web application for teachers to input student grades (Nilai) directly from the browser.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Features

### G1. Authentication & Authorization

- Teacher login via email/password (Supabase Auth)
- RLS policies enforce row-level security
- `auth_guru_link` table links Supabase user to `guru` table
- View `v_guru_teaching_assignments` shows teacher's classes

### G2. Dashboard - Class Selection

- Lists all classes assigned to the logged-in teacher
- Grouped by class level (tingkat)
- Click to navigate to grade input

### G3. Assessment Management

- Read-only assessment display
- Shows assessment status (DRAFT → SUBMITTED → APPROVED → FINALIZED)

### G4. Grade Input Interface

- Paginated student list (20 per page)
- Input fields for:
  - Grade (0-100, decimal)
  - Notes (optional)
- Stage badge showing workflow status

### G5. Optimistic Locking

- Version column prevents concurrent edit conflicts
- `upsert_assessment_detail` RPC handles version checking
- VERSION_CONFLICT error shown if stale data

### G6. Auto-Save Draft (localStorage)

- Grades auto-saved to localStorage
- Survives browser refresh
- Cleared after successful server save

### G7. Pagination

- 20 students per page
- Previous/Next navigation
- Shows "X of Y students"

## Database Schema

### Tables Required

```sql
-- Link Supabase auth.users to guru table
CREATE TABLE auth_guru_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guru_id UUID NOT NULL REFERENCES public.guru(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(guru_id)
);

-- View for teacher's assignments
CREATE VIEW v_guru_teaching_assignments AS
SELECT
  p.id AS pembagian_id,
  p.kelas_id,
  p.mata_pelajaran_id,
  k.nama AS kelas_nama,
  k.tingkat,
  mp.nama AS mata_pelajaran_nama,
  mp.kode AS mata_pelajaran_kode
FROM pembagian_mengajar p
JOIN kelas k ON k.id = p.kelas_id
JOIN mata_pelajaran mp ON mp.id = p.mata_pelajaran_id
JOIN auth_guru_link agl ON agl.guru_id = p.guru_id
WHERE auth.uid() = agl.user_id;
```

### RLS Policies (Web Panel)

```sql
-- Enable RLS
ALTER TABLE auth_guru_link ENABLE ROW LEVEL SECURITY;

-- Users can only see their own link
CREATE POLICY "Users can view own link"
  ON auth_guru_link FOR SELECT
  USING (auth.uid() = user_id);

-- Enable RLS on assessments
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Teachers can view assessments for their assigned classes
CREATE POLICY "Teachers can view assessments"
  ON assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM v_guru_teaching_assignments v
      WHERE v.kelas_id = assessments.kelas_id
      AND v.mata_pelajaran_id = assessments.mata_pelajaran_id
    )
  );
```

## Setup

### 1. Install Dependencies

```bash
cd Kurikulum-Web-template
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Run Migrations

Apply the SQL migrations in order:

1. `2200_auth_guru_link.sql`
2. `2201_rls_web_panel.sql`

### 4. Deploy Edge Functions

```bash
supabase functions deploy register-guru-web
supabase functions deploy bulk-register-guru
```

### 5. Register Teachers

Use the Edge Functions to link Supabase users to guru records:

```bash
# Single teacher
curl -X POST https://your-project.supabase.co/functions/v1/register-guru-web \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "uuid", "guru_id": "uuid"}'

# Bulk registration
curl -X POST https://your-project.supabase.co/functions/v1/bulk-register-guru \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"links": [{"user_id": "uuid", "guru_id": "uuid"}, ...]}'
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
Kurikulum-Web-template/
├── src/
│   ├── app/
│   │   ├── globals.css        # Tailwind imports
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── page.tsx           # Home page (redirect to dashboard or login)
│   │   ├── login/
│   │   │   └── page.tsx       # Login page
│   │   └── dashboard/
│   │       ├── page.tsx       # Class list dashboard
│   │       └── input-nilai/
│   │           └── [id]/
│   │               └── page.tsx  # Grade input page
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts       # Browser client
│   │       └── server.ts       # Server client (for API routes)
│   └── types/
│       └── index.ts            # TypeScript interfaces
├── supabase/
│   ├── migrations/
│   │   ├── 2200_auth_guru_link.sql
│   │   └── 2201_rls_web_panel.sql
│   └── functions/
│       ├── register-guru-web/
│       │   └── index.ts
│       └── bulk-register-guru/
│           └── index.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## API Reference

### Edge Functions

#### `register-guru-web` (Single Registration)

```typescript
// Request
{
  user_id: string;  // Supabase auth.users UUID
  guru_id: string; // Kurikulum guru UUID
}

// Response
{
  success: boolean;
  message: string;
  data?: { id: string };
  error?: string;
}
```

#### `bulk-register-guru` (Bulk Registration)

```typescript
// Request
{
  links: Array<{
    user_id: string;
    guru_id: string;
  }>;
}

// Response
{
  success: boolean;
  message: string;
  created: number;
  updated: number;
  errors?: string[];
}
```

### RPC Functions

#### `upsert_assessment_detail` (Grade Save with Optimistic Locking)

```typescript
// Request
{
  p_assessment_id: string;
  p_siswa_id: string;
  p_nilai: number | null;
  p_catatan: string | null;
  p_expected_version: number | null;
}

// Response
// Success: { id: string, version: number }
// Error: "VERSION_CONFLICT" if versions don't match
```

## Security Considerations

1. **RLS Policies**: All data access is controlled by Row Level Security
2. **Service Role Key**: Edge functions require service role key (never expose to client)
3. **Input Validation**: Client-side validation + server-side validation in RPC
4. **Optimistic Locking**: Prevents data loss from concurrent edits

## Troubleshooting

### "Cannot find module '@supabase/ssr'"

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### "Assignment not found"

- Verify teacher is linked via `auth_guru_link`
- Check `pembagian_mengajar` has entries for the teacher

### "VERSION_CONFLICT" error

- Another user edited the same student's grade
- Refresh the page and re-enter the value

### "Assessment not found"

- Assessment must be created first (via desktop app or admin)
- Contact admin to create assessment for your class/subject

## License

Internal use only - SMP Negeri 1 Umbulsari
