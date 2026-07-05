# AETHER Kurikulum - School Management System

A comprehensive school management system designed for Indonesian educational institutions, built with React + TypeScript + Supabase.

## Project Overview

AETHER manages the complete academic lifecycle of Indonesian schools including:
- **Siswa (Student)** management with NISN tracking, enrollment, mutation, and alumni
- **Guru (Teacher)** management with NIP, subjects, and class assignments
- **Kelas (Class)** management with grade levels and promotion workflows
- **Pembagian Mengajar** - Teaching assignment with workload balancing
- **Assessment & Exam** management with seating algorithms and supervisor scheduling
- **Rapor** - Academic report card generation
- **Academic Terms** - Years and semesters configuration
- **RBAC** - Role-based access control (Kepala Sekolah, Admin, Guru, Operator)

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Styling**: Tailwind CSS + custom components
- **State**: Zustand stores
- **Routing**: React Router v6

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npx supabase start` | Start local Supabase instance |
| `npx supabase db reset` | Reset local database |

## Plugin Structure

This project is structured as a Claude Code plugin with:
- `.claude/plugin.json` - Plugin manifest
- `.claude/marketplace.json` - Marketplace listing
- `.claude/package.json` - NPM package manifest

## Key Modules

| Module | Path | Description |
|--------|------|-------------|
| Siswa | `src/modules/siswa/` | Student management |
| Guru | `src/modules/guru/` | Teacher management |
| Kelas | `src/modules/kelas/` | Class & promotion |
| Rapor | `src/modules/rapor/` | Report card generation |
| Assessment | `src/modules/assessment/` | Exams & scheduling |
| Academic Term | `src/modules/academic-term/` | Year/semester config |
| Calendar | `src/modules/calendar/` | Academic calendar |
| Reporting | `src/modules/reporting/` | Analytics & exports |
| Settings | `src/modules/settings/` | System configuration |

## Environment Variables

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Database

See `supabase/install_all.sql` for complete schema including:
- Tables with RLS policies
- Row Level Security configurations
- Triggers and functions
- Initial seed data

## Development

```bash
# Install dependencies
npm install

# Start Supabase locally
npx supabase start

# Run migrations
npx supabase db reset

# Start dev server
npm run dev
```

## License

MIT
