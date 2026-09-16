"use strict";

const OFFLINE_DB_NAME = "rekapkas_offline";

const OFFLINE_DB_VERSION = 1;

const OFFLINE_STORE = "pendingTransactions";

let offlineDbPromise = null;

let offlineSyncing = false;

function openOfflineDb() {
  if (offlineDbPromise) return offlineDbPromise;
  offlineDbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("indexeddb-unsupported"));
      return;
    }
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    req.onupgradeneeded = () => {
      const dbi = req.result;
      if (!dbi.objectStoreNames.contains(OFFLINE_STORE)) {
        dbi.createObjectStore(OFFLINE_STORE, {
          keyPath: "localId",
          autoIncrement: true
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return offlineDbPromise;
}

function queueOfflineTx(monthKey, payload) {
  return openOfflineDb().then(dbi => new Promise((resolve, reject) => {
    const tx = dbi.transaction(OFFLINE_STORE, "readwrite");
    const store = tx.objectStore(OFFLINE_STORE);
    const req = store.add({
      monthKey: monthKey,
      payload: payload,
      queuedAt: Date.now()
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function getAllOfflineTx() {
  return openOfflineDb().then(dbi => new Promise((resolve, reject) => {
    const tx = dbi.transaction(OFFLINE_STORE, "readonly");
    const store = tx.objectStore(OFFLINE_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }));
}

function removeOfflineTx(localId) {
  return openOfflineDb().then(dbi => new Promise((resolve, reject) => {
    const tx = dbi.transaction(OFFLINE_STORE, "readwrite");
    const store = tx.objectStore(OFFLINE_STORE);
    const req = store.delete(localId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

function countOfflineTx() {
  return openOfflineDb().then(dbi => new Promise((resolve, reject) => {
    const tx = dbi.transaction(OFFLINE_STORE, "readonly");
    const store = tx.objectStore(OFFLINE_STORE);
    const req = store.count();
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => reject(req.error);
  }));
}

function updateOfflineBadge() {
  countOfflineTx().then(n => {
    if (!offlineBadge) return;
    if (n > 0) {
      offlineBadge.style.display = "flex";
      offlineBadge.textContent = "📴 " + n + " transaksi menunggu sinkron";
    } else {
      offlineBadge.style.display = "none";
    }
  }).catch(() => {});
}

function syncOfflineTx() {
  if (!navigator.onLine || offlineSyncing) return Promise.resolve();
  offlineSyncing = true;
  return getAllOfflineTx().then(items => {
    if (!items.length) {
      offlineSyncing = false;
      return;
    }
    let chain = Promise.resolve();
    let synced = 0;
    items.forEach(item => {
      chain = chain.then(() => fdb.ref("transactions/" + item.monthKey).push(item.payload).then(() => {
        synced++;
        return removeOfflineTx(item.localId);
      }).catch(() => {}));
    });
    return chain.then(() => {
      offlineSyncing = false;
      updateOfflineBadge();
      if (synced > 0) {
        renderAll();
        showToast(synced + " transaksi offline berhasil disinkronkan");
      }
    });
  }).catch(() => {
    offlineSyncing = false;
  });
}

window.addEventListener("online", syncOfflineTx);
