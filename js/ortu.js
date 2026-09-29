(function () {
  "use strict";

  const user = DB.current();
  if (!user || user.role !== "ortu") return;

  const D = window.RUBEL_DATA;
  const { $, esc, avatar } = UI;
  const STEPS = [
    { id: "tujuan", label: "Tujuan" }, { id: "materi", label: "Materi" }, { id: "video", label: "Video" },
    { id: "lembar", label: "Lembar kerja" }, { id: "kuis", label: "Kuis" }, { id: "refleksi", label: "Refleksi" }
  ];
  const moodLabel = (id) => (D.moods.find((m) => m.id === id) || {}).label || "";
  const face = (id) => `<svg class="mini-face mood-${id}" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" class="face"/>${D.faces[id]}</svg>`;

  // Ide obrolan sesuai langkah yang belum dikerjakan anak
  const TONIGHT = {
    tujuan: (n) => `Tanyakan kepada ${n}: “Minggu ini kamu belajar tentang apa?” Lalu minta ia membuka halaman Tujuan dan membacakannya untuk Bapak/Ibu.`,
    materi: (n) => `Minta ${n} menceritakan perjalanan “Tetes”, si butir air, dengan kata-katanya sendiri. Bapak/Ibu cukup mendengarkan dan bertanya “lalu?”.`,
    video: (n) => `Tonton satu video pendek bersama ${n} (sekitar 3–4 menit). Setelah itu, minta ia menjelaskan satu hal yang paling ia ingat.`,
    lembar: (n) => `Coba percobaan “Hujan di Dalam Gelas” bersama ${n}. Butuh gelas bening, air hangat, piring kecil, dan es batu. Biarkan ia yang mengamati.`,
    kuis: (n) => `Temani ${n} mengerjakan kuis sekitar 5 menit. Kalau jawabannya keliru, katakan: “Tidak apa-apa, baca penjelasannya, yuk.”`,
    refleksi: (n) => `Ajak ${n} mengisi refleksi. Tanyakan: “Bagian mana yang paling seru? Bagian mana yang masih bikin bingung?”`,
    done: (n) => `${n} sudah menyelesaikan semua langkah! Beri pujian atas usahanya, lalu tanyakan: “Bagaimana cara keluarga kita menghemat air?”`
  };

  function render() {
    const me = DB.getUser(user.id);
    const child = DB.childOf(me);
    const greetWord = me.name.trim().split(/\s+/)[0];
    $("#greet").textContent = "Halo, " + (/^(ibu|bu|bapak|pak|ayah|bunda)$/i.test(greetWord) ? me.name.split(/\s+/).slice(0, 2).join(" ") : greetWord) + "!";

    if (!child) {
      $("#childFirst").textContent = "anak";
      $("#childCard").innerHTML = `<p class="empty">Akun anak tidak ditemukan. Hubungi guru kelas.</p>`;
      return;
    }

    const cls = DB.getClass(child.classCode) || { name: "-", subject: "" };
    const teacher = DB.getUser(cls.teacherId);
    const n = UI.firstName(child.name);
    const r = DB.summary(child.id);
    $("#childFirst").textContent = n;
    $("#childFirst2").textContent = n;
    $("#subjectChip").textContent = "Anak: " + n + " · " + cls.name;

    const lastAct = Math.max(r.last ? r.last.at : 0, r.lastJournal ? r.lastJournal.at : 0);
    $("#childCard").innerHTML = `
      ${avatar(child, "avatar-lg")}
      <div>
        <h2>${esc(child.name)}</h2>
        <p class="muted">${esc(cls.name)} · ${esc(cls.subject)} · Guru: ${esc(teacher ? teacher.name : "-")}</p>
      </div>
      <p class="child-active">${lastAct ? "Terakhir aktif<br><b>" + UI.ago(lastAct) + "</b>" : "Belum ada<br><b>aktivitas kuis/refleksi</b>"}</p>`;

    const done = r.done;
    const msgs = [
      `${n} belum memulai. Ajak ia membuka RUBEL bersama, yuk.`,
      `${n} sudah memulai. Awal yang baik!`,
      `${n} sudah menyelesaikan 2 dari 6 langkah.`,
      `${n} sudah setengah jalan.`,
      `${n} sudah menyelesaikan 4 dari 6 langkah.`,
      `Tinggal satu langkah lagi untuk ${n}.`,
      `${n} sudah menyelesaikan semua langkah. Luar biasa! 🌟`
    ];
    $("#journeyText").textContent = msgs[done];
    $("#ringNum").textContent = done + "/6";
    const c = 2 * Math.PI * 17;
    $("#ringFg").style.strokeDasharray = c;
    $("#ringFg").style.strokeDashoffset = c * (1 - done / 6);
    $("#journeyPath").innerHTML = STEPS.map((s, i) =>
      `<li class="${r.progress[s.id] ? "done" : ""}"><span class="stop">${r.progress[s.id] ? "✓" : i + 1}</span><span class="stop-label">${s.label}</span></li>`).join("");

    const lj = r.lastJournal;
    $("#childStats").innerHTML = `
      <div class="stat"><b>${r.last ? r.last.score + "<small>/" + r.last.total + "</small>" : "–"}</b><span>${r.last ? "nilai kuis terakhir" : "belum mengerjakan kuis"}</span></div>
      <div class="stat"><b>${r.attempts.length}<small>×</small></b><span>mencoba kuis${r.best >= 0 && r.attempts.length > 1 ? " · terbaik " + r.best + "/" + D.quiz.length : ""}</span></div>
      <div class="stat stat-mood">${lj ? face(lj.mood) : ""}<div><b class="stat-word">${lj ? esc(moodLabel(lj.mood)) : "–"}</b><span>perasaan setelah belajar</span></div></div>`;

    $("#lastReflect").innerHTML = lj ? `
      <p class="muted small">${UI.fmtDate(lj.at, { weekday: "long", day: "numeric", month: "long" })}</p>
      ${lj.a ? `<p><b>Aku belajar:</b> ${esc(lj.a)}</p>` : ""}
      ${lj.b ? `<p><b>Masih bingung:</b> ${esc(lj.b)}</p>` : ""}
      ${lj.c ? `<p><b>Ingin bertanya:</b> ${esc(lj.c)}</p>` : ""}
      <p class="small muted">Keyakinan bisa menjelaskan: ${"●".repeat(lj.conf)}${"○".repeat(5 - lj.conf)}</p>`
      : `<p class="muted">${esc(n)} belum menulis refleksi.</p>`;

    const next = STEPS.find((s) => !r.progress[s.id]);
    $("#tonightTip").textContent = TONIGHT[next ? next.id : "done"](n);

    $("#teacherName").textContent = teacher ? teacher.name : "guru";
    $("#teacherMsg").textContent = DB.classStore(cls.code).get("teacherMsg", "") || D.defaultTeacherMsg;

    return { child, cls };
  }

  const ctx = render() || {};
  UI.renderProfile(user, {
    info: [
      ["Peran", "Orang Tua"],
      ["Anak terhubung", ctx.child ? esc(ctx.child.name) : "-"],
      ["Kelas anak", ctx.cls ? esc(ctx.cls.name) : "-"]
    ],
    onChange: render
  });
  UI.initShell(user, { onRoute: (p) => { if (p === "beranda") render(); } });
  window.addEventListener("storage", render);
})();
