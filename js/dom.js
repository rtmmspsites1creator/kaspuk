"use strict";
/* ===== dom.js — Referensi elemen DOM & state form =====
   Semua document.getElementById(...) dikumpulkan di sini, plus variabel state kecil untuk form (selectedType, editingTxId, dsb) yang dipakai modul transactions.js/letters.js.
   Bagian dari RekapKas — dimuat sebagai <script defer> dari index.html,
   berbagi scope global dengan modul js/ lain (bukan ES module), jadi
   URUTAN <script> di index.html harus tetap seperti yang sudah diatur. */

  /* ---------------- DOM refs ---------------- */
  const loginScreen = document.getElementById('loginScreen');
  const appRoot = document.getElementById('appRoot');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const userRole = document.getElementById('userRole');
  const LOGO_DATA_URI = document.querySelector('.brand-mark img') ? document.querySelector('.brand-mark img').src : '';
  const tabKeuangan = document.getElementById('tabKeuangan');
  const tabSurat = document.getElementById('tabSurat');
  const tabPengaturan = document.getElementById('tabPengaturan');
  const viewKeuangan = document.getElementById('viewKeuangan');
  const viewSurat = document.getElementById('viewSurat');
  const viewPengaturan = document.getElementById('viewPengaturan');
  const bottomBarKeuangan = document.getElementById('bottomBarKeuangan');

  // Pengaturan nama pengurus
  const settingKetuaInput = document.getElementById('settingKetuaInput');
  const settingSekretarisInput = document.getElementById('settingSekretarisInput');
  const settingBendaharaInput = document.getElementById('settingBendaharaInput');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');

  // Surat
  const suratFormCard = document.getElementById('suratFormCard');
  const suratTanggal = document.getElementById('suratTanggal');
  const suratSubmitBtn = document.getElementById('suratSubmitBtn');
  const suratPendingSection = document.getElementById('suratPendingSection');
  const suratPendingList = document.getElementById('suratPendingList');
  const suratPendingCount = document.getElementById('suratPendingCount');
  const suratArchiveList = document.getElementById('suratArchiveList');
  const suratArchiveCount = document.getElementById('suratArchiveCount');
  let selectedLetterType = 'mandat';

  const monthSelect = document.getElementById('monthSelect');
  const saldoValue = document.getElementById('saldoValue');
  const totalInEl = document.getElementById('totalIn');
  const totalOutEl = document.getElementById('totalOut');
  const txListEl = document.getElementById('txList');
  const txCountEl = document.getElementById('txCount');
  const pendingSection = document.getElementById('pendingSection');
  const pendingListEl = document.getElementById('pendingList');
  const pendingCountEl = document.getElementById('pendingCount');
  const dateInput = document.getElementById('dateInput');
  const descInput = document.getElementById('descInput');
  const amountInput = document.getElementById('amountInput');
  const saveBtn = document.getElementById('saveBtn');
  const btnIn = document.getElementById('btnIn');
  const btnOut = document.getElementById('btnOut');
  const micBtn = document.getElementById('micBtn');
  const micStatus = document.getElementById('micStatus');
  const exportBtn = document.getElementById('exportBtn');
  const exportXlsxBtn = document.getElementById('exportXlsxBtn');
  const toastEl = document.getElementById('toast');
  const txEditBanner = document.getElementById('txEditBanner');
  const txEditCancelBtn = document.getElementById('txEditCancelBtn');
  const suratEditBanner = document.getElementById('suratEditBanner');
  const suratEditCancelBtn = document.getElementById('suratEditCancelBtn');

  let selectedType = 'out';
  let editingTxId = null;
  let editingTxMonth = null;
  let editingLetterId = null;
  dateInput.value = todayISO();
  suratTanggal.value = todayISO();

  document.querySelectorAll('.letter-type-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      selectedLetterType = btn.dataset.lettertype;
      document.querySelectorAll('.letter-type-btn').forEach(b=> b.classList.toggle('active', b === btn));
      document.getElementById('fieldsMandat').style.display = selectedLetterType === 'mandat' ? 'block' : 'none';
      document.getElementById('fieldsUndangan').style.display = selectedLetterType === 'undangan' ? 'block' : 'none';
      document.getElementById('fieldsKeterangan').style.display = selectedLetterType === 'keterangan' ? 'block' : 'none';
    });
  });

