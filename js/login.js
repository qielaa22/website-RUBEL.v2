(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const S = window.RUBEL_SEED;
  const ROLE_WORD = { siswa: "siswa", guru: "guru", ortu: "orang tua" };

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  const role = () => ($('input[name="role"]:checked') || {}).value || "siswa";
  const go = (u) => { location.href = DB.ROLE_PAGE[u.role]; };

  /* ----- Masuk / Daftar ----- */
  const tabs = [$("#tabLogin"), $("#tabRegister")];
  function showTab(t) {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute("aria-selected", String(on));
      x.tabIndex = on ? 0 : -1;
      $("#" + x.getAttribute("aria-controls")).hidden = !on;
    });
    $("#lgErr").textContent = ""; $("#rgErr").textContent = "";
    updateRoleUI();
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => showTab(t));
    t.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const n = tabs[1 - i]; showTab(n); n.focus(); }
    });
  });

  function updateRoleUI() {
    const r = role();
    $$("[data-for]").forEach((el) => { el.hidden = el.dataset.for !== r; });
    const registering = $("#tabRegister").getAttribute("aria-selected") === "true";
    $("#formTitle").textContent = registering ? "Mendaftar sebagai siapa?" : "Kamu masuk sebagai siapa?";
    $("#formLogin button[type=submit]").textContent = "Masuk sebagai " + ROLE_WORD[r];
  }
  $$('input[name="role"]').forEach((r) => r.addEventListener("change", () => { $("#lgErr").textContent = ""; $("#rgErr").textContent = ""; updateRoleUI(); }));

  $$("[data-toggle]").forEach((b) => b.addEventListener("click", () => {
    const inp = $("#" + b.dataset.toggle);
    const show = inp.type === "password";
    inp.type = show ? "text" : "password";
    b.textContent = show ? "Sembunyikan" : "Lihat";
    b.setAttribute("aria-label", show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi");
  }));

  function busy(form, on) {
    const b = form.querySelector("button[type=submit]");
    b.disabled = on;
    form.classList.toggle("is-busy", on);
  }

  $("#formLogin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = $("#lgUser").value, pass = $("#lgPass").value;
    if (!user.trim() || !pass) { $("#lgErr").textContent = "Isi nama pengguna dan kata sandi dulu, ya."; return; }
    busy(e.target, true);
    const r = await DB.login(user, pass, role());
    busy(e.target, false);
    if (!r.ok) { $("#lgErr").textContent = r.error; return; }
    go(r.user);
  });

  const FIELD_INPUT = { name: "rgName", username: "rgUser", password: "rgPass", classCode: "rgClass", className: "rgClassName", childCode: "rgChild" };
  $("#formRegister").addEventListener("submit", async (e) => {
    e.preventDefault();
    $$("#formRegister .invalid").forEach((el) => el.classList.remove("invalid"));
    busy(e.target, true);
    const r = await DB.register({
      role: role(),
      name: $("#rgName").value,
      username: $("#rgUser").value,
      password: $("#rgPass").value,
      classCode: $("#rgClass").value,
      className: $("#rgClassName").value,
      subject: $("#rgSubject").value,
      childCode: $("#rgChild").value
    });
    busy(e.target, false);
    if (!r.ok) {
      $("#rgErr").textContent = r.error;
      const inp = r.field && $("#" + FIELD_INPUT[r.field]);
      if (inp) { inp.classList.add("invalid"); inp.focus(); }
      return;
    }
    go(r.user);
  });

  /* ----- Akun contoh ----- */
  function renderDemo() {
    if (!S) { $("#demoBox").hidden = true; return; }
    const items = [
      { role: "siswa", ico: "🎒", who: S.student.name, u: S.student.username, p: S.student.password },
      { role: "guru", ico: "🍎", who: S.teacher.name, u: S.teacher.username, p: S.teacher.password },
      { role: "ortu", ico: "🏡", who: S.parent.name + " (ibu Dita)", u: S.parent.username, p: S.parent.password }
    ];
    $("#demoList").innerHTML = items.map((d, i) => `
      <button type="button" class="demo-item role-${d.role}" data-demo="${i}">
        <span class="ro-ico" aria-hidden="true">${d.ico}</span>
        <span><b>${DB.ROLE_NAME[d.role]}</b><small>${d.who}</small></span>
        <code>${d.u}</code>
      </button>`).join("");
    $$("[data-demo]").forEach((b) => b.addEventListener("click", () => {
      const d = items[+b.dataset.demo];
      showTab($("#tabLogin"));
      $(`input[name="role"][value="${d.role}"]`).checked = true;
      updateRoleUI();
      $("#lgUser").value = d.u;
      $("#lgPass").value = d.p;
      $("#lgErr").textContent = "";
      $("#formLogin button[type=submit]").focus();
      toast("Akun contoh terisi. Tekan “Masuk”.");
    }));
  }

  $("#resetDemo").addEventListener("click", async () => {
    if (!confirm("Semua akun dan data belajar di perangkat ini akan dihapus, lalu diganti akun contoh yang baru. Lanjutkan?")) return;
    await DB.seed(true);
    toast("Data contoh sudah dikembalikan ke awal.");
  });

  // Isi akun contoh sekali saat pertama kali dibuka
  DB.seed(false).then(renderDemo);
  updateRoleUI();
})();
