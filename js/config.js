"use strict";

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

const ROLE_MAP = {
  "6L5UHLxxn2VnnUur3DDtthoePkN2": "ketua",
  bpZpoX6BJ1OQ7LUW01E5x2zgNL02: "sekretaris",
  RTmaqSfX2we4kq6xOog1qIZusO52: "bendahara",
  Nml7CdkAjwSxs3RV170ink1gJvc2: "superadmin"
};

const MONTHS_ID = [ "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember" ];

const DEFAULT_ROLE_NAMES = {
  ketua: "Ajat Sudrajat, S.H.",
  sekretaris: "Suhardi",
  bendahara: "Munawarudin",
  superadmin: "Riski Hariyanto"
};

let ROLE_NAMES = Object.assign({}, DEFAULT_ROLE_NAMES);

const ROLE_LABELS = {
  ketua: "Ketua",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  superadmin: "Super Admin"
};

// Super Admin punya hak akses penuh setara Ketua (approve, hapus, lihat Pengaturan, dll).
// Semua pengecekan izin "khusus Ketua" di seluruh aplikasi memakai helper ini.
function isFullAdmin() {
  return currentRole === "ketua" || currentRole === "superadmin";
}

// Ubah nomor surat/notulen resmi (yang mengandung "/") jadi nama file yang aman,
// supaya nama file PDF persis mencerminkan nomor dokumennya untuk dokumentasi.
function sanitizeFilename(str) {
  return String(str || "")
    .replace(/\//g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function getMonthKey(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return MONTHS_ID[parseInt(m, 10) - 1] + " " + y;
}

function todayISO() {
  const d = new Date;
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function formatRupiah(n) {
  n = Math.round(n || 0);
  return "Rp" + n.toLocaleString("id-ID");
}

function formatDateShort(iso) {
  const d = new Date(iso + "T00:00:00");
  const days = [ "Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab" ];
  return days[d.getDay()] + ", " + d.getDate() + " " + MONTHS_ID[d.getMonth()].slice(0, 3);
}

let db = {};

let letters = {};

let notulen = {};

let lettersListenerRef = null;

let notulenListenerRef = null;

let roleNamesListenerRef = null;

let currentMonth = getMonthKey(new Date);

let currentUid = null;

let currentRole = null;
