/* Bagian yang dipakai bersama oleh halaman Siswa, Guru, dan Orang Tua. */
(function () {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const avatar = (u, cls = "") => `<span class="avatar ${cls}" style="--av:${esc(u.color || "#3E6B4E")}" aria-hidden="true">${esc(initials(u.name))}</span>`;
  // "Bu Sari Wulandari" → "Bu Sari", "Dita Ayu" → "Dita"
  const firstName = (name) => {
    const w = String(name || "").trim().split(/\s+/);
    return /^(bu|ibu|pak|bapak|ayah|bunda)$/i.test(w[0]) && w[1] ? w[0] + " " + w[1] : w[0];
  };
  const fmtDate = (t, opts) => new Date(t).toLocaleDateString("id-ID", opts || { day: "numeric", month: "long" });
  function ago(t) {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "baru saja";
    if (m < 60) return m + " menit lalu";
    const h = Math.round(m / 60);
    if (h < 24) return h + " jam lalu";
    const d = Math.round(h / 24);
    return d === 1 ? "kemarin" : d + " hari lalu";
  }

  async function copy(text, okMsg) {
    try { await navigator.clipboard.writeText(text); toast(okMsg || "Disalin."); }
    catch (e) { toast("Tidak bisa menyalin otomatis. Salin manual: " + text); }
  }

  /* ---------- Kerangka halaman: menu, pindah halaman, ukuran tulisan ---------- */
  function initShell(user, opts = {}) {
    const menuBtn = $("#menuBtn");
    const backdrop = $("#navBackdrop");
    function setMenu(open) {
      document.body.classList.toggle("nav-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      backdrop.hidden = !open;
    }
    menuBtn.addEventListener("click", () => setMenu(!document.body.classList.contains("nav-open")));
    backdrop.addEventListener("click", () => setMenu(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

    const pages = $$(".page").map((p) => p.id);
    function route() {
      const id = (location.hash || "#" + pages[0]).slice(1);
      const target = pages.includes(id) ? id : pages[0];
      $$(".page").forEach((p) => p.classList.toggle("active", p.id === target));
      $$("[data-nav]").forEach((a) => {
        if (a.dataset.nav === target) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
      setMenu(false);
      window.scrollTo(0, 0);
      if (target !== pages[0]) $("#main").focus({ preventScroll: true });
      if (opts.onRoute) opts.onRoute(target);
    }
    window.addEventListener("hashchange", route);

    const sizeBtn = $("#textSize");
    const applySize = (big) => { document.documentElement.classList.toggle("big-text", big); sizeBtn.setAttribute("aria-pressed", String(big)); };
    applySize(DB.pref.get("bigText", false));
    sizeBtn.addEventListener("click", () => {
      const big = !document.documentElement.classList.contains("big-text");
      applySize(big); DB.pref.set("bigText", big);
      toast(big ? "Tulisan diperbesar" : "Tulisan kembali normal");
    });

    renderUserChip(user);
    $$("[data-logout]").forEach((b) => b.addEventListener("click", () => DB.logout()));
    document.body.classList.add("ready");
    route();
  }

  function renderUserChip(user) {
    const chip = $("#userChip");
    if (!chip) return;
    chip.innerHTML = `${avatar(user)}<span class="uc-text"><b>${esc(firstName(user.name))}</b><small>${DB.ROLE_NAME[user.role]}</small></span>`;
    chip.setAttribute("aria-label", "Profil " + user.name);
  }

  /* ---------- Halaman profil (sama untuk semua peran) ---------- */
  function renderProfile(user, opts = {}) {
    const box = $("#profilBox");
    const draw = () => {
      const u = DB.getUser(user.id);
      box.innerHTML = `
        <div class="card profile-card">
          ${avatar(u, "avatar-xl")}
          <div class="pc-text">
            <span class="role-badge role-${u.role}">${DB.ROLE_NAME[u.role]}</span>
            <h2>${esc(u.name)}</h2>
            <p class="muted">@${esc(u.username)}</p>
          </div>
        </div>

        ${opts.extraTop || ""}

        <div class="grid-2">
          <div class="card">
            <h2>Data diri</h2>
            <dl class="info-list">
              ${(opts.info || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}
              <div><dt>Bergabung</dt><dd>${fmtDate(u.createdAt, { day: "numeric", month: "long", year: "numeric" })}</dd></div>
            </dl>
          </div>

          <form class="card" id="profileForm">
            <h2>Ubah tampilan</h2>
            <label class="field-label" for="pfName">Nama</label>
            <input type="text" id="pfName" maxlength="40" value="${esc(u.name)}" required>
            <p class="field-label">Warna profil</p>
            <div class="swatches">
              ${DB.COLORS.map((c) => `<label class="swatch" style="--av:${c}"><input type="radio" name="pfColor" value="${c}" ${c === u.color ? "checked" : ""}><span class="sr">Warna ${c}</span></label>`).join("")}
            </div>
            <button class="btn btn-primary" type="submit">Simpan</button>
          </form>
        </div>

        <div class="grid-2">
          <form class="card" id="pwForm" autocomplete="off">
            <h2>Ganti kata sandi</h2>
            <label class="field-label" for="pwOld">Kata sandi sekarang</label>
            <input type="password" id="pwOld" autocomplete="current-password" required>
            <label class="field-label" for="pwNew">Kata sandi baru <span class="muted small">(minimal 6 karakter)</span></label>
            <input type="password" id="pwNew" autocomplete="new-password" minlength="6" required>
            <p class="form-error" id="pwErr" role="alert"></p>
            <button class="btn btn-soft" type="submit">Ganti kata sandi</button>
          </form>

          <div class="card logout-card">
            <h2>Selesai untuk hari ini?</h2>
            <p class="muted">Kalau memakai HP atau komputer bersama, jangan lupa keluar supaya akunmu aman.</p>
            <button class="btn btn-ghost" type="button" id="pfLogout">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/></svg>
              Keluar dari akun
            </button>
          </div>
        </div>`;

      $("#profileForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const name = $("#pfName").value.trim();
        if (name.length < 2) { toast("Nama minimal 2 huruf."); return; }
        const color = ($('input[name="pfColor"]:checked') || {}).value;
        const nu = DB.updateUser(u.id, { name, color });
        Object.assign(user, nu);
        renderUserChip(nu);
        draw();
        if (opts.onChange) opts.onChange(nu);
        toast("Profil tersimpan.");
      });
      $("#pwForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const r = await DB.changePassword(u.id, $("#pwOld").value, $("#pwNew").value);
        $("#pwErr").textContent = r.ok ? "" : r.error;
        if (r.ok) { e.target.reset(); toast("Kata sandi berhasil diganti."); }
      });
      $("#pfLogout").addEventListener("click", () => DB.logout());
      if (opts.afterRender) opts.afterRender();
    };
    draw();
  }

  window.UI = { $, $$, esc, toast, avatar, initials, firstName, fmtDate, ago, copy, initShell, renderProfile, renderUserChip };
})();
