"use strict";

function renderMonthOptions() {
  const keys = Object.keys(db);
  keys.push(currentMonth);
  keys.push(getMonthKey(new Date));
  let minKey = keys[0], maxKey = keys[0];
  keys.forEach(k => {
    if (k < minKey) minKey = k;
    if (k > maxKey) maxKey = k;
  });
  let [y, m] = minKey.split("-").map(Number);
  const [maxY, maxM] = maxKey.split("-").map(Number);
  const filled = [];
  while (y < maxY || y === maxY && m <= maxM) {
    filled.push(y + "-" + String(m).padStart(2, "0"));
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  filled.sort().reverse();
  monthSelect.innerHTML = filled.map(k => `<option value="${k}" ${k === currentMonth ? "selected" : ""}>${monthLabel(k)}</option>`).join("");
}

monthSelect.addEventListener("change", () => {
  currentMonth = monthSelect.value;
  renderAll();
});

function setType(type) {
  selectedType = type;
  btnIn.classList.toggle("active", type === "in");
  btnOut.classList.toggle("active", type === "out");
}

btnIn.addEventListener("click", () => setType("in"));

btnOut.addEventListener("click", () => setType("out"));

amountInput.addEventListener("input", () => {
  const digits = amountInput.value.replace(/[^\d]/g, "");
  amountInput.value = digits ? parseInt(digits, 10).toLocaleString("id-ID") : "";
});

function validateTxForm() {
  const desc = descInput.value.trim();
  const amountRaw = amountInput.value.replace(/[^\d]/g, "");
  const amount = parseInt(amountRaw || "0", 10);
  return desc.length > 0 && amount > 0;
}

function updateSaveBtnState() {
  saveBtn.disabled = !validateTxForm();
}

descInput.addEventListener("input", updateSaveBtnState);

amountInput.addEventListener("input", updateSaveBtnState);

updateSaveBtnState();

saveBtn.addEventListener("click", () => {
  const date = dateInput.value || todayISO();
  const desc = descInput.value.trim();
  const amountRaw = amountInput.value.replace(/[^\d]/g, "");
  const amount = parseInt(amountRaw || "0", 10);
  if (!desc) {
    showToast("Isi keterangan dulu ya");
    descInput.focus();
    return;
  }
  if (!amount) {
    showToast("Nominal belum diisi");
    amountInput.focus();
    return;
  }
  const monthKey = getMonthKey(new Date(date + "T00:00:00"));
  saveBtn.disabled = true;
  const isKetua = isFullAdmin();
  if (editingTxId) {
    const updates = {
      date: date,
      type: selectedType,
      desc: desc,
      amount: amount
    };
    let op;
    if (monthKey === editingTxMonth) {
      op = fdb.ref("transactions/" + editingTxMonth + "/" + editingTxId).update(updates);
    } else {
      const oldRef = fdb.ref("transactions/" + editingTxMonth + "/" + editingTxId);
      op = oldRef.once("value").then(snap => {
        const old = snap.val();
        if (!old) throw new Error("not-found");
        const merged = Object.assign({}, old, updates);
        return fdb.ref("transactions/" + monthKey).push(merged).then(() => oldRef.remove());
      });
    }
    op.then(() => {
      cancelEditTx();
      currentMonth = monthKey;
      showToast("Transaksi diperbarui");
    }).catch(() => {
      showToast("Gagal memperbarui transaksi");
    }).finally(() => {
      updateSaveBtnState();
    });
    return;
  }
  const payload = {
    date: date,
    type: selectedType,
    desc: desc,
    amount: amount,
    status: isKetua ? "approved" : "pending",
    createdByUid: currentUid,
    createdByName: ROLE_NAMES[currentRole],
    createdByRole: currentRole,
    createdAt: firebase.database.ServerValue.TIMESTAMP
  };
  function resetFormAfterSave() {
    descInput.value = "";
    amountInput.value = "";
    setType("out");
    updateSaveBtnState();
  }
  function fallbackToOfflineQueue() {
    queueOfflineTx(monthKey, payload).then(() => {
      resetFormAfterSave();
      currentMonth = monthKey;
      updateOfflineBadge();
      showToast("Offline · transaksi disimpan di perangkat, akan disinkron otomatis");
    }).catch(() => {
      showToast("Gagal menyimpan transaksi (offline & online sama-sama gagal)");
    }).finally(() => {
      updateSaveBtnState();
    });
  }
  if (!navigator.onLine) {
    fallbackToOfflineQueue();
    return;
  }
  fdb.ref("transactions/" + monthKey).push(payload).then(() => {
    resetFormAfterSave();
    currentMonth = monthKey;
    showToast(isKetua ? "Tersimpan · " + formatRupiah(amount) : "Terkirim · menunggu ACC Ketua");
  }).catch(err => {
    const code = err && err.code ? err.code : "";
    if (code === "PERMISSION_DENIED") {
      showToast("Ditolak sistem: Rules Firebase belum diperbarui");
      updateSaveBtnState();
      return;
    }
    fallbackToOfflineQueue();
  });
});

function startEditTx(id) {
  const t = (db[currentMonth] || {})[id];
  if (!t) {
    showToast("Transaksi tidak ditemukan");
    return;
  }
  switchTab("keuangan");
  editingTxId = id;
  editingTxMonth = currentMonth;
  dateInput.value = t.date;
  descInput.value = t.desc;
  amountInput.value = t.amount.toLocaleString("id-ID");
  setType(t.type);
  txEditBanner.style.display = "flex";
  saveBtn.textContent = "Update Transaksi";
  updateSaveBtnState();
  descInput.focus();
}

function cancelEditTx() {
  editingTxId = null;
  editingTxMonth = null;
  descInput.value = "";
  amountInput.value = "";
  dateInput.value = todayISO();
  setType("out");
  txEditBanner.style.display = "none";
  saveBtn.textContent = "Simpan Transaksi";
  updateSaveBtnState();
}

txEditCancelBtn.addEventListener("click", cancelEditTx);

function approveTx(id) {
  if (!isFullAdmin()) return;
  fdb.ref("transactions/" + currentMonth + "/" + id).update({
    status: "approved",
    approvedByName: ROLE_NAMES[currentRole],
    approvedAt: firebase.database.ServerValue.TIMESTAMP
  }).then(() => showToast("Transaksi disetujui")).catch(() => showToast("Gagal menyetujui transaksi"));
}

function rejectTx(id) {
  if (!isFullAdmin()) return;
  fdb.ref("transactions/" + currentMonth + "/" + id).remove().then(() => showToast("Transaksi ditolak & dihapus")).catch(() => showToast("Gagal menolak transaksi"));
}

function deleteTx(id) {
  if (!isFullAdmin()) {
    showToast("Hanya Ketua/Super Admin yang bisa menghapus transaksi");
    return;
  }
  fdb.ref("transactions/" + currentMonth + "/" + id).remove().then(() => showToast("Transaksi dihapus")).catch(() => showToast("Gagal menghapus, tidak punya izin"));
}
