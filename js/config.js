"use strict";
/* ===== config.js — Firebase, konstanta, dan helper dasar =====
   Konfigurasi Firebase, ROLE_MAP/ROLE_NAMES, dan fungsi bantu kecil (format tanggal/rupiah, dsb) yang dipakai modul lain.
   Bagian dari RekapKas — dimuat sebagai <script defer> dari index.html,
   berbagi scope global dengan modul js/ lain (bukan ES module), jadi
   URUTAN <script> di index.html harus tetap seperti yang sudah diatur. */

  /* ---------------- Firebase ---------------- */
  const firebaseConfig = {
    apiKey: "AIzaSyBYHO7TIMw0FAI89-C5akFRm1nU35JgDUQ",
    authDomain: "kaspuktes.firebaseapp.com",
    databaseURL: "https://kaspuktes-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kaspuktes",
    storageBucket: "kaspuktes.firebasestorage.app",
    messagingSenderId: "96196081624",
    appId: "1:96196081624:web:a6585741de701d0f7da4ad"
  };
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const fdb = firebase.database();

  // Pemetaan UID akun -> role. Kalau ada pergantian pengurus / akun baru,
  // tambahkan UID barunya di sini.
  const ROLE_MAP = {
    '6L5UHLxxn2VnnUur3DDtthoePkN2': 'ketua',
    'bpZpoX6BJ1OQ7LUW01E5x2zgNL02': 'sekretaris',
    'RTmaqSfX2we4kq6xOog1qIZusO52': 'bendahara'
  };

  const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  // Nama pejabat yang tampil di kolom tanda tangan laporan PDF, kop surat,
  // dan info akun. Nilai di bawah ini cuma FALLBACK (dipakai sebelum ada
  // pengaturan tersimpan di database) — perubahan sehari-hari sekarang
  // dilakukan lewat menu "⚙️ Pengaturan" di aplikasi (khusus Ketua), bukan
  // dengan mengedit kode ini lagi.
  const DEFAULT_ROLE_NAMES = {
    ketua: 'Ajat Sudrajat, S.H.',
    sekretaris: 'Suhardi',
    bendahara: 'Munawarudin'
  };
  let ROLE_NAMES = Object.assign({}, DEFAULT_ROLE_NAMES);
  const ROLE_LABELS = { ketua: 'Ketua', sekretaris: 'Sekretaris', bendahara: 'Bendahara' };

  function getMonthKey(d){
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
  }
  function monthLabel(key){
    const [y,m] = key.split('-');
    return MONTHS_ID[parseInt(m,10)-1] + ' ' + y;
  }
  function todayISO(){
    const d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function formatRupiah(n){
    n = Math.round(n||0);
    return 'Rp' + n.toLocaleString('id-ID');
  }
  function formatDateShort(iso){
    const d = new Date(iso+'T00:00:00');
    const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
    return days[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS_ID[d.getMonth()].slice(0,3);
  }

  let db = {};
  let letters = {};
  let lettersListenerRef = null;
  let roleNamesListenerRef = null;
  let currentMonth = getMonthKey(new Date());
  let currentUid = null;
  let currentRole = null;

