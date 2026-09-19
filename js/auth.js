"use strict";

let txListenerRef = null;

const USERNAME_MAP = {
  ketua: "ketua@gmail.com",
  sekretaris: "sekretaris@gmail.com",
  bendahara: "bendahara@gmail.com"
};

function doLogin() {
  const rawInput = loginEmail.value.trim();
  const pass = loginPassword.value;
  if (!rawInput || !pass) {
    loginError.textContent = "Isi username dan kata sandi.";
    return;
  }
  const key = rawInput.toLowerCase().replace(/\s+/g, "");
  const email = rawInput.includes("@") ? rawInput : USERNAME_MAP[key] || key;
  loginBtn.disabled = true;
  loginError.textContent = "";
  auth.signInWithEmailAndPassword(email, pass).catch(err => {
    const code = err && err.code ? err.code : "";
    if (code === "auth/unauthorized-domain") {
      loginError.textContent = "Domain ini belum diizinkan di Firebase (cek Authentication → Settings → Authorized domains).";
    } else if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
      loginError.textContent = "Username atau kata sandi salah.";
    } else if (code === "auth/too-many-requests") {
      loginError.textContent = "Terlalu banyak percobaan, coba lagi beberapa menit lagi.";
    } else if (code === "auth/network-request-failed") {
      loginError.textContent = "Gagal terhubung ke server, cek koneksi internet.";
    } else {
      loginError.textContent = "Gagal masuk: " + (code || err && err.message || "kesalahan tidak diketahui");
    }
  }).finally(() => {
    loginBtn.disabled = false;
  });
}

loginBtn.addEventListener("click", doLogin);

loginPassword.addEventListener("keydown", e => {
  if (e.key === "Enter") doLogin();
});

logoutBtn.addEventListener("click", () => auth.signOut());

auth.onAuthStateChanged(user => {
  if (user) {
    currentUid = user.uid;
    currentRole = ROLE_MAP[user.uid] || null;
    if (!currentRole) {
      loginError.textContent = "Akun ini belum terdaftar sebagai Ketua/Sekretaris/Bendahara.";
      auth.signOut();
      return;
    }
    fdb.ref("users/" + user.uid).set({
      role: currentRole,
      nama: ROLE_NAMES[currentRole]
    });
    userAvatar.textContent = ROLE_NAMES[currentRole].charAt(0).toUpperCase();
    userName.textContent = ROLE_NAMES[currentRole];
    userRole.textContent = ROLE_LABELS[currentRole];
    tabPengaturan.style.display = currentRole === "ketua" ? "block" : "none";
    loginScreen.style.display = "none";
    appRoot.style.display = "block";
    loginEmail.value = "";
    loginPassword.value = "";
    if (txListenerRef) txListenerRef.off();
    txListenerRef = fdb.ref("transactions");
    txListenerRef.on("value", snapshot => {
      db = snapshot.val() || {};
      renderAll();
    });
    suratFormCard.style.display = currentRole === "sekretaris" || currentRole === "ketua" ? "block" : "none";
    suratSubmitBtn.textContent = currentRole === "ketua" ? "Simpan Surat" : "Kirim untuk ACC Ketua";
    if (lettersListenerRef) lettersListenerRef.off();
    lettersListenerRef = fdb.ref("letters");
    lettersListenerRef.on("value", snapshot => {
      letters = snapshot.val() || {};
      renderSurat();
    });
    if (roleNamesListenerRef) roleNamesListenerRef.off();
    roleNamesListenerRef = fdb.ref("settings/roleNames");
    roleNamesListenerRef.on("value", snapshot => {
      const custom = snapshot.val() || {};
      ROLE_NAMES = {
        ketua: custom.ketua || DEFAULT_ROLE_NAMES.ketua,
        sekretaris: custom.sekretaris || DEFAULT_ROLE_NAMES.sekretaris,
        bendahara: custom.bendahara || DEFAULT_ROLE_NAMES.bendahara
      };
      userAvatar.textContent = ROLE_NAMES[currentRole].charAt(0).toUpperCase();
      userName.textContent = ROLE_NAMES[currentRole];
      settingKetuaInput.value = ROLE_NAMES.ketua;
      settingSekretarisInput.value = ROLE_NAMES.sekretaris;
      settingBendaharaInput.value = ROLE_NAMES.bendahara;
    });
    if (openingBalanceListenerRef) openingBalanceListenerRef.off();
    openingBalanceListenerRef = fdb.ref("settings/openingBalanceOverride");
    openingBalanceListenerRef.on("value", snapshot => {
      const val = snapshot.val();
      OPENING_BALANCE_OVERRIDE = val && val.monthKey ? val : null;
      if (settingOpeningMonthInput && settingOpeningAmountInput) {
        settingOpeningMonthInput.value = OPENING_BALANCE_OVERRIDE ? OPENING_BALANCE_OVERRIDE.monthKey : "";
        settingOpeningAmountInput.value = OPENING_BALANCE_OVERRIDE ? OPENING_BALANCE_OVERRIDE.amount.toLocaleString("id-ID") : "";
      }
      renderAll();
    });
  } else {
    currentUid = null;
    currentRole = null;
    if (txListenerRef) {
      txListenerRef.off();
      txListenerRef = null;
    }
    if (lettersListenerRef) {
      lettersListenerRef.off();
      lettersListenerRef = null;
    }
    if (roleNamesListenerRef) {
      roleNamesListenerRef.off();
      roleNamesListenerRef = null;
    }
    if (openingBalanceListenerRef) {
      openingBalanceListenerRef.off();
      openingBalanceListenerRef = null;
    }
    db = {};
    letters = {};
    ROLE_NAMES = Object.assign({}, DEFAULT_ROLE_NAMES);
    OPENING_BALANCE_OVERRIDE = null;
    loginScreen.style.display = "flex";
    appRoot.style.display = "none";
  }
});

