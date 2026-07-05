# 25-CI-CD-Workflow-Specification.md

# CI/CD WORKFLOW SPECIFICATION

## SIKAD v4.0

Version: 4.0

Status: APPROVED

---

# TUJUAN

Menetapkan spesifikasi pipeline integrasi dan pengiriman berkelanjutan (CI/CD) menggunakan **GitHub Actions** untuk memastikan setiap perubahan kode diuji, diperiksa kepatuhan tipenya (type-safety), dan dideploy secara otomatis ke lingkungan yang sesuai.

---

# ENVIRONMENT STRATEGY

Sistem dibagi menjadi tiga lingkungan deployment utama:

```text
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Development   │ ───> │     Staging     │ ───> │   Production    │
├─────────────────┤      ├─────────────────┤      ├─────────────────┤
│ Branch: develop │      │ Branch: staging │      │ Branch: main    │
│ Target: Local/CI│      │ Target: Host-Stg│      │ Target: Host-Prd│
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

# 1. PIPELINE INTEGRASI (CI) — `ci.yml`

*   **Tujuan**: Menjamin bahwa setiap *pull request* atau push ke branch `develop` bebas dari kesalahan sintaksis, kesalahan tipe data TypeScript, dan lulus uji unit.
*   **Trigger**:
    *   Push ke branch `develop`
    *   Pull Request ke branch `develop`

### Blueprint `.github/workflows/ci.yml`

```yaml
name: Continuous Integration

on:
  push:
    branches: [ develop ]
  pull_request:
    branches: [ develop ]

jobs:
  validate:
    name: Lint, Typecheck, and Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run Linter
        run: npm run lint

      - name: TypeScript Typecheck
        run: npx tsc --noEmit

      - name: Run Unit Tests
        run: npm run test:run
```

---

# 2. PIPELINE DEPLOYMENT STAGING — `staging.yml`

*   **Tujuan**: Mengkompilasi aplikasi ke build produksi dan mengunggahnya ke server pementasan (*staging environment*) untuk kebutuhan UAT (User Acceptance Testing) pihak sekolah.
*   **Trigger**:
    *   Push atau merge ke branch `staging`

### Blueprint `.github/workflows/staging.yml`

```yaml
name: Deploy Staging

on:
  push:
    branches: [ staging ]

jobs:
  deploy-staging:
    name: Build and Deploy to Staging
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Application
        env:
          VITE_SUPABASE_URL: ${{ secrets.STAGING_VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.STAGING_VITE_SUPABASE_ANON_KEY }}
          VITE_ENVIRONMENT: staging
          VITE_APP_VERSION: 4.0.0-staging
        run: npm run build

      - name: Deploy to Cloudflare Pages (or Firebase Hosting)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=sikad-staging --branch=staging
```

---

# 3. PIPELINE DEPLOYMENT PRODUCTION — `production.yml`

*   **Tujuan**: Merilis aplikasi yang stabil ke server produksi utama sekolah dan melakukan *tagging* versi rilis pada repositori git.
*   **Trigger**:
    *   Push atau merge ke branch `main`

### Blueprint `.github/workflows/production.yml`

```yaml
name: Deploy Production

on:
  push:
    branches: [ main ]

jobs:
  deploy-production:
    name: Build, Tag, and Deploy to Production
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run Tests (Final Gate)
        run: npm run test:run

      - name: Build Application
        env:
          VITE_SUPABASE_URL: ${{ secrets.PROD_VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.PROD_VITE_SUPABASE_ANON_KEY }}
          VITE_ENVIRONMENT: production
          VITE_APP_VERSION: 4.0.1
        run: npm run build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=sikad-production --branch=main

      - name: Create Git Release Tag
        run: |
          git config --global user.name "SIKAD Release Bot"
          git config --global user.email "bot@sikad.sch.id"
          git tag -a v4.0.1 -m "Release version 4.0.1"
          git push origin v4.0.1
```

---

# MANAJEMEN RAHASIA (SECRETS) & LINGKUNGAN

Seluruh parameter sensitif wajib disimpan di **GitHub Secrets** masing-masing repositori:

1.  **`CLOUDFLARE_API_TOKEN`**: Token otorisasi Cloudflare untuk deploy statis.
2.  **`CLOUDFLARE_ACCOUNT_ID`**: ID Akun Cloudflare Pages.
3.  **`STAGING_VITE_SUPABASE_URL` / `PROD_VITE_SUPABASE_URL`**: URL instance database Supabase.
4.  **`STAGING_VITE_SUPABASE_ANON_KEY` / `PROD_VITE_SUPABASE_ANON_KEY`**: Anonymous key untuk koneksi REST.

> [!WARNING]
> Kunci rahasia (secrets) tidak boleh dideklarasikan di dalam file konfigurasi publik atau disimpan ke kontrol versi (git commit).

---

# KRITERIA PENERIMAAN DEPLOYMENT (ACCEPTANCE)

✓ Seluruh file workflow YAML lolos pengecekan parser linter.

✓ Pembangunan bundle (*production build*) tidak boleh memuat library pengembangan (*devDependencies*).

✓ Deployment staging dan produksi hanya boleh berjalan apabila status pengujian unit bernilai 100% lulus (Green Build).
