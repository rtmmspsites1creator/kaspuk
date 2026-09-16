"use strict";
/* ===== transactions.js — Catat, edit, hapus, approve transaksi =====
   Semua logika form Keuangan: pilih jenis transaksi, simpan/edit transaksi, approve/reject oleh Ketua, dan hapus transaksi.
   Bagian dari RekapKas — dimuat sebagai <script defer> dari index.html,
   berbagi scope global dengan modul js/ lain (bukan ES module), jadi
   URUTAN <script> di index.html harus tetap seperti yang sudah diatur. */

  /* ---------------- Month select ---------------- */
  function renderMonthOptions(){
    const keys = Object.keys(db);
    keys.push(currentMonth);
    keys.push(getMonthKey(new Date())); // pastikan bulan berjalan (hari ini) selalu ada

    let minKey = keys[0], maxKey = keys[0];
    keys.forEach(k=>{ if(k < minKey) minKey = k; if(k > maxKey) maxKey = k; });

    // Isi semua bulan di antara minKey..maxKey supaya tidak ada yang bolong,
    // walau bulan itu belum punya transaksi sama sekali.
    let [y, m] = minKey.split('-').map(Number);
    const [maxY, maxM] = maxKey.split('-').map(Number);
    const filled = [];
    while(y < maxY || (y === maxY && m <= maxM)){
      filled.push(y + '-' + String(m).padStart(2,'0'));
      m++;
      if(m > 12){ m = 1; y++; }
    }
    filled.sort().reverse();
    monthSelect.innerHTML = filled.map(k =>
      `<option value="${k}" ${k===currentMonth?'selected':''}>${monthLabel(k)}</option>`
    ).join('');
  }
  monthSelect.addEventListener('change', ()=>{
    currentMonth = monthSelect.value;
    renderAll();
  });

  /* ---------------- Type toggle ---------------- */
  function setType(type){
    selectedType = type;
    btnIn.classList.toggle('active', type==='in');
    btnOut.classList.toggle('active', type==='out');
  }
  btnIn.addEventListener('click', ()=> setType('in'));
  btnOut.addEventListener('click', ()=> setType('out'));

  /* ---------------- Amount live formatting ---------------- */
  amountInput.addEventListener('input', ()=>{
    const digits = amountInput.value.replace(/[^\d]/g,'');
    amountInput.value = digits ? parseInt(digits,10).toLocaleString('id-ID') : '';
  });

  /* ---------------- Save transaction ---------------- */
  saveBtn.addEventListener('click', ()=>{
    const date = dateInput.value || todayISO();
    const desc = descInput.value.trim();
    const amountRaw = amountInput.value.replace(/[^\d]/g,'');
    const amount = parseInt(amountRaw||'0',10);

    if(!desc){ showToast('Isi keterangan dulu ya'); descInput.focus(); return; }
    if(!amount){ showToast('Nominal belum diisi'); amountInput.focus(); return; }

    const monthKey = getMonthKey(new Date(date+'T00:00:00'));
    saveBtn.disabled = true;
    const isKetua = currentRole === 'ketua';

    if(editingTxId){
      // ---- Mode edit: update transaksi yang sudah ada (masih berstatus pending) ----
      const updates = { date, type: selectedType, desc, amount };
      let op;
      if(monthKey === editingTxMonth){
        op = fdb.ref('transactions/' + editingTxMonth + '/' + editingTxId).update(updates);
      } else {
        // Tanggal diubah ke bulan lain: pindahkan data ke node bulan yang baru
        const oldRef = fdb.ref('transactions/' + editingTxMonth + '/' + editingTxId);
        op = oldRef.once('value').then(snap=>{
          const old = snap.val();
          if(!old) throw new Error('not-found');
          const merged = Object.assign({}, old, updates);
          return fdb.ref('transactions/' + monthKey).push(merged)
            .then(()=> oldRef.remove());
        });
      }
      op.then(()=>{
        cancelEditTx();
        currentMonth = monthKey;
        showToast('Transaksi diperbarui');
      }).catch(()=>{
        showToast('Gagal memperbarui transaksi');
      }).finally(()=>{
        saveBtn.disabled = false;
      });
      return;
    }

    fdb.ref('transactions/' + monthKey).push({
      date, type: selectedType, desc, amount,
      status: isKetua ? 'approved' : 'pending',
      createdByUid: currentUid,
      createdByName: ROLE_NAMES[currentRole],
      createdByRole: currentRole,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(()=>{
      descInput.value = '';
      amountInput.value = '';
      setType('out');
      currentMonth = monthKey;
      showToast(isKetua ? 'Tersimpan · ' + formatRupiah(amount) : 'Terkirim · menunggu ACC Ketua');
    }).catch(err=>{
      const code = err && err.code ? err.code : '';
      showToast(code === 'PERMISSION_DENIED' ? 'Ditolak sistem: Rules Firebase belum diperbarui' : 'Gagal menyimpan, cek koneksi internet');
    }).finally(()=>{
      saveBtn.disabled = false;
    });
  });

  function startEditTx(id){
    const t = (db[currentMonth] || {})[id];
    if(!t){ showToast('Transaksi tidak ditemukan'); return; }
    switchTab('keuangan');
    editingTxId = id;
    editingTxMonth = currentMonth;
    dateInput.value = t.date;
    descInput.value = t.desc;
    amountInput.value = t.amount.toLocaleString('id-ID');
    setType(t.type);
    txEditBanner.style.display = 'flex';
    saveBtn.textContent = 'Update Transaksi';
    descInput.focus();
  }

  function cancelEditTx(){
    editingTxId = null;
    editingTxMonth = null;
    descInput.value = '';
    amountInput.value = '';
    dateInput.value = todayISO();
    setType('out');
    txEditBanner.style.display = 'none';
    saveBtn.textContent = 'Simpan Transaksi';
  }
  txEditCancelBtn.addEventListener('click', cancelEditTx);

  /* ---------------- Approve / Reject (khusus Ketua) ---------------- */
  function approveTx(id){
    if(currentRole !== 'ketua') return;
    fdb.ref('transactions/' + currentMonth + '/' + id).update({
      status: 'approved',
      approvedByName: ROLE_NAMES.ketua,
      approvedAt: firebase.database.ServerValue.TIMESTAMP
    }).then(()=> showToast('Transaksi disetujui'))
      .catch(()=> showToast('Gagal menyetujui transaksi'));
  }
  function rejectTx(id){
    if(currentRole !== 'ketua') return;
    fdb.ref('transactions/' + currentMonth + '/' + id).remove()
      .then(()=> showToast('Transaksi ditolak & dihapus'))
      .catch(()=> showToast('Gagal menolak transaksi'));
  }

  /* ---------------- Delete transaction ---------------- */
  function deleteTx(id){
    if(currentRole !== 'ketua'){
      showToast('Hanya Ketua yang bisa menghapus transaksi');
      return;
    }
    fdb.ref('transactions/' + currentMonth + '/' + id).remove()
      .then(()=> showToast('Transaksi dihapus'))
      .catch(()=> showToast('Gagal menghapus, tidak punya izin'));
  }

