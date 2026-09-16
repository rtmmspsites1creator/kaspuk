"use strict";
/* ===== auth.js — Login, logout, status akun, dan toast =====
   Penanganan login/logout, listener status auth Firebase, penentuan role dari ROLE_MAP, listener nama pengurus (settings/roleNames), dan fungsi showToast().
   Bagian dari RekapKas — dimuat sebagai <script defer> dari index.html,
   berbagi scope global dengan modul js/ lain (bukan ES module), jadi
   URUTAN <script> di index.html harus tetap seperti yang sudah diatur. */

  /* ---------------- Auth & Realtime listener ---------------- */
  let txListenerRef = null;

  // Pemetaan username sederhana -> email asli yang sudah terdaftar di Firebase.
  // Tidak perlu mengubah apa pun di Firebase Console.
  const USERNAME_MAP = {
    'ketua': 'ketua@gmail.com',
    'sekretaris': 'sekretaris@gmail.com',
    'bendahara': 'bendahara@gmail.com'
  };

  function doLogin(){
    const rawInput = loginEmail.value.trim();
    const pass = loginPassword.value;
    if(!rawInput || !pass){ loginError.textContent = 'Isi username dan kata sandi.'; return; }
    const key = rawInput.toLowerCase().replace(/\s+/g,'');
    const email = rawInput.includes('@') ? rawInput : (USERNAME_MAP[key] || key);
    loginBtn.disabled = true;
    loginError.textContent = '';
    auth.signInWithEmailAndPassword(email, pass)
      .catch(err=>{
        const code = err && err.code ? err.code : '';
        if(code === 'auth/unauthorized-domain'){
          loginError.textContent = 'Domain ini belum diizinkan di Firebase (cek Authentication → Settings → Authorized domains).';
        } else if(code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential'){
          loginError.textContent = 'Username atau kata sandi salah.';
        } else if(code === 'auth/too-many-requests'){
          loginError.textContent = 'Terlalu banyak percobaan, coba lagi beberapa menit lagi.';
        } else if(code === 'auth/network-request-failed'){
          loginError.textContent = 'Gagal terhubung ke server, cek koneksi internet.';
        } else {
          loginError.textContent = 'Gagal masuk: ' + (code || (err && err.message) || 'kesalahan tidak diketahui');
        }
      })
      .finally(()=>{ loginBtn.disabled = false; });
  }
  loginBtn.addEventListener('click', doLogin);
  loginPassword.addEventListener('keydown', e=>{ if(e.key === 'Enter') doLogin(); });

  logoutBtn.addEventListener('click', ()=> auth.signOut());

  auth.onAuthStateChanged(user=>{
    if(user){
      currentUid = user.uid;
      currentRole = ROLE_MAP[user.uid] || null;

      if(!currentRole){
        loginError.textContent = 'Akun ini belum terdaftar sebagai Ketua/Sekretaris/Bendahara.';
        auth.signOut();
        return;
      }

      // Simpan/perbarui data profil milik akun sendiri (diizinkan oleh rules)
      fdb.ref('users/' + user.uid).set({
        role: currentRole,
        nama: ROLE_NAMES[currentRole]
      });

      userAvatar.textContent = ROLE_NAMES[currentRole].charAt(0).toUpperCase();
      userName.textContent = ROLE_NAMES[currentRole];
      userRole.textContent = ROLE_LABELS[currentRole];

      // Menu "Pengaturan" (ganti nama Ketua/Sekretaris/Bendahara) hanya
      // untuk Ketua — perubahan nama pengurus cukup sensitif jadi tidak
      // dibuka untuk role lain.
      tabPengaturan.style.display = (currentRole === 'ketua') ? 'block' : 'none';

      loginScreen.style.display = 'none';
      appRoot.style.display = 'block';
      loginEmail.value = '';
      loginPassword.value = '';

      if(txListenerRef) txListenerRef.off();
      txListenerRef = fdb.ref('transactions');
      txListenerRef.on('value', snapshot=>{
        db = snapshot.val() || {};
        renderAll();
      });

      suratFormCard.style.display = (currentRole === 'sekretaris' || currentRole === 'ketua') ? 'block' : 'none';
      suratSubmitBtn.textContent = (currentRole === 'ketua') ? 'Simpan Surat' : 'Kirim untuk ACC Ketua';

      if(lettersListenerRef) lettersListenerRef.off();
      lettersListenerRef = fdb.ref('letters');
      lettersListenerRef.on('value', snapshot=>{
        letters = snapshot.val() || {};
        renderSurat();
      });

      // Nama pengurus yang bisa diganti lewat menu Pengaturan. Kalau belum
      // pernah disimpan di database, tetap pakai DEFAULT_ROLE_NAMES di atas.
      if(roleNamesListenerRef) roleNamesListenerRef.off();
      roleNamesListenerRef = fdb.ref('settings/roleNames');
      roleNamesListenerRef.on('value', snapshot=>{
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
    } else {
      currentUid = null;
      currentRole = null;
      if(txListenerRef){ txListenerRef.off(); txListenerRef = null; }
      if(lettersListenerRef){ lettersListenerRef.off(); lettersListenerRef = null; }
      if(roleNamesListenerRef){ roleNamesListenerRef.off(); roleNamesListenerRef = null; }
      db = {};
      letters = {};
      ROLE_NAMES = Object.assign({}, DEFAULT_ROLE_NAMES);
      loginScreen.style.display = 'flex';
      appRoot.style.display = 'none';
    }
  });

  saveSettingsBtn.addEventListener('click', ()=>{
    if(currentRole !== 'ketua'){ showToast('Hanya Ketua yang bisa mengubah nama pengurus'); return; }
    const nextKetua = settingKetuaInput.value.trim();
    const nextSekretaris = settingSekretarisInput.value.trim();
    const nextBendahara = settingBendaharaInput.value.trim();
    if(!nextKetua || !nextSekretaris || !nextBendahara){
      showToast('Semua nama pengurus wajib diisi');
      return;
    }
    saveSettingsBtn.disabled = true;
    fdb.ref('settings/roleNames').set({
      ketua: nextKetua,
      sekretaris: nextSekretaris,
      bendahara: nextBendahara
    })
    .then(()=> showToast('Nama pengurus tersimpan'))
    .catch(()=> showToast('Gagal menyimpan, cek koneksi/izin akun'))
    .finally(()=>{ saveSettingsBtn.disabled = false; });
  });

  /* ---------------- Toast ---------------- */
  let toastTimer;
  function showToast(msg){
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    toastTimer = setTimeout(()=> toastEl.classList.remove('show'), 2400);
  }

