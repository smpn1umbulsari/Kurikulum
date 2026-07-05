# 26-Testing-Suite-Specification.md

# TESTING SUITE SPECIFICATION

## SIKAD v4.0

Version: 4.0

Status: APPROVED

---

# TUJUAN

Menetapkan spesifikasi unit testing, integration testing, dan RLS policy testing berbasis **Vitest** untuk memvalidasi kebenaran logika bisnis inti SIKAD v4.0 sebelum masuk ke jalur produksi.

---

# 1. SPESIFIKASI KONFIGURASI TESTING — `vitest.config.ts`

*   **Tujuan**: Mengatur runner Vitest untuk mendukung sintaks TypeScript modern, React 19, dan emulasi DOM browser.

### Blueprint `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // Emulasi DOM browser
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
});
```

---

# 2. UNIT TEST SUITE: AKADEMIK — `academic.test.ts`

*   **Tujuan**: Memastikan fungsi validasi tahun ajaran, semester, dan perhitungan Minggu Efektif (RPE) bekerja secara tepat.

### Desain & Struktur Test Cases

```typescript
import { describe, it, expect } from 'vitest';
import { calculateRpeWeeks, validateActiveTerm } from '@/utils/academicUtils';
import { AcademicTerm } from '@/types';

describe('Academic Term & RPE Utilities', () => {
  
  describe('validateActiveTerm', () => {
    it('harus menolak semester dengan status ganda aktif', () => {
      const academicTerms: AcademicTerm[] = [
        { id: '1', tahun_ajaran: '2025/2026', semester: 'GANJIL', status: true, created_at: '' },
        { id: '2', tahun_ajaran: '2025/2026', semester: 'GENAP', status: true, created_at: '' }
      ];
      expect(() => validateActiveTerm(academicTerms)).toThrow('Hanya diperbolehkan satu term aktif pada satu waktu');
    });

    it('harus meloloskan daftar semester dengan tepat satu term aktif', () => {
      const academicTerms: AcademicTerm[] = [
        { id: '1', tahun_ajaran: '2025/2026', semester: 'GANJIL', status: true, created_at: '' },
        { id: '2', tahun_ajaran: '2025/2026', semester: 'GENAP', status: false, created_at: '' }
      ];
      expect(validateActiveTerm(academicTerms)).toBe(true);
    });
  });

  describe('calculateRpeWeeks', () => {
    it('harus menghitung jumlah pekan efektif dengan benar berdasarkan tanggal mulai dan selesai', () => {
      const start = '2026-07-01';
      const end = '2026-12-31';
      const holidays = ['2026-08-17', '2026-12-25'];
      
      const result = calculateRpeWeeks(start, end, holidays);
      
      expect(result.totalWeeks).toBeGreaterThan(0);
      expect(result.effectiveWeeks).toBeLessThanOrEqual(result.totalWeeks);
    });
  });
});
```

---

# 3. UNIT TEST SUITE: BEBAN KERJA GURU — `workload.test.ts`

*   **Tujuan**: Memvalidasi mesin penghitung beban jam pelajaran total (JP) guru, memastikan ekuivalensi tugas tambahan (seperti Wali Kelas otomatis 2 JP) dihitung dengan benar.

### Desain & Struktur Test Cases

```typescript
import { describe, it, expect } from 'vitest';
import { calculateTeacherWorkload } from '@/utils/workloadUtils';
import { PembagianMengajar, TugasTambahanAssignment } from '@/types';

describe('Teacher Workload Engine', () => {
  it('harus menjumlahkan JP mengajar riil dengan benar', () => {
    const teachingList: PembagianMengajar[] = [
      { id: '1', guru_id: 'G01', mapel_id: 'M01', kelas_id: 'K01', jp: 4 },
      { id: '2', guru_id: 'G01', mapel_id: 'M01', kelas_id: 'K02', jp: 4 }
    ];
    const assignments: TugasTambahanAssignment[] = [];
    
    const workload = calculateTeacherWorkload('G01', teachingList, assignments);
    
    expect(workload.jpMengajar).toBe(8);
    expect(workload.jpTambahan).toBe(0);
    expect(workload.jpTotal).toBe(8);
  });

  it('harus menghitung ekuivalensi tugas tambahan dan jp override', () => {
    const teachingList: PembagianMengajar[] = [];
    const assignments: TugasTambahanAssignment[] = [
      // Tugas tambahan Wali Kelas bernilai ekuivalen 2 JP
      { id: '1', guru_id: 'G01', tugas_tambahan_type_kode: 'WALIKELAS', jp_override: null, status: 'AKTIF' },
      // Tugas tambahan dengan JP khusus (override)
      { id: '2', guru_id: 'G01', tugas_tambahan_type_kode: 'WAKASEK', jp_override: 12, status: 'AKTIF' }
    ];
    
    const workload = calculateTeacherWorkload('G01', teachingList, assignments);
    
    expect(workload.jpMengajar).toBe(0);
    expect(workload.jpTambahan).toBe(14); // 2 JP (wali kelas) + 12 JP (wakasek override)
    expect(workload.jpTotal).toBe(14);
  });
});
```

---

# 4. TESTING INTEGRASI: KEBIJAKAN RLS (DATABASE SECURED)

*   **Tujuan**: Menguji aturan keamanan database (Supabase RLS) secara integrasi dengan menyimulasikan berbagai akun pengguna (GURU, WALI_KELAS, BK, KURIKULUM, ADMIN).

### Matriks Verifikasi Operasi RLS

| Role Pengguna | Target Tabel | Operasi | Ekspektasi Hasil |
| :--- | :--- | :--- | :--- |
| **GURU** | `gurus` (Milik Sendiri) | SELECT / UPDATE | **ALLOW** |
| **GURU** | `gurus` (Milik Orang Lain) | SELECT | **ALLOW** (Profil Publik) |
| **GURU** | `gurus` (Milik Orang Lain) | UPDATE / DELETE | **DENY** (403 Forbidden) |
| **GURU** | `assessments` (Milik Sendiri) | ALL (CRUD) | **ALLOW** |
| **GURU** | `assessments` (Milik Orang Lain)| SELECT | **DENY** |
| **WALI_KELAS**| `catatan_wali_kelas` | CRUD | **ALLOW** (Hanya kelas perwaliannya) |
| **BK** | `siswas` | SELECT | **ALLOW** (Semua siswa) |
| **BK** | `assessments` (Nilai) | SELECT | **ALLOW** (Hanya Read-only) |
| **KURIKULUM**| `kelas` / `academic_terms` | CRUD | **ALLOW** (Full Management) |
| **ADMIN** | `audit_logs` | SELECT | **ALLOW** |

---

# KRITERIA PENERIMAAN TESTING (ACCEPTANCE)

✓ Seluruh tes unit wajib menghasilkan status **PASS** (100% hijau).

✓ Cakupan tes (*test coverage*) untuk file logic minimal **80%**.

✓ Pengujian otomatis RLS dijalankan setiap kali skema migrasi database diperbarui.
