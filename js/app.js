"use strict";
/* ===== app.js — PWA install, ganti tab, dan inisialisasi =====
   Penanganan prompt "Instal Aplikasi", fungsi switchTab(), pendaftaran service worker, dan pemanggilan render pertama kali saat halaman dimuat. Modul ini WAJIB dimuat PALING TERAKHIR karena langsung memanggil setType()/renderAll() dari modul lain.
   Bagian dari RekapKas — dimuat sebagai <script defer> dari index.html,
   berbagi scope global dengan modul js/ lain (bukan ES module), jadi
   URUTAN <script> di index.html harus tetap seperti yang sudah diatur. */

  /* ---------------- PWA Install ---------------- */
  const installBar = document.getElementById('installBar');
  const installBtn = document.getElementById('installBtn');
  let deferredInstallPrompt = null;

  function isRunningStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  if(!isRunningStandalone()){
    window.addEventListener('beforeinstallprompt', (e)=>{
      e.preventDefault();
      deferredInstallPrompt = e;
      installBar.style.display = 'flex';
    });
  }

  installBtn.addEventListener('click', async ()=>{
    if(!deferredInstallPrompt) return;
    installBar.style.display = 'none';
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
  });

  window.addEventListener('appinstalled', ()=>{
    installBar.style.display = 'none';
    deferredInstallPrompt = null;
    showToast('Aplikasi berhasil diinstal');
  });

  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('sw.js').catch(()=>{ /* diamkan jika gagal, app tetap jalan normal */ });
    });
  }

  /* ---------------- Tab switch ---------------- */
  function switchTab(tab){
    tabKeuangan.classList.toggle('active', tab === 'keuangan');
    tabSurat.classList.toggle('active', tab === 'surat');
    tabPengaturan.classList.toggle('active', tab === 'pengaturan');
    viewKeuangan.style.display = (tab === 'keuangan') ? 'block' : 'none';
    viewSurat.style.display = (tab === 'surat') ? 'block' : 'none';
    viewPengaturan.style.display = (tab === 'pengaturan') ? 'block' : 'none';
    bottomBarKeuangan.style.display = (tab === 'keuangan') ? 'block' : 'none';
    document.body.style.paddingBottom = (tab === 'keuangan') ? '100px' : '24px';
  }
  tabKeuangan.addEventListener('click', ()=> switchTab('keuangan'));
  tabSurat.addEventListener('click', ()=> switchTab('surat'));
  tabPengaturan.addEventListener('click', ()=> switchTab('pengaturan'));

  /* ---------------- Init ---------------- */
  setType('out');
  renderAll();
