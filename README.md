# Kinetiq energy dashboard

Dashboard mengikuti empat referensi pengguna: Urbanist, kartu putih di atas pembangkit 3D, serta palet #FF760C, #FFD641, #AFE0FF, #0F0F0F, dan #FFFFFF. Scene Three.js berisi turbin berputar, panel surya, pepohonan, bangunan, pipa, dan bayangan.

## Menjalankan

```sh
npm install
npm run dev
```

```sh
npm run build
npm test
```

Tes browser memerlukan Chrome di lokasi standar macOS atau executable melalui `CHROME_PATH`, dan dev server aktif pada port 5173. Jalankan `npm run dev` sebelum `npm test`.

Semua angka dan profil adalah data demonstrasi dari mockup pengguna, bukan telemetri langsung. Prakiraan tambahan merupakan contoh, bukan informasi cuaca nyata. Tidak ada backend atau layanan cuaca yang dihubungkan.

## Arah desain dan pemeriksaan antislop

ENERGY 2 / RHYTHM 3 / MOTION 2: scene pembangkit menjadi fokus, susunan kartu asimetris mengikuti referensi, animasi hanya pada turbin untuk menggambarkan pembangkit yang beroperasi.

- Urbanist dan palet mengikuti referensi keempat, bukan pilihan font atau warna generik.
- Ruang terbuka di kiri menjaga scene dan judul terbaca; metrik dikelompokkan di kanan seperti referensi pertama.
- Kartu putih memisahkan data dari scene; radius besar mengikuti mockup dan radius kecil dipakai pada grafik.
- Gradasi oranye, kuning, dan biru menandai kartu capture performance sebagaimana referensi, tanpa menerapkannya pada semua kartu.
- Logo dan ikon petir mereproduksi identitas serta konteks energi di referensi. Panah membuka detail kartu, ikon kubus mengubah kamera.
- Dashboard memenuhi viewport tanpa margin luar sesuai koreksi pengguna. Scene memiliki bayangan matahari agar kedalaman geometri terbaca.
- Avatar inisial menghindari penggunaan foto orang rekaan. Profil diberi keterangan demo pada dialog.
- Mode terang dipertahankan untuk mencocokkan referensi. Tidak ada mode gelap yang diminta.
- Teks gauge dipergelap dibanding referensi agar terbaca di atas gradasi terang.
- Preferensi reduced motion menghentikan putaran otomatis, dan pengaturan menyediakan kontrol animasi.

Model pembangkit dibuat secara prosedural; model 3D asli dari mockup tidak tersedia. Bentuk aset dan tingkat detail bukan salinan identik dari render referensi.

## Halaman workspace

- **Assets**: tujuh aset demo, KPI, pencarian nama/ID/lokasi, filter tipe dan kondisi, pengurutan kondisi, detail aset, bauran pembangkitan, prioritas inspeksi, serta ekspor register sesuai filter.
- **Operations**: alert yang dapat diakui, work order dengan alur Queued → In progress → Completed, filter status, ringkasan shift, log aktivitas, dan ekspor pekerjaan. Mengakui alert tidak menghapus kondisi peralatan.
- **Analytics**: periode 24 jam, 7 hari, atau 30 hari; grafik total/wind/solar; bauran energi; insight terhitung; tabel data yang dapat dibuka; dan ekspor data. Data harian berasal dari penjumlahan sampel daya setiap satu jam. Periode yang tumpang tindih memakai nilai tanggal yang sama.
- **Reports**: pencarian dan filter library, empat template, pembuat laporan, pratinjau, dan unduhan CSV. Laporan baru menyimpan snapshot data saat dibuat.

Keempat halaman memakai seluruh area di bawah navigasi agar data mudah dibaca. Kartu KPI menampilkan ringkasan; tabel mempertahankan rincian; warna kuning menandai perhatian dan biru menandai pembangkitan. Semua tab memakai scene 3D bergerak yang sama serta palet oranye, kuning, dan biru dari Overview. Perpindahan tab memakai transisi fade/geser selama 320 ms, dinonaktifkan untuk preferensi reduced motion.

Data aset tambahan, work order, alert, serta riwayat pembangkitan merupakan data sintetis yang diberi label Demo dataset. Perubahan work order, acknowledgement, dan laporan disimpan dalam memori sesi saja, hilang saat refresh, serta tidak mengendalikan perangkat nyata. Tidak ada jadwal email, backend, atau ekspor PDF.
