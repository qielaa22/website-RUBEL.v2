(function () {
  "use strict";

  const user = DB.current();
  if (!user || user.role !== "guru") return;

  const D = window.RUBEL_DATA;
  const { $, $$, esc, toast, avatar } = UI;
  let cls = DB.classOfTeacher(user.id) || DB.getClass(user.classCode);
  const cstore = DB.classStore(cls.code);
  const TOTAL = D.quiz.length;
  const STEPS = ["tujuan", "materi", "video", "lembar", "kuis", "refleksi"];
  const STEP_LABEL = { tujuan: "Tujuan", materi: "Materi", video: "Video", lembar: "Lembar kerja", kuis: "Kuis", refleksi: "Refleksi" };
  const moodLabel = (id) => (D.moods.find((m) => m.id === id) || {}).label || "";
  const face = (id, cls = "") => id ? `<svg class="mini-face mood-${id} ${cls}" viewBox="0 0 48 48" aria-label="${esc(moodLabel(id))}" role="img"><circle cx="24" cy="24" r="20" class="face"/>${D.faces[id]}</svg>` : "";

  /* ---------- Data kelas ---------- */
  function loadClass() {
    return DB.studentsOf(cls.code).map((s) => Object.assign({ user: s }, DB.summary(s.id)));
  }

  function needs(r) {
    const why = [];
    if (r.done === 0) why.push("Belum mulai belajar");
    if (r.last && r.last.score / r.last.total < 0.6) why.push(`Nilai kuis ${r.last.score}/${r.last.total}`);
    if (r.lastJournal && (r.lastJournal.mood === "bingung" || r.lastJournal.mood === "lelah")) why.push("Merasa " + moodLabel(r.lastJournal.mood).toLowerCase());
    return why;
  }

  function wrongCounts(rows) {
    const counts = D.quiz.map(() => 0);
    rows.forEach((r) => { if (r.last) r.last.wrong.forEach((i) => counts[i]++); });
    return counts;
  }

  /* ---------- Beranda ---------- */
  function greetName(name) {
    const w = String(name).trim().split(/\s+/);
    return /^(bu|ibu|pak|bapak)$/i.test(w[0]) && w[1] ? w[0] + " " + w[1] : w[0];
  }
  function renderHome(rows) {
    const h = new Date().getHours();
    const salam = h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
    $("#greet").textContent = salam + ", " + greetName(DB.getUser(user.id).name) + "!";
    $("#clsNameHead").textContent = cls.name;
    $("#classCode").textContent = cls.code;
    $("#subjectChip").textContent = cls.subject + " · " + cls.name;

    const n = rows.length;
    const tried = rows.filter((r) => r.last);
    const avg = tried.length ? tried.reduce((s, r) => s + r.last.score, 0) / tried.length : 0;
    const finished = rows.filter((r) => r.done === 6).length;
    $("#statTiles").innerHTML = `
      <div class="stat"><b>${n}</b><span>siswa terdaftar</span></div>
      <div class="stat"><b>${tried.length}<small>/${n}</small></b><span>sudah mengerjakan kuis</span></div>
      <div class="stat"><b>${tried.length ? avg.toFixed(1).replace(".", ",") : "–"}<small>/${TOTAL}</small></b><span>rata-rata nilai kuis</span></div>
      <div class="stat"><b>${finished}<small>/${n}</small></b><span>menyelesaikan semua langkah</span></div>`;

    const att = rows.map((r) => ({ r, why: needs(r) })).filter((x) => x.why.length);
    $("#attentionList").innerHTML = att.length
      ? att.map(({ r, why }) => `
          <li><button type="button" class="person" data-sid="${r.user.id}">
            ${avatar(r.user)}<span><b>${esc(r.user.name)}</b><small>${why.map(esc).join(" · ")}</small></span><span class="chev" aria-hidden="true">›</span>
          </button></li>`).join("")
      : `<li class="empty">Semua siswa baik-baik saja. 🌤️</li>`;

    const wc = wrongCounts(rows);
    const worst = wc.indexOf(Math.max(...wc));
    const confused = rows.filter((r) => r.lastJournal && r.lastJournal.b && !/^tidak ada\.?$/i.test(r.lastJournal.b.trim())).length;
    const notStarted = rows.filter((r) => r.done === 0).length;
    const tips = [];
    if (tried.length && wc[worst]) tips.push(`Bahas lagi <b>soal ${worst + 1}</b>: “${esc(D.quiz[worst].q)}”. ${wc[worst]} siswa masih keliru.`);
    if (confused) tips.push(`<b>${confused} siswa</b> menulis bagian yang masih membingungkan. <a href="#suara">Lihat tulisan mereka</a>.`);
    if (notStarted) tips.push(`<b>${notStarted} siswa</b> belum mulai. Ingatkan lewat grup kelas atau beri waktu di sekolah.`);
    if (!tips.length) tips.push("Belum ada data yang perlu ditindaklanjuti. Bagikan kode kelas agar siswa mulai belajar.");
    $("#beforeClass").innerHTML = `<ul class="tips-list">${tips.map((t) => `<li>${t}</li>`).join("")}</ul>`;
  }

  /* ---------- Daftar siswa ---------- */
  let filter = "all";
  function renderStudents(rows) {
    $("#navCount").textContent = rows.length || "";
    const q = $("#studentSearch").value.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (q && !r.user.name.toLowerCase().includes(q)) return false;
      if (filter === "help") return needs(r).length > 0;
      if (filter === "done") return r.done === 6;
      return true;
    });
    $("#studentList").innerHTML = list.length ? list.map((r) => `
      <li>
        <button type="button" class="student-row" data-sid="${r.user.id}">
          ${avatar(r.user)}
          <span class="sr-name"><b>${esc(r.user.name)}</b><small>@${esc(r.user.username)}</small></span>
          <span class="sr-prog">
            <span class="mini-steps" aria-label="${r.done} dari 6 langkah">${STEPS.map((k) => `<i class="${r.progress[k] ? "on" : ""}" title="${STEP_LABEL[k]}"></i>`).join("")}</span>
            <small>${r.done}/6 langkah</small>
          </span>
          <span class="sr-score">${r.last ? `<span><b>${r.last.score}</b>/${r.last.total}</span><small>${r.attempts.length}× mencoba</small>` : `<span class="muted small">Belum kuis</span>`}</span>
          <span class="sr-mood">${r.lastJournal ? face(r.lastJournal.mood) : ""}</span>
          <span class="chev" aria-hidden="true">›</span>
        </button>
      </li>`).join("")
      : `<li class="empty">${rows.length ? "Tidak ada siswa yang cocok." : "Belum ada siswa. Bagikan kode kelas <b>" + esc(cls.code) + "</b> agar siswa bisa mendaftar."}</li>`;
  }
  $("#studentSearch").addEventListener("input", () => renderStudents(loadClass()));
  $$("#studentFilter .chip").forEach((c) => c.addEventListener("click", () => {
    filter = c.dataset.filter;
    $$("#studentFilter .chip").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
    renderStudents(loadClass());
  }));

  /* ---------- Detail siswa ---------- */
  const dlg = $("#studentDlg");
  function openStudent(id) {
    const s = DB.getUser(id);
    if (!s) return;
    const r = DB.summary(id);
    const parents = DB.parentsOf(id);
    const blank = '<span class="muted">belum diisi</span>';
    const val = (v) => (v && String(v).trim() ? esc(v) : blank);
    $("#studentDlgBody").innerHTML = `
      <header class="sheet-head">
        ${avatar(s, "avatar-lg")}
        <div><h2 id="dlgTitle">${esc(s.name)}</h2><p class="muted small">@${esc(s.username)} · Orang tua: ${parents.length ? parents.map((p) => esc(p.name)).join(", ") : "belum terhubung"}</p></div>
        <button type="button" class="icon-btn sheet-close" id="dlgClose" aria-label="Tutup">✕</button>
      </header>

      <ol class="journey-path compact">${STEPS.map((k, i) => `<li class="${r.progress[k] ? "done" : ""}"><span class="stop">${r.progress[k] ? "✓" : i + 1}</span><span class="stop-label">${STEP_LABEL[k]}</span></li>`).join("")}</ol>

      <h3>Riwayat kuis</h3>
      ${r.attempts.length ? `<ul class="attempts">${r.attempts.map((a, i) => `
        <li><span class="att-n">Ke-${i + 1}</span><b>${a.score}/${a.total}</b>
        <span class="muted small">${a.wrong.length ? "keliru di soal " + a.wrong.map((w) => w + 1).join(", ") : "semua benar"}</span>
        <span class="muted small att-date">${UI.ago(a.at)}</span></li>`).join("")}</ul>` : `<p class="muted">Belum mengerjakan kuis.</p>`}

      <h3>Pertanyaan pemantik</h3>
      <p class="quote">${val(r.pemantik)}</p>

      <h3>Jawaban “Coba pikirkan” di materi</h3>
      <ol class="think-list">${D.materi.map((m, i) => `<li><span class="muted small">${esc(m.think)}</span><br>${val(r.think[i])}</li>`).join("")}</ol>

      <h3>Lembar kerja</h3>
      <dl class="info-list tight">
        <div><dt>Menit ke-1</dt><dd>${val(r.lk.obs1)}</dd></div>
        <div><dt>Menit ke-5</dt><dd>${val(r.lk.obs5)}</dd></div>
        <div><dt>Menit ke-10</dt><dd>${val(r.lk.obs10)}</dd></div>
        <div><dt>Soal 1</dt><dd>${val(r.lk.q1)}</dd></div>
        <div><dt>Soal 2</dt><dd>${val(r.lk.q2)}</dd></div>
        <div><dt>Soal 3</dt><dd>${val(r.lk.q3)}</dd></div>
        <div><dt>Soal 4</dt><dd>${val(r.lk.q4)}</dd></div>
      </dl>

      <h3>Refleksi</h3>
      ${r.journal.length ? r.journal.slice().reverse().map((j) => `
        <article class="journal-entry">
          <p class="j-head">${face(j.mood)} <b>${esc(moodLabel(j.mood))}</b> <span class="muted small">· ${UI.ago(j.at)} · keyakinan ${j.conf}/5</span></p>
          ${j.a ? `<p><b>Belajar:</b> ${esc(j.a)}</p>` : ""}
          ${j.b ? `<p><b>Masih bingung:</b> ${esc(j.b)}</p>` : ""}
          ${j.c ? `<p><b>Bertanya:</b> ${esc(j.c)}</p>` : ""}
        </article>`).join("") : `<p class="muted">Belum menulis refleksi.</p>`}`;
    $("#dlgClose").addEventListener("click", () => dlg.close());
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sid]");
    if (b) openStudent(b.dataset.sid);
  });

  /* ---------- Rekap kuis ---------- */
  function renderRekap(rows) {
    const tried = rows.filter((r) => r.last);
    if (!tried.length) {
      $("#rekapBox").innerHTML = `<p class="empty">Belum ada siswa yang mengerjakan kuis.</p>`;
    } else {
      const wc = wrongCounts(rows);
      const max = Math.max(...wc, 1);
      const worst = wc.indexOf(Math.max(...wc));
      const dist = D.quiz.map(() => 0).concat(0);
      tried.forEach((r) => dist[r.last.score]++);
      $("#rekapBox").innerHTML = `
        <div class="card-head"><div><h2>Jawaban keliru per soal</h2><p class="muted small">${tried.length} dari ${rows.length} siswa sudah mengerjakan.</p></div></div>
        ${wc[worst] ? `<p class="callout"><span class="hand">Saran untuk kelas berikutnya:</span> bahas lagi <b>soal ${worst + 1}</b> — “${esc(D.quiz[worst].q)}”. ${wc[worst]} siswa masih keliru.</p>` : `<p class="callout"><span class="hand">Hebat!</span> Semua siswa menjawab benar di percobaan terakhir.</p>`}
        <ul class="bars bars-q">
          ${wc.map((w, i) => `
            <li class="${i === worst && w ? "hot" : ""}">
              <span class="bar-label"><b>Soal ${i + 1}</b><small>${esc(D.quiz[i].q)}</small></span>
              <span class="bar-track"><span class="bar-fill" style="width:${(w / max) * 100}%"></span></span>
              <span class="bar-val">${w}</span>
            </li>`).join("")}
        </ul>
        <h3 class="small-head">Sebaran nilai (percobaan terakhir)</h3>
        <div class="dist">${dist.map((c, s) => `<div class="dist-col" title="${c} siswa mendapat ${s}"><span class="dist-bar" style="height:${c ? 12 + (c / Math.max(...dist)) * 70 : 0}px"></span><b>${c || ""}</b><small>${s}</small></div>`).join("")}</div>`;
    }

    const pem = rows.filter((r) => r.pemantik && r.pemantik.trim());
    $("#pemantikList").innerHTML = pem.length
      ? pem.map((r) => `<li>${avatar(r.user, "avatar-sm")}<div><b>${esc(UI.firstName(r.user.name))}</b><p>${esc(r.pemantik)}</p></div></li>`).join("")
      : `<li class="empty">Belum ada yang menjawab.</li>`;
  }

  /* ---------- Suara siswa ---------- */
  function renderVoices(rows) {
    const moods = {};
    rows.forEach((r) => { if (r.lastJournal) moods[r.lastJournal.mood] = (moods[r.lastJournal.mood] || 0) + 1; });
    $("#moodSum").innerHTML = D.moods.map((m) => `<li>${face(m.id)}<b>${moods[m.id] || 0}</b> ${m.label.toLowerCase()}</li>`).join("");

    const items = (key) => rows.flatMap((r) => r.journal.filter((j) => j[key] && !/^tidak ada\.?$/i.test(j[key].trim())).map((j) => ({ r, j })))
      .sort((a, b) => b.j.at - a.j.at);
    const li = ({ r, j }, key) => `<li>${avatar(r.user, "avatar-sm")}<div><b>${esc(UI.firstName(r.user.name))}</b> <span class="muted small">· ${UI.ago(j.at)}</span><p>${esc(j[key])}</p></div></li>`;
    const conf = items("b"), ques = items("c");
    $("#confusedList").innerHTML = conf.length ? conf.map((x) => li(x, "b")).join("") : `<li class="empty">Belum ada.</li>`;
    $("#questionList").innerHTML = ques.length ? ques.map((x) => li(x, "c")).join("") : `<li class="empty">Belum ada.</li>`;
    $("#navVoice").textContent = conf.length + ques.length || "";
  }

  /* ---------- Atur isi & bagikan ---------- */
  const ytId = (url) => { const m = String(url || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : null; };
  function renderSettings() {
    $("#teacherMsg").value = cstore.get("teacherMsg", "") || D.defaultTeacherMsg;
    const urls = cstore.get("videoUrls", []);
    $("#videoUrls").innerHTML = D.videos.map((v, i) => `
      <label class="small muted" for="vurl${i}">Video ${i + 1}: ${esc(v.title)} (${v.minutes} menit)</label>
      <input type="url" id="vurl${i}" data-vurl="${i}" value="${esc(urls[i] || "")}" placeholder="https://youtu.be/...">`).join("");
    $("#qrClassCode").textContent = cls.code;
  }
  $("#settingsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    cstore.set("teacherMsg", $("#teacherMsg").value.trim());
    const urls = $$("[data-vurl]").map((el) => el.value.trim());
    cstore.set("videoUrls", urls);
    const bad = urls.filter((u) => u && !ytId(u)).length;
    toast(bad ? "Tersimpan, tapi ada tautan yang bukan tautan YouTube." : "Perubahan tersimpan. Siswa langsung melihatnya.");
  });

  function renderQR() {
    const url = $("#shareUrl").value.trim();
    const box = $("#qrBox");
    const note = $("#qrNote");
    box.innerHTML = "";
    if (!url) { note.textContent = "Isi alamat situs untuk membuat kode QR."; return; }
    if (typeof QRCode === "undefined") { note.textContent = "Kode QR butuh koneksi internet untuk dibuat."; return; }
    new QRCode(box, { text: url, width: 150, height: 150, colorDark: "#2B2A26", colorLight: "#FFFDF8", correctLevel: QRCode.CorrectLevel.M });
    note.textContent = /^(file:|http:\/\/localhost)/.test(url) ? "Ini alamat di komputer Anda. Ganti dengan alamat situs setelah diterbitkan." : "Pindai dengan kamera HP untuk membuka RUBEL.";
  }
  function initShare() {
    $("#shareUrl").value = cstore.get("shareUrl", "") || new URL("login.html", location.href).href;
    let t;
    $("#shareUrl").addEventListener("input", () => { cstore.set("shareUrl", $("#shareUrl").value.trim()); clearTimeout(t); t = setTimeout(renderQR, 350); });
    $("#copyUrl").addEventListener("click", () => UI.copy($("#shareUrl").value.trim(), "Tautan disalin. Tinggal tempel di grup kelas."));
    if (typeof QRCode === "undefined") window.addEventListener("load", renderQR); else renderQR();
  }
  $("#copyCode").addEventListener("click", () => UI.copy(cls.code, "Kode kelas disalin."));

  /* ---------- Profil ---------- */
  function renderMyProfile() {
    UI.renderProfile(user, {
      info: [
        ["Peran", "Guru"],
        ["Kelas", esc(cls.name)],
        ["Mata pelajaran", esc(cls.subject)],
        ["Kode kelas", `<code class="code-pill">${esc(cls.code)}</code>`],
        ["Jumlah siswa", String(DB.studentsOf(cls.code).length)]
      ],
      extraTop: `
        <form class="card" id="classForm">
          <h2>Data kelas</h2>
          <div class="grid-2 tight">
            <div><label class="field-label" for="cfName">Nama kelas</label><input type="text" id="cfName" maxlength="30" value="${esc(cls.name)}"></div>
            <div><label class="field-label" for="cfSubject">Mata pelajaran</label><input type="text" id="cfSubject" maxlength="30" value="${esc(cls.subject)}"></div>
          </div>
          <button class="btn btn-soft" type="submit">Simpan data kelas</button>
        </form>`,
      afterRender: () => $("#classForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const name = $("#cfName").value.trim(), subject = $("#cfSubject").value.trim();
        if (name.length < 2) { toast("Nama kelas minimal 2 huruf."); return; }
        cls = DB.updateClass(cls.code, { name, subject: subject || cls.subject });
        refresh();
        renderMyProfile();
        toast("Data kelas tersimpan.");
      }),
      onChange: () => refresh()
    });
  }

  /* ---------- Mulai ---------- */
  function refresh() {
    const rows = loadClass();
    renderHome(rows);
    renderStudents(rows);
    renderRekap(rows);
    renderVoices(rows);
  }
  refresh();
  renderSettings();
  renderMyProfile();
  initShare();
  // Muat ulang data saat berpindah halaman agar selalu terbaru
  UI.initShell(user, { onRoute: (p) => { if (p !== "atur" && p !== "profil") refresh(); } });
  window.addEventListener("storage", refresh);
})();
