(function () {
  "use strict";

  const user = DB.current();
  if (!user || user.role !== "siswa") return;

  const D = window.RUBEL_DATA;
  const { $, $$, esc, toast } = UI;
  const store = DB.userStore(user.id);
  const cls = DB.getClass(user.classCode) || { name: "-", code: user.classCode, subject: "IPAS" };
  const classStore = DB.classStore(cls.code);
  const teacher = DB.getUser(cls.teacherId);

  /* ---------- Progres belajar ---------- */
  const STOPS = [
    { id: "tujuan", label: "Tujuan" },
    { id: "materi", label: "Materi" },
    { id: "video", label: "Video" },
    { id: "lembar", label: "Lembar kerja" },
    { id: "kuis", label: "Kuis" },
    { id: "refleksi", label: "Refleksi" }
  ];
  const progress = store.get("progress", {});

  function markDone(id) {
    if (progress[id]) return;
    progress[id] = true;
    store.set("progress", progress);
    renderProgress();
    const stop = STOPS.find((s) => s.id === id);
    if (stop) toast("Hore! Langkah “" + stop.label + "” selesai 🎉");
  }

  function renderProgress() {
    const done = STOPS.filter((s) => progress[s.id]).length;
    $("#journeyPath").innerHTML = STOPS.map((s, i) =>
      `<li class="${progress[s.id] ? "done" : ""}">
        <a href="#${s.id}"><span class="stop">${progress[s.id] ? "✓" : i + 1}</span><span class="stop-label">${s.label}</span></a>
      </li>`).join("");

    const msgs = [
      "Kamu belum memulai. Ayo, langkah pertama itu yang paling penting!",
      "Awal yang bagus! Satu langkah sudah selesai.",
      "Kamu sudah menyelesaikan 2 dari 6 langkah. Terus, ya!",
      "Sudah setengah jalan. Hebat!",
      "4 dari 6 langkah selesai. Sedikit lagi!",
      "Tinggal satu langkah lagi. Kamu pasti bisa!",
      "Semua langkah selesai. Terima kasih sudah belajar dengan sungguh-sungguh! 🌟"
    ];
    $("#journeyText").textContent = msgs[done];
    $("#ringNum").textContent = done + "/6";
    const c = 2 * Math.PI * 17;
    const fg = $("#ringFg");
    fg.style.strokeDasharray = c;
    fg.style.strokeDashoffset = c * (1 - done / 6);

    STOPS.forEach((s) => {
      const t = $(`[data-tick="${s.id}"]`);
      if (t) t.classList.toggle("on", !!progress[s.id]);
    });

    const next = STOPS.find((s) => !progress[s.id]);
    const cont = $("#continueBtn");
    if (done === 0 || !next) cont.hidden = true;
    else { cont.hidden = false; cont.href = "#" + next.id; cont.textContent = "Lanjut: " + next.label; }
  }

  /* ---------- Simpan otomatis semua isian ---------- */
  function flashSaved(el) {
    const scope = el.closest(".page");
    const s = scope && $("[data-save-state]", scope);
    if (!s) return;
    s.classList.add("pulse");
    s.textContent = "Tersimpan ✓";
    clearTimeout(s._t);
    s._t = setTimeout(() => { s.classList.remove("pulse"); s.textContent = "Tersimpan otomatis"; }, 1400);
  }
  function bindAutosave(root) {
    $$("[data-save]", root).forEach((el) => {
      const key = "f." + el.dataset.save;
      el.value = store.get(key, "");
      el.addEventListener("input", () => { store.set(key, el.value); flashSaved(el); });
    });
  }

  /* ---------- Beranda ---------- */
  function renderHello() {
    $("#helloName").textContent = UI.firstName(DB.getUser(user.id).name);
    $("#className").textContent = cls.name;
    $("#teacherName").textContent = teacher ? teacher.name : "-";
    $("#teacherNameNote").textContent = teacher ? teacher.name : "gurumu";
    $("#subjectChip").textContent = cls.subject + " · " + cls.name + " · Siklus Air";
    $("#teacherMsgView").textContent = classStore.get("teacherMsg", "") || D.defaultTeacherMsg;
  }

  /* ---------- Tujuan ---------- */
  function renderGoals() {
    const checked = store.get("goals", []);
    $("#goalList").innerHTML = D.goals.map((g, i) => `
      <li class="goal">
        <span class="goal-num">${i + 1}</span>
        <p>${esc(g)}</p>
        <label class="goal-check">
          <input type="checkbox" data-goal="${i}" ${checked.includes(i) ? "checked" : ""}>
          <span class="box" aria-hidden="true"></span>
          <span>Aku sudah bisa</span>
        </label>
      </li>`).join("");
    $$("[data-goal]").forEach((cb) => cb.addEventListener("change", () => {
      store.set("goals", $$("[data-goal]").filter((c) => c.checked).map((c) => +c.dataset.goal));
      if (cb.checked) toast("Keren! Satu tujuan tercapai.");
    }));
  }

  /* ---------- Materi ---------- */
  const SCENES = {
    1: { parts: "all", pos: [250, 205] },
    2: { parts: ["sun", "sea", "evap"], pos: [172, 188] },
    3: { parts: ["evap", "cloud", "wind", "cloud2"], pos: [282, 80] },
    4: { parts: ["cloud2", "rain", "mountain", "ground"], pos: [478, 138] },
    5: { parts: ["mountain", "river", "soak", "ground", "sea"], pos: [396, 272] }
  };
  let chunkIdx = Math.min(store.get("chunkIdx", 0), D.materi.length - 1);
  const seen = new Set(store.get("chunksSeen", []));

  function setScene(n, caption) {
    const sc = SCENES[n];
    $$(".cycle .part").forEach((g) => g.classList.toggle("dim", sc.parts !== "all" && !sc.parts.includes(g.dataset.p)));
    $("#tetes").style.transform = `translate(${sc.pos[0]}px, ${sc.pos[1]}px)`;
    $("#cycleCaption").textContent = caption;
  }

  function chunkHTML(c, i, forPrint) {
    return `
      <p class="eyebrow">Bagian ${i + 1} dari ${D.materi.length}</p>
      <h2>${c.title}</h2>
      ${c.body.map((p) => `<p>${p}</p>`).join("")}
      ${c.word ? `<p class="word"><span class="hand">Kata penting</span><b>${c.word[0]}</b> = ${c.word[1]}</p>` : ""}
      ${c.care ? `<p class="care"><span aria-hidden="true">🌿</span> ${c.care}</p>` : ""}
      <div class="think">
        <p class="hand">Coba pikirkan sebentar…</p>
        <p>${c.think}</p>
        ${forPrint ? "" : `<textarea rows="2" data-save="think.${i}" aria-label="Jawabanmu untuk pertanyaan: ${esc(c.think)}" placeholder="Tulis jawabanmu (boleh singkat)"></textarea>`}
      </div>`;
  }

  function renderChunk() {
    const c = D.materi[chunkIdx];
    const box = $("#chunkBox");
    box.classList.remove("in");
    void box.offsetWidth;
    box.innerHTML = chunkHTML(c, chunkIdx, false);
    box.classList.add("in");
    bindAutosave(box);
    setScene(c.scene, c.caption);

    $("#stepDots").innerHTML = D.materi.map((m, i) => `
      <button role="tab" type="button" data-step="${i}" aria-selected="${i === chunkIdx}" class="${seen.has(i) ? "seen" : ""}" title="${esc(m.title)}">
        <span>${i + 1}</span><em>${esc(m.title)}</em>
      </button>`).join("");
    $$("#stepDots button").forEach((b) => b.addEventListener("click", () => { chunkIdx = +b.dataset.step; saveChunk(); renderChunk(); }));

    $("#prevChunk").disabled = chunkIdx === 0;
    const last = chunkIdx === D.materi.length - 1;
    $("#nextChunk").innerHTML = last ? "Aku paham semuanya ✓" : 'Aku paham, lanjut <span aria-hidden="true">→</span>';
  }
  const saveChunk = () => store.set("chunkIdx", chunkIdx);
  function scrollToMateri() {
    // Di layar kecil, gulir ke gambar agar anak melihat Tetes berpindah
    if (window.innerWidth < 1100) $(".cycle-fig").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("#prevChunk").addEventListener("click", () => { if (chunkIdx > 0) { chunkIdx--; saveChunk(); renderChunk(); scrollToMateri(); } });
  $("#nextChunk").addEventListener("click", () => {
    seen.add(chunkIdx);
    store.set("chunksSeen", [...seen]);
    if (chunkIdx < D.materi.length - 1) {
      chunkIdx++; saveChunk(); renderChunk(); scrollToMateri();
    } else {
      renderChunk();
      if (seen.size === D.materi.length) markDone("materi");
      else toast("Masih ada bagian yang belum kamu baca. Cek titik yang belum berwarna, ya.");
    }
  });

  $("#printMateri").addEventListener("click", () => {
    $("#printMateriAll").innerHTML = D.materi.map((c, i) => `<article class="print-chunk">${chunkHTML(c, i, true)}</article>`).join("") +
      `<p><b>Ringkasan:</b> menguap → mengembun → hujan → meresap &amp; mengalir → kembali lagi.</p>`;
    document.body.classList.add("printing-materi");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-materi"), 500);
  });

  /* ---------- Video ---------- */
  const ytId = (url) => { const m = String(url || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : null; };
  function renderVideos() {
    const urls = classStore.get("videoUrls", []);
    const watched = store.get("watched", []);
    $("#videoList").innerHTML = D.videos.map((v, i) => {
      const id = ytId(urls[i]);
      const player = id
        ? `<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${esc(v.title)}" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
        : `<div class="video-empty">
             <svg viewBox="0 0 80 60" aria-hidden="true"><rect x="4" y="6" width="72" height="48" rx="10"/><path d="M33 20l16 10-16 10z"/></svg>
             <p>Video belum dipasang.</p>
             <p class="small">Gurumu akan segera menambahkannya.</p>
           </div>`;
      const isW = watched.includes(i);
      return `
        <article class="card video-card ${isW ? "watched" : ""}">
          <div class="player">${player}</div>
          <div class="video-info">
            <p class="eyebrow">Video ${i + 1} · ${v.minutes} menit</p>
            <h3>${esc(v.title)}</h3>
            <p class="look"><span class="hand">Yang dicari:</span> ${esc(v.look)}</p>
            <label class="field-label" for="vnote${i}">Catatanku</label>
            <textarea id="vnote${i}" rows="2" data-save="vnote.${i}" placeholder="Tulis hal penting yang kamu dengar atau lihat"></textarea>
            <button type="button" class="btn ${isW ? "btn-soft" : "btn-ghost"} btn-sm" data-watch="${i}">${isW ? "Sudah kutonton ✓" : "Tandai sudah ditonton"}</button>
          </div>
        </article>`;
    }).join("");
    bindAutosave($("#videoList"));
    $$("[data-watch]").forEach((b) => b.addEventListener("click", () => {
      const i = +b.dataset.watch;
      let w = store.get("watched", []);
      w = w.includes(i) ? w.filter((x) => x !== i) : w.concat(i);
      store.set("watched", w);
      renderVideos();
      if (w.length === D.videos.length) markDone("video");
    }));
  }

  /* ---------- Lembar kerja ---------- */
  const renderLkDone = () => { $("#lkDoneMsg").textContent = progress.lembar ? "Sudah selesai. Kerja bagus!" : ""; };
  $("#lkDone").addEventListener("click", () => {
    const filled = $$("#lembar [data-save]").filter((el) => el.value.trim()).length;
    if (filled < 3) { toast("Isi dulu beberapa jawaban, ya. Minimal 3 kotak."); return; }
    markDone("lembar");
    renderLkDone();
  });

  /* ---------- Kuis ---------- */
  let qi = 0, qAnswers = [];
  function renderQuiz() {
    const box = $("#quizBox");
    const total = D.quiz.length;
    if (qi >= total) return renderQuizResult();
    const q = D.quiz[qi];
    box.innerHTML = `
      <div class="quiz-top">
        <p class="eyebrow">Soal ${qi + 1} dari ${total}</p>
        <div class="quiz-bar" aria-hidden="true"><span style="width:${(qi / total) * 100}%"></span></div>
      </div>
      <h2 class="quiz-q">${esc(q.q)}</h2>
      <div class="options" role="group" aria-label="Pilihan jawaban">
        ${q.options.map((o, i) => `<button type="button" class="option" data-opt="${i}"><span class="opt-letter">${"ABCD"[i]}</span><span>${esc(o)}</span></button>`).join("")}
      </div>
      <div class="feedback" id="feedback" hidden></div>`;
    $$(".option", box).forEach((b) => b.addEventListener("click", () => choose(+b.dataset.opt)));
  }

  function choose(i) {
    const q = D.quiz[qi];
    const right = i === q.answer;
    qAnswers[qi] = i;
    $$(".option").forEach((b) => {
      const k = +b.dataset.opt;
      b.disabled = true;
      if (k === q.answer) b.classList.add("correct");
      else if (k === i) b.classList.add("wrong");
    });
    const fb = $("#feedback");
    fb.hidden = false;
    fb.className = "feedback " + (right ? "ok" : "no");
    const cheers = ["Tepat sekali!", "Betul! Hebat.", "Benar! Kamu teliti.", "Mantap, benar!"];
    fb.innerHTML = `
      <p class="fb-title">${right ? cheers[qi % cheers.length] : "Belum tepat, tidak apa-apa."}</p>
      ${right ? "" : `<p>Jawaban yang benar: <b>${esc(q.options[q.answer])}</b></p>`}
      <p>${esc(q.explain)}</p>
      <button type="button" class="btn btn-primary btn-sm" id="nextQ">${qi === D.quiz.length - 1 ? "Lihat hasilku" : "Soal berikutnya →"}</button>`;
    $("#nextQ").addEventListener("click", () => { qi++; renderQuiz(); });
    $("#nextQ").focus({ preventScroll: true });
  }

  function renderQuizResult() {
    const total = D.quiz.length;
    const wrong = D.quiz.map((q, i) => (qAnswers[i] === q.answer ? null : i)).filter((x) => x !== null);
    const score = total - wrong.length;
    const attempts = store.get("attempts", []);
    attempts.push({ score, total, wrong, at: Date.now() });
    store.set("attempts", attempts);
    markDone("kuis");

    const pct = score / total;
    const msg = pct === 1 ? "Sempurna! Kamu benar-benar paham siklus air."
      : pct >= 0.75 ? "Bagus sekali! Tinggal sedikit lagi yang perlu diulang."
      : pct >= 0.5 ? "Lumayan! Coba baca lagi bagian yang masih keliru, lalu ulangi kuisnya."
      : "Tidak apa-apa. Belajar memang butuh waktu. Yuk, baca materinya lagi pelan-pelan.";

    $("#quizBox").innerHTML = `
      <div class="result">
        <div class="score-badge"><b>${score}</b><span>dari ${total}</span></div>
        <div>
          <h2>${msg}</h2>
          ${wrong.length ? `<p class="muted">Soal yang perlu kamu ulang:</p>
          <ul class="bullets">${wrong.map((i) => `<li>${esc(D.quiz[i].q)}</li>`).join("")}</ul>` : ""}
          <p class="small muted">Hasil ini sudah terkirim ke gurumu. Percobaan ke-${attempts.length}.</p>
          <div class="row wrap">
            <button type="button" class="btn btn-primary" id="retryQuiz">Coba lagi</button>
            <a class="btn btn-ghost" href="#materi">Baca materi lagi</a>
          </div>
        </div>
      </div>`;
    $("#retryQuiz").addEventListener("click", () => { qi = 0; qAnswers = []; renderQuiz(); });
  }

  /* ---------- Refleksi ---------- */
  const faces = D.faces;
  let mood = null;
  function renderMoods() {
    $("#moodRow").innerHTML = D.moods.map((m) => `
      <label class="mood mood-${m.id}">
        <input type="radio" name="mood" value="${m.id}">
        <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" class="face"/>${faces[m.id]}</svg>
        <span>${m.label}</span>
      </label>`).join("");
    $$('input[name="mood"]').forEach((r) => r.addEventListener("change", () => { mood = r.value; }));
  }

  function renderJournal() {
    const list = store.get("journal", []);
    const box = $("#journalBox");
    if (!list.length) { box.innerHTML = ""; return; }
    const moodLabel = (id) => (D.moods.find((m) => m.id === id) || {}).label || "";
    box.innerHTML = `<h2>Catatan refleksiku</h2>` + list.slice().reverse().map((j) => `
      <article class="journal-entry">
        <p class="hand j-date">${UI.fmtDate(j.at, { weekday: "long", day: "numeric", month: "long" })} · ${esc(moodLabel(j.mood))}</p>
        ${j.a ? `<p><b>Aku belajar:</b> ${esc(j.a)}</p>` : ""}
        ${j.b ? `<p><b>Masih bingung:</b> ${esc(j.b)}</p>` : ""}
        ${j.c ? `<p><b>Pertanyaanku:</b> ${esc(j.c)}</p>` : ""}
        <p class="small muted">Keyakinan: ${"●".repeat(j.conf)}${"○".repeat(5 - j.conf)}</p>
      </article>`).join("");
  }

  $("#reflectForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const a = $("#rf1").value.trim(), b = $("#rf2").value.trim(), c = $("#rf3").value.trim();
    if (!mood) { toast("Pilih dulu perasaanmu, ya."); return; }
    if (!a) { toast("Tulis sedikit tentang apa yang kamu pelajari hari ini."); $("#rf1").focus(); return; }
    const list = store.get("journal", []);
    list.push({ at: Date.now(), mood, a, b, c, conf: +$("#rfConf").value });
    store.set("journal", list);
    ["1", "2", "3"].forEach((n) => { $("#rf" + n).value = ""; store.set("f.rf.draft" + n, ""); });
    $$('input[name="mood"]').forEach((r) => (r.checked = false));
    mood = null;
    renderJournal();
    markDone("refleksi");
    toast("Refleksimu tersimpan dan terkirim ke gurumu. 💛");
  });

  /* ---------- Profil ---------- */
  function renderMyProfile() {
    const parents = DB.parentsOf(user.id);
    UI.renderProfile(user, {
      info: [
        ["Peran", "Siswa"],
        ["Kelas", esc(cls.name)],
        ["Guru", esc(teacher ? teacher.name : "-")],
        ["Orang tua terhubung", parents.length ? parents.map((p) => esc(p.name)).join(", ") : '<span class="muted">Belum ada</span>']
      ],
      extraTop: `
        <div class="card code-card">
          <div>
            <h2>Kode untuk orang tuamu</h2>
            <p class="muted">Berikan kode ini kepada ayah, ibu, atau walimu. Mereka memakainya saat mendaftar agar bisa melihat perkembangan belajarmu.</p>
          </div>
          <div class="big-code">
            <span id="childCode">${esc(user.childCode)}</span>
            <button type="button" class="btn btn-soft btn-sm" id="copyChild">Salin</button>
          </div>
        </div>`,
      afterRender: () => $("#copyChild").addEventListener("click", () => UI.copy(user.childCode, "Kode disalin. Kirimkan ke orang tuamu.")),
      onChange: renderHello
    });
  }

  /* ---------- Mulai ---------- */
  renderHello();
  renderGoals();
  renderChunk();
  renderVideos();
  renderLkDone();
  renderQuiz();
  renderMoods();
  renderJournal();
  renderProgress();
  renderMyProfile();
  bindAutosave($("#lembar"));
  bindAutosave($("#kuis .pemantik"));
  bindAutosave($("#reflectForm"));

  // "Tujuan" dianggap selesai setelah dibaca beberapa detik
  let goalTimer;
  UI.initShell(user, {
    onRoute(page) {
      clearTimeout(goalTimer);
      if (page === "tujuan") goalTimer = setTimeout(() => markDone("tujuan"), 6000);
      if (page === "video") renderVideos();
    }
  });
})();
