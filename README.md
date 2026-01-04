
# 🌌 Teyvat AI Terminal - Project Documentation

Web AI Interaktif dengan tema UI/UX Genshin Impact yang mewah, mendukung voice chat realtime, generasi gambar/video, dan sistem penyimpanan cloud (VFS).

---

## 🔑 1. Setup API Key & Kredensial

Demi keamanan, proyek ini tidak menampilkan API Key secara telanjang di kode. Kita menggunakan enkripsi Base64 sederhana.

### A. Mendapatkan API Key

1.  **Google Gemini API (Wajib)**
    *   Buka [Google AI Studio](https://aistudio.google.com/).
    *   Klik "Get API Key" -> "Create API Key".
    *   Copy key tersebut (dimulai dengan `AIza...`).

2.  **Supabase (Untuk Database & Login)**
    *   Buka [Supabase Dashboard](https://supabase.com/dashboard).
    *   Buat Project Baru.
    *   Ke menu **Settings** (icon gerigi) -> **API**.
    *   Copy **Project URL** dan **anon / public Key**.

3.  **Evolink (Opsional - Untuk Gambar NSFW/Uncensored)**
    *   Daftar di [Evolink.ai](https://evolink.ai).
    *   Generate API Key di dashboard mereka.

### B. Memasang Kredensial ke File System

Buka file `services/credentials.ts` di source code.

1.  **Encode Key Anda ke Base64**:
    *   Buka Console Browser (Tekan F12 -> Klik tab Console).
    *   Ketik: `btoa("URL_SUPABASE_ANDA")` -> Tekan Enter -> Copy hasilnya.
    *   Ketik: `btoa("ANON_KEY_SUPABASE_ANDA")` -> Tekan Enter -> Copy hasilnya.
2.  **Paste ke Code**:
    *   Ganti nilai `ENCRYPTED_URL` dan `ENCRYPTED_KEY` di `services/credentials.ts` dengan hasil copy tadi.

---

## 🗄️ 2. Setup Database Otomatis

Sistem memiliki fitur **"Schema Check"**.

1.  Jalankan aplikasi web.
2.  Jika aplikasi mendeteksi koneksi Supabase berhasil tetapi tabel belum ada, akan muncul **Popup Modal**.
3.  Klik tombol **"Copy SQL Script"** di popup tersebut.
4.  Buka Dashboard Supabase -> Menu **SQL Editor** (icon kertas di kiri).
5.  Paste script tadi dan klik **RUN**.
6.  Refresh aplikasi web. Database siap digunakan!

---

## 🤖 3. Menambahkan Model AI Baru

Anda bisa menambah model AI baru tanpa mengubah logika inti, cukup edit file `data.ts`.

1.  Buka file `data.ts`.
2.  Cari variabel `AI_MODELS` (untuk Text) atau `IMAGE_GEN_MODELS` (untuk Gambar).
3.  Tambahkan objek baru ke dalam array.

**Contoh Menambah Model Text:**
```typescript
export const AI_MODELS = [
    // ... model lama
    { 
        id: "gemini-1.5-pro-latest", // ID Model dari dokumentasi Google
        label: "Gemini 1.5 Pro",     // Nama yang tampil di UI
        desc: "High reasoning model" // Deskripsi singkat
    },
];
```

**Contoh Menambah Model Gambar (Evolink):**
```typescript
export const IMAGE_GEN_MODELS = [
    // ... model lama
    { 
        id: "evo-flux-pro",          // Prefix 'evo-' wajib untuk provider Evolink
        label: "Flux Pro Realism", 
        provider: "Evolink", 
        desc: "Photorealistic" 
    },
];
```

---

## 🛠️ Troubleshooting

*   **Error `atob` failed**: Artinya string di `credentials.ts` bukan format Base64 yang valid. Pastikan tidak ada spasi saat copy-paste.
*   **Supabase tidak connect**: Pastikan Anda mengcopy "Project URL" (bukan domain browser) dan "anon public key" (bukan service_role).
*   **Google Login Gagal**: Di Supabase Dashboard -> Authentication -> Providers -> Google, pastikan sudah diaktifkan. Dan pastikan di Google Cloud Console, "Authorized redirect URIs" sudah mengarah ke domain Supabase Anda (`https://<project-id>.supabase.co/auth/v1/callback`).

---

**Created with ❤️ by Akasha Developers**