settingOpeningAmountInput.addEventListener("input", () => {
  const digits = settingOpeningAmountInput.value.replace(/[^\d]/g, "");
  settingOpeningAmountInput.value = digits ? parseInt(digits, 10).toLocaleString("id-ID") : "";
});

saveSettingsBtn.addEventListener("click", () => {
  if (currentRole !== "ketua") {
    showToast("Hanya Ketua yang bisa mengubah nama pengurus");
    return;
  }
  const nextKetua = settingKetuaInput.value.trim();
  const nextSekretaris = settingSekretarisInput.value.trim();
  const nextBendahara = settingBendaharaInput.value.trim();
  if (!nextKetua || !nextSekretaris || !nextBendahara) {
    showToast("Semua nama pengurus wajib diisi");
    return;
  }
  saveSettingsBtn.disabled = true;
  fdb.ref("settings/roleNames").set({
    ketua: nextKetua,
    sekretaris: nextSekretaris,
    bendahara: nextBendahara
  }).then(() => showToast("Nama pengurus tersimpan")).catch(() => showToast("Gagal menyimpan, cek koneksi/izin akun")).finally(() => {
    saveSettingsBtn.disabled = false;
  });
});

saveOpeningBalanceBtn.addEventListener("click", () => {
  if (currentRole !== "ketua") {
    showToast("Hanya Ketua yang bisa mengubah saldo awal periode aktif");
    return;
  }
  const monthKey = settingOpeningMonthInput.value;
  const amountRaw = settingOpeningAmountInput.value.replace(/[^\d]/g, "");
  const amount = parseInt(amountRaw || "0", 10);
  if (!monthKey) {
    showToast("Pilih dulu bulan mulainya");
    return;
  }
  saveOpeningBalanceBtn.disabled = true;
  fdb.ref("settings/openingBalanceOverride").set({
    monthKey: monthKey,
    amount: amount,
    setByName: ROLE_NAMES.ketua,
    setAt: firebase.database.ServerValue.TIMESTAMP
  }).then(() => showToast("Saldo awal periode aktif tersimpan")).catch(() => showToast("Gagal menyimpan, cek koneksi/izin akun")).finally(() => {
    saveOpeningBalanceBtn.disabled = false;
  });
});

clearOpeningBalanceBtn.addEventListener("click", () => {
  if (currentRole !== "ketua") return;
  clearOpeningBalanceBtn.disabled = true;
  fdb.ref("settings/openingBalanceOverride").remove().then(() => {
    settingOpeningMonthInput.value = "";
    settingOpeningAmountInput.value = "";
    showToast("Saldo awal periode aktif dihapus, kembali ke perhitungan penuh dari awal riwayat");
  }).catch(() => showToast("Gagal menghapus, cek koneksi/izin akun")).finally(() => {
    clearOpeningBalanceBtn.disabled = false;
  });
});

let toastTimer;

function showToast(msg) {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
}
