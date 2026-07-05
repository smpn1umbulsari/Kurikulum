# 28-Advanced-Architecture-Remediation-Plan.md

# ADVANCED ARCHITECTURE REMEDIATION PLAN

## SIKAD v4.0

Version: 4.0

Status: APPROVED

---

# TUJUAN

Menetapkan rencana perbaikan tingkat lanjut untuk mengamankan data lokal klien, mengelola siklus hidup memori penyimpanan IndexedDB browser, mengoptimalkan toleransi gangguan jaringan tidak stabil (*flaky network*), serta merancang arsitektur multi-tenancy (SaaS) untuk kesiapan regional.

---

# 1. ENKRIPSI DATA LOKAL SELEKTIF (WEB CRYPTO API)

*   **Masalah**: Data sensitif siswa dan guru disimpan secara lokal di IndexedDB (Dexie.js) dalam format *plain text* yang rentan diekstraksi.
*   **Solusi**: Menggunakan **Web Crypto API (AES-GCM 256-bit)** untuk mengenkripsi kolom biodata sensitif secara *client-side* sebelum disimpan ke IndexedDB. Kunci enkripsi diturunkan secara asinkron (*derived key*) dari token sesi autentikasi Supabase pengguna yang aktif di memori.

### Alur Enkripsi / Dekripsi Kolom Sensitif (Selective Encryption)

```text
       Simpan Data (INSERT/UPDATE):
       ┌───────────┐      Enkripsi (AES-GCM)      ┌───────────┐
       │   Plain   │ ───────────────────────────> │ Encrypted │ ──> Simpan ke Dexie
       │   JSON    │   (Kunci dari Sesi Memori)   │  Base64   │
       └───────────┘                              └───────────┘

       Muat Data (SELECT):
       ┌───────────┐      Dekripsi (AES-GCM)      ┌───────────┐
       │ Encrypted │ ───────────────────────────> │   Plain   │ ──> Render ke Form UI
       │  Base64   │   (Kunci dari Sesi Memori)   │   JSON    │
       └───────────┘                              └───────────┘
```

*   **Kolom Terenkripsi**: `nama_lengkap`, `nisn`, `nis`, `tempat_lahir`.
*   **Keuntungan**: Enkripsi hanya dilakukan pada kolom teks tertentu, menjaga performa kueri relasional (seperti filter tingkat kelas) tetap instan karena kolom pengindeksan non-sensitif tetap tidak terenkripsi.

### Detail Teknis Implementasi AES-GCM 256-bit

> [!WARNING]
> **Kebijakan Keamanan Penyimpanan Kunci (Key Storage Security Policy)**:
> 1. `CryptoKey` hasil penurunan kunci **WAJIB** disimpan dalam memori volatile aplikasi saja (misal: di dalam Zustand global state *tanpa* middleware persist, atau variabel global privat di tingkat modul).
> 2. **DILARANG KERAS** menyimpan `CryptoKey` atau kunci mentah dalam `localStorage`, `sessionStorage`, atau cookies untuk meminimalkan risiko pencurian data sensitif apabila terjadi serangan Cross-Site Scripting (XSS).

```typescript
// Helper utilitas untuk enkripsi client-side (src/utils/crypto.ts)
export class LocalEncryptor {
  private static ALGORITHM = 'AES-GCM';

  // Menghasilkan CryptoKey secara asinkron dari session token Supabase
  public static async deriveKey(sessionToken: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(sessionToken),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    // Salt ditarik dari variabel lingkungan (Vite standard) untuk mencegah hardcode salt
    const saltEnv = import.meta.env.VITE_ENCRYPTION_SALT;
    if (!saltEnv) {
      throw new Error("VITE_ENCRYPTION_SALT is not configured in environment variables!");
    }
    
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(saltEnv),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Melakukan enkripsi plain-text
  public static async encrypt(text: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      key,
      enc.encode(text)
    );

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv))
    };
  }

  // Melakukan dekripsi ciphertext
  public static async decrypt(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
    const dec = new TextDecoder();
    const ivBytes = new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0)));
    const encryptedBytes = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv: ivBytes },
      key,
      encryptedBytes
    );

    return dec.decode(decrypted);
  }
}
```

---

# 2. KEBIJAKAN PENGGUSURAN CACHE (LOCAL CACHE EVICTION POLICY)

*   **Masalah**: Menyimpan data akademik secara offline dari tahun ke tahun akan memicu pembengkakan penyimpanan browser klien (*storage bloating*).
*   **Solusi**: Menerapkan kebijakan penggusuran data lokal berdasarkan term akademik aktif untuk menjaga performa baca-tulis klien tetap optimal.

### Aturan Batasan Penyimpanan Lokal (Eviction Rules)

1.  **Maksimal 2 Term Terkini**: Database lokal (Dexie.js/IndexedDB) hanya diperbolehkan menyimpan data transaksi dari **term aktif berjalan** dan **satu term berjalan sebelumnya**.
2.  **Pembersihan Pasca-Finalisasi (Post-Finalization Purge)**: Begitu term akademik baru diaktifkan, data transaksi dari term yang berumur lebih dari 2 semester di sisi klien akan dihapus secara lokal dari IndexedDB.
3.  **Kueri On-Demand Cloud**: Jika pengguna (seperti Kurikulum) perlu mengakses data rapor/nilai dari tahun ajaran lama yang sudah digusur dari lokal, aplikasi akan dialihkan secara otomatis untuk memanggil REST API Supabase (cloud direct read-only), tanpa mengunduh data tersebut ke IndexedDB.

