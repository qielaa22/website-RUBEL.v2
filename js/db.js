/* =========================================================
   RUBEL · lapisan data
   Prototipe: akun dan data disimpan di localStorage browser.
   Untuk dipakai satu sekolah, ganti isi file ini dengan
   pemanggilan ke server (mis. Firebase / Google Apps Script)
   — halaman lain cukup memakai fungsi-fungsi DB.* yang sama.
   ========================================================= */
(function () {
  "use strict";

  const PREFIX = "rubel.";
  const raw = {
    get(k, d) {
      try { const v = localStorage.getItem(PREFIX + k); return v === null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); return true; }
      catch (e) { return false; }
    },
    del(k) { try { localStorage.removeItem(PREFIX + k); } catch (e) { /* abaikan */ } }
  };

  const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randCode = (n) => Array.from({ length: n }, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join("");
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const COLORS = ["#3E6B4E", "#C4654A", "#4F86A8", "#B8862A", "#7A5C99", "#2F7F7A"];

  async function hash(pw, salt) {
    const data = new TextEncoder().encode(salt + "|" + pw);
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", data);
      return "sha256:" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 0x811c9dc5;
    for (const b of data) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
    return "fnv:" + h.toString(16);
  }

  const users = () => raw.get("users", []);
  const saveUsers = (list) => raw.set("users", list);
  const classes = () => raw.get("classes", []);
  const saveClasses = (list) => raw.set("classes", list);

  const ROLE_PAGE = { siswa: "siswa.html", guru: "guru.html", ortu: "ortu.html" };
  const ROLE_NAME = { siswa: "Siswa", guru: "Guru", ortu: "Orang Tua" };

  const cleanUsername = (u) => String(u || "").trim().toLowerCase();

  function publicUser(u) {
    if (!u) return null;
    const { passHash, salt, ...rest } = u;
    return rest;
  }

  const DB = {
    ROLE_PAGE, ROLE_NAME, COLORS,

    /* ----- data per pengguna & per kelas ----- */
    userStore(id) {
      return {
        get: (k, d) => raw.get("u." + id + "." + k, d),
        set: (k, v) => raw.set("u." + id + "." + k, v)
      };
    },
    classStore(code) {
      return {
        get: (k, d) => raw.get("c." + code + "." + k, d),
        set: (k, v) => raw.set("c." + code + "." + k, v)
      };
    },
    pref: { get: (k, d) => raw.get("pref." + k, d), set: (k, v) => raw.set("pref." + k, v) },

    /* ----- pencarian ----- */
    getUser(id) { return publicUser(users().find((u) => u.id === id)); },
    getClass(code) { return classes().find((c) => c.code === String(code || "").trim().toUpperCase()) || null; },
    classOfTeacher(teacherId) { return classes().find((c) => c.teacherId === teacherId) || null; },
    studentsOf(code) {
      return users().filter((u) => u.role === "siswa" && u.classCode === code)
        .map(publicUser).sort((a, b) => a.name.localeCompare(b.name, "id"));
    },
    childOf(parent) { return parent && parent.childId ? DB.getUser(parent.childId) : null; },
    parentsOf(childId) { return users().filter((u) => u.role === "ortu" && u.childId === childId).map(publicUser); },

    /* ----- pendaftaran & masuk ----- */
    async register(f) {
      const role = f.role;
      const name = String(f.name || "").trim();
      const username = cleanUsername(f.username);
      const password = String(f.password || "");
      if (!ROLE_PAGE[role]) return { ok: false, error: "Pilih dulu kamu masuk sebagai siapa." };
      if (name.length < 2) return { ok: false, field: "name", error: "Tulis nama lengkap, minimal 2 huruf." };
      if (!/^[a-z0-9._]{3,20}$/.test(username)) return { ok: false, field: "username", error: "Nama pengguna 3–20 karakter: huruf kecil, angka, titik, atau garis bawah. Tanpa spasi." };
      if (password.length < 6) return { ok: false, field: "password", error: "Kata sandi minimal 6 karakter." };
      const list = users();
      if (list.some((u) => u.username === username)) return { ok: false, field: "username", error: "Nama pengguna ini sudah dipakai. Coba yang lain." };

      const salt = randCode(12);
      const user = {
        id: uid(), role, name, username, salt,
        passHash: await hash(password, salt),
        color: COLORS[list.length % COLORS.length],
        createdAt: Date.now()
      };

      if (role === "siswa") {
        const cls = DB.getClass(f.classCode);
        if (!cls) return { ok: false, field: "classCode", error: "Kode kelas tidak ditemukan. Tanyakan kodenya ke gurumu." };
        user.classCode = cls.code;
        user.childCode = name.split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) + "-" + randCode(4);
      }
      if (role === "guru") {
        const clsName = String(f.className || "").trim();
        if (clsName.length < 2) return { ok: false, field: "className", error: "Tulis nama kelas, misalnya “Kelas V-A”." };
        let code;
        do { code = randCode(6); } while (DB.getClass(code));
        const cl = classes();
        cl.push({ code, name: clsName, subject: String(f.subject || "IPAS").trim() || "IPAS", teacherId: user.id, createdAt: Date.now() });
        saveClasses(cl);
        user.classCode = code;
      }
      if (role === "ortu") {
        const code = String(f.childCode || "").trim().toUpperCase();
        const child = list.find((u) => u.role === "siswa" && u.childCode === code);
        if (!child) return { ok: false, field: "childCode", error: "Kode anak tidak ditemukan. Kode ada di halaman Profil milik anak." };
        user.childId = child.id;
      }

      list.push(user);
      saveUsers(list);
      raw.set("session", { userId: user.id, at: Date.now() });
      return { ok: true, user: publicUser(user) };
    },

    async login(username, password, role) {
      const u = users().find((x) => x.username === cleanUsername(username));
      if (!u || u.passHash !== await hash(String(password || ""), u.salt)) {
        return { ok: false, error: "Nama pengguna atau kata sandi belum cocok. Coba periksa lagi." };
      }
      if (role && u.role !== role) {
        return { ok: false, error: "Akun ini terdaftar sebagai " + ROLE_NAME[u.role] + ". Pilih peran “" + ROLE_NAME[u.role] + "” di atas." };
      }
      raw.set("session", { userId: u.id, at: Date.now() });
      return { ok: true, user: publicUser(u) };
    },

    logout() { raw.del("session"); location.href = "login.html"; },

    current() {
      const s = raw.get("session", null);
      return s ? DB.getUser(s.userId) : null;
    },

    /* Panggil di awal setiap halaman peran. Mengalihkan bila tidak cocok. */
    requireRole(role) {
      const u = DB.current();
      if (!u) { location.replace("login.html"); return null; }
      if (u.role !== role) { location.replace(ROLE_PAGE[u.role]); return null; }
      return u;
    },

    updateUser(id, patch) {
      const list = users();
      const u = list.find((x) => x.id === id);
      if (!u) return null;
      ["name", "color"].forEach((k) => { if (patch[k] !== undefined) u[k] = patch[k]; });
      saveUsers(list);
      return publicUser(u);
    },

    updateClass(code, patch) {
      const list = classes();
      const c = list.find((x) => x.code === code);
      if (!c) return null;
      ["name", "subject"].forEach((k) => { if (patch[k] !== undefined) c[k] = patch[k]; });
      saveClasses(list);
      return c;
    },

    async changePassword(id, oldPw, newPw) {
      const list = users();
      const u = list.find((x) => x.id === id);
      if (!u) return { ok: false, error: "Akun tidak ditemukan." };
      if (u.passHash !== await hash(String(oldPw || ""), u.salt)) return { ok: false, error: "Kata sandi lama belum cocok." };
      if (String(newPw || "").length < 6) return { ok: false, error: "Kata sandi baru minimal 6 karakter." };
      u.salt = randCode(12);
      u.passHash = await hash(newPw, u.salt);
      saveUsers(list);
      return { ok: true };
    },

    /* ----- ringkasan belajar seorang siswa (dipakai guru & orang tua) ----- */
    summary(studentId) {
      const s = DB.userStore(studentId);
      const progress = s.get("progress", {});
      const attempts = s.get("attempts", []);
      const journal = s.get("journal", []);
      const done = ["tujuan", "materi", "video", "lembar", "kuis", "refleksi"].filter((k) => progress[k]).length;
      return {
        progress, done, attempts, journal,
        last: attempts[attempts.length - 1] || null,
        best: attempts.reduce((m, a) => Math.max(m, a.score), -1),
        lastJournal: journal[journal.length - 1] || null,
        pemantik: s.get("f.pemantik", ""),
        think: (window.RUBEL_DATA ? window.RUBEL_DATA.materi : []).map((_, i) => s.get("f.think." + i, "")),
        lk: {
          obs1: s.get("f.lk.obs1", ""), obs5: s.get("f.lk.obs5", ""), obs10: s.get("f.lk.obs10", ""),
          q1: s.get("f.lk.q1", ""), q2: s.get("f.lk.q2", ""), q3: s.get("f.lk.q3", ""), q4: s.get("f.lk.q4", "")
        }
      };
    },

    /* ----- akun contoh ----- */
    async seed(force) {
      if (!force && raw.get("seeded", false)) return;
      if (force) {
        try {
          Object.keys(localStorage).filter((k) => k.startsWith(PREFIX) && !k.startsWith(PREFIX + "pref.")).forEach((k) => localStorage.removeItem(k));
        } catch (e) { /* abaikan */ }
      }
      const S = window.RUBEL_SEED;
      if (!S) return;
      const list = [];
      const code = S.classCode;
      const day = 86400000, now = Date.now();

      async function mk(role, name, username, password, extra, i) {
        const salt = randCode(12);
        const u = Object.assign({ id: "demo-" + username.replace(/\W/g, ""), role, name, username, salt, passHash: await hash(password, salt), color: COLORS[i % COLORS.length], createdAt: now - 20 * day, demo: true }, extra);
        list.push(u);
        return u;
      }

      const t = await mk("guru", S.teacher.name, S.teacher.username, S.teacher.password, { classCode: code }, 0);
      saveClasses([{ code, name: S.className, subject: "IPAS", teacherId: t.id, createdAt: now - 20 * day }]);
      const kid = await mk("siswa", S.student.name, S.student.username, S.student.password, { classCode: code, childCode: S.student.childCode }, 1);
      await mk("ortu", S.parent.name, S.parent.username, S.parent.password, { childId: kid.id }, 2);

      for (let i = 0; i < S.classmates.length; i++) {
        const m = S.classmates[i];
        const u = await mk("siswa", m.name, m.username, randCode(10), { classCode: code, childCode: m.name.split(" ")[0].toUpperCase() + "-" + randCode(4) }, i + 3);
        const st = DB.userStore(u.id);
        const prog = {};
        m.done.forEach((k) => (prog[k] = true));
        st.set("progress", prog);
        st.set("attempts", (m.attempts || []).map((w, j) => ({ score: 8 - w.length, total: 8, wrong: w, at: now - (m.attempts.length - j) * day })));
        if (m.journal) st.set("journal", [Object.assign({ at: now - day / 2 }, m.journal)]);
        if (m.pemantik) st.set("f.pemantik", m.pemantik);
        if (m.done.includes("materi")) st.set("chunksSeen", [0, 1, 2, 3, 4]);
      }
      saveUsers(list);
      raw.set("seeded", true);
    }
  };

  window.DB = DB;
})();
