/* Akun contoh untuk mencoba RUBEL. Bukan data siswa sungguhan.
   Hapus file ini (dan tag <script>-nya di login.html) bila tidak diperlukan. */
window.RUBEL_SEED = {
  classCode: "SIKLUS",
  className: "Kelas V-A",

  teacher: { name: "Bu Sari Wulandari", username: "bu.sari", password: "guru123" },
  student: { name: "Dita Ayu Lestari", username: "dita", password: "siswa123", childCode: "DITA-2026" },
  parent:  { name: "Ibu Rina", username: "ibu.rina", password: "ortu123" },

  // Teman sekelas Dita (tidak bisa dipakai masuk) agar dasbor guru ada isinya.
  // attempts = daftar nomor soal (mulai 0) yang dijawab keliru di setiap percobaan.
  classmates: [
    { name: "Bima Pratama", username: "bima", done: ["tujuan", "materi", "video", "lembar", "kuis", "refleksi"],
      attempts: [[3, 6]], pemantik: "Airnya menguap karena panas matahari.",
      journal: { mood: "senang", a: "Air menguap jadi awan lalu turun hujan.", b: "Tidak ada.", c: "", conf: 4 } },
    { name: "Citra Kirana", username: "citra", done: ["tujuan", "materi", "video", "kuis"],
      attempts: [[3]], pemantik: "Diserap tanah." },
    { name: "Fajar Nugroho", username: "fajar", done: ["tujuan", "materi", "kuis", "refleksi"],
      attempts: [[2, 3, 5, 6], [3]], pemantik: "Hilang karena panas.",
      journal: { mood: "bingung", a: "Siklus air.", b: "Bedanya menguap dan mengembun.", c: "Kenapa awan tidak jatuh padahal isinya air?", conf: 2 } },
    { name: "Gita Maharani", username: "gita", done: ["tujuan"] },
    { name: "Hana Salsabila", username: "hana", done: ["tujuan", "materi", "video", "lembar", "kuis", "refleksi"],
      attempts: [[]], pemantik: "Menguap ke udara, nanti jadi awan.",
      journal: { mood: "senang", a: "Air tidak pernah habis, hanya berpindah.", b: "Tidak ada.", c: "Apakah air laut yang asin bisa jadi hujan tawar?", conf: 5 } },
    { name: "Raka Aditya", username: "raka", done: [] },
    { name: "Salsa Putri", username: "salsa", done: ["tujuan", "materi", "kuis", "refleksi"],
      attempts: [[1, 3, 6]],
      journal: { mood: "lelah", a: "Hujan dan awan.", b: "Urutan siklusnya.", c: "", conf: 2 } }
  ]
};