---

# 3. STATE MACHINE SINKRONISASI FLAKY (EXPONENTIAL BACKOFF)

*   **Masalah**: Kegagalan berulang (*infinite loop*) saat sinkronisasi pada kondisi koneksi internet buruk (seperti packet loss tinggi di jaringan seluler).
*   **Solusi**: Mengimplementasikan *Sync State Machine* dengan algoritma **Exponential Backoff dan Jitter** untuk menunda retries secara dinamis.

### Diagram Transisi State Jaringan

```text
  ┌──────────────┐      Koneksi Flaky/Gagal      ┌────────────────┐
  │ ONLINESTABLE │ ────────────────────────────> │  RETRYBACKOFF  │
  └──────┬───────┘                               └───────┬────────┘
         │                                               │
    Offline Detect                                   Max Retries /
         │                                           Timeout Exceeded
         ▼                                               ▼
  ┌──────────────┐                               ┌────────────────┐
  │   OFFLINE    │ <──────────────────────────── │  SYNCBLOCKED   │
  └──────────────┘                               └────────────────┘
```

### Penundaan Sinkronisasi (Backoff Formula & TypeScript Code)

Setiap kali sinkronisasi gagal karena timeout/gangguan jaringan, penundaan kueri berikutnya dihitung dengan rumus:

$$T_{retry} = \min(T_{base} \times 2^{\text{retry\_count}} + \text{random\_jitter}, 300000)\text{ ms}$$

*   **$T_{base}$**: 2.000 ms (2 detik).
*   **Maximum Delay**: 300.000 ms (5 menit).

```typescript
export interface BackoffConfig {
  baseDelayMs: number;
  maxDelayMs: number;
}

export const getBackoffDelay = (
  retryCount: number,
  config: BackoffConfig = { baseDelayMs: 2000, maxDelayMs: 300000 }
): number => {
  // Hitung eksponensial murni
  const exponentialDelay = config.baseDelayMs * Math.pow(2, retryCount);
  
  // Tambahkan random jitter (+- 10% dari delay untuk menghindari kolisi serentak)
  const jitterRange = exponentialDelay * 0.1;
  const randomJitter = (Math.random() * 2 - 1) * jitterRange;
  
  const finalDelay = exponentialDelay + randomJitter;
  
  return Math.min(Math.max(finalDelay, config.baseDelayMs), config.maxDelayMs);
};
```

| State Asal | Event Pemicu | State Tujuan | Tindakan Sistem |
| :--- | :--- | :--- | :--- |
| `ONLINESTABLE` | Kegagalan HTTP / Timeout | `RETRYBACKOFF` | Menghitung `getBackoffDelay(retryCount)`, memulai timer penundaan, menaikkan `retryCount` (+1). |
| `RETRYBACKOFF` | Timer Selesai & Sukses | `ONLINESTABLE` | Menjalankan sinkronisasi data tertunda, menyetel ulang `retryCount = 0`. |
| `RETRYBACKOFF` | `retryCount >= 5` | `SYNCBLOCKED` | Memblokir antrean sinkronisasi otomatis, menampilkan notifikasi "Koneksi tidak stabil, sinkronisasi ditunda". |
| `SYNCBLOCKED` | Deteksi Ping Sukses / Manual | `ONLINESTABLE` | Mencoba sinkronisasi ulang, menyetel ulang `retryCount = 0`. |

---

# 4. KESIAPAN MULTI-TENANCY (REGIONAL SAAS ARCHITECTURE)

*   **Masalah**: Database SIKAD v4.0 saat ini berarsitektur *single school*, tidak mendukung penggunaan multi-sekolah dalam satu instansi basis data.
*   **Solusi**: Merancang skema *Multi-Tenancy Shared Database* menggunakan pembatasan Supabase Row Level Security (RLS) berbasis klaim JWT.

### Spesifikasi Skema Database Multi-Tenancy

1.  **Kolom Tenant**: Menambahkan kolom `sekolah_id UUID` pada seluruh tabel master dan transaksi.
2.  **Pernyataan RLS Terisolasi**: RLS policy akan mengekstrak parameter `sekolah_id` dari JWT token sesi pengguna yang login.

```sql
-- Contoh RLS Policy Terisolasi untuk Multi-Sekolah
CREATE POLICY tenant_isolation_policy ON public.siswas
    FOR ALL
    TO authenticated
    USING (sekolah_id = (auth.jwt() ->> 'sekolah_id')::uuid);
```

*   **Keuntungan**: Keamanan data antar sekolah terjamin 100% di tingkat database PostgreSQL. Tidak ada risiko kebocoran data (*cross-tenant data leakage*) meskipun frontend menggunakan client SDK yang sama.

---

# KRITERIA PENERIMAAN REMEDIASI LANJUTAN (ACCEPTANCE)

✓ Kueri RLS Policy dengan klaim `sekolah_id` lolos simulasi unit test RLS.

✓ Modul dekripsi/enkripsi AES-GCM terbukti meloloskan pengujian enkripsi data string tanpa merusak format pencarian indeks non-sensitif.

✓ Logika *Exponential Backoff* berhasil membatasi penundaan hingga batas maksimal 5 menit pada pengujian koneksi jaringan simulasi buruk (*latency injection*).
