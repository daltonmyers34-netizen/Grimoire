import { initializeApp }        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
                                from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot }
                                from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAHeoD6eKkxm7ezwvBcEt5W6S7nVqZYknY",
  authDomain:        "dm-grimoire-20df0.firebaseapp.com",
  projectId:         "dm-grimoire-20df0",
  storageBucket:     "dm-grimoire-20df0.firebasestorage.app",
  messagingSenderId: "367207131975",
  appId:             "1:367207131975:web:8c57ea84808fd868273a62",
  measurementId:     "G-LDXLSEHM4F"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
window.__db = db; window.__doc = doc; window.__onSnapshot = onSnapshot;

let currentUid   = null;
let syncTimeout  = null;
let unsubSnapshot = null;
let lastWriteTime = 0;  // guard against onSnapshot echoing our own writes

// -- Auth state --------------------------------------------------------
onAuthStateChanged(auth, user => {
  if (user) {
    currentUid = user.uid;
    window.__fbUid = user.uid;
    showUserBadge(user);
    loadCloudState(user.uid);
  } else {
    currentUid = null;
    window.__fbUid = null;
    showLoginScreen();
  }
});

// -- Sign in / out -----------------------------------------------------
window.signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch(e) {
    console.error('Sign-in error', e);
    alert('Sign-in failed: ' + e.message);
  }
};

window.signOutUser = async () => {
  if (!confirm('Sign out?')) return;
  if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
  await signOut(auth);
};

// -- Load from Firestore -----------------------------------------------
async function loadCloudState(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'data', 'state'));
    if (snap.exists()) {
      const state = snap.data().state;
      if (typeof applyState === 'function') applyState(state);
      // also sync party inventory
      if (state.partyInventory) {
        window.partyInventory = state.partyInventory;
        if (typeof renderPartyInventory === 'function') renderPartyInventory();
      }
      showToast('\u2601 Campaign loaded from cloud', 'success');
    } else {
      showToast('\u2601 New cloud save \u2014 data will sync automatically', 'info');
    }
    // Live listener for multi-device sync
    if (unsubSnapshot) unsubSnapshot();
    unsubSnapshot = onSnapshot(doc(db, 'users', uid, 'data', 'state'), snap => {
      // Skip local pending writes
      if (snap.metadata.hasPendingWrites) return;
      // Skip echoes of our own recent writes (within 5 seconds)
      if (Date.now() - lastWriteTime < 5000) return;
      const state = snap.data()?.state;
      if (!state) return;
      if (typeof applyState === 'function') applyState(state);
      if (state.partyInventory) {
        window.partyInventory = state.partyInventory;
        if (typeof renderPartyInventory === 'function') renderPartyInventory();
      }
    });
  } catch(e) {
    console.error('Load error', e);
    showToast('\u26a0 Could not load cloud data: ' + e.message, 'warn');
  }
}

// -- Save to Firestore (debounced 2s) ----------------------------------
window.cloudSave = () => {
  // Always save to localStorage immediately as a backup
  try {
    const state = typeof collectState === 'function' ? collectState() : {};
    state.partyInventory = window.partyInventory || [];
    localStorage.setItem('dm_grimoire_session', JSON.stringify(state));
  } catch(e) { console.warn('localStorage backup:', e); }
  if (!currentUid) return;
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      const state = typeof collectState === 'function' ? collectState() : {};
      state.partyInventory = window.partyInventory || [];
      lastWriteTime = Date.now();
      await setDoc(doc(db, 'users', currentUid, 'data', 'state'), {
        state,
        updatedAt: new Date().toISOString()
      });
      // Also write slim player-view snapshot
      const pvSnap = {
        party: state.party || [],
        combatants: state.combatants || [],
        currentRound: state.currentRound || 0,
        currentTurn: state.currentTurn >= 0 ? state.currentTurn : -1,
        combatActive: state.combatActive || false,
        partyInventory: state.partyInventory || [],
        pvMessages: state.pvMessages || {},
        pvPartyMessage: state.pvPartyMessage || '',
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'playerView', currentUid), pvSnap);
      showSyncIndicator();
    } catch(e) {
      console.error('Save error', e);
      showToast('\u26a0 Cloud save failed', 'warn');
    }
  }, 2000);
};

// -- UI helpers --------------------------------------------------------
function showUserBadge(user) {
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) loginScreen.remove();
  const badge = document.getElementById('user-badge');
  if (badge) {
    badge.innerHTML = `
      <img src="${user.photoURL||''}" style="width:24px;height:24px;border-radius:50%;margin-right:6px;vertical-align:middle;" onerror="this.style.display='none'">
      <span style="font-size:12px;color:var(--parchment);vertical-align:middle;">${user.displayName?.split(' ')[0]||'DM'}</span>
      <button onclick="signOutUser()" style="margin-left:8px;padding:2px 8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:3px;color:var(--text-dim);font-size:10px;cursor:pointer;">Sign out</button>
    `;
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
  }
}

function showLoginScreen() {
  // Remove existing if any
  const existing = document.getElementById('login-screen');
  if (existing) existing.remove();
  const screen = document.createElement('div');
  screen.id = 'login-screen';
  screen.style.cssText = `
    position:fixed;inset:0;z-index:99999;
    background:radial-gradient(ellipse at center, #2a1505 0%, #0d0602 100%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    font-family:'Cinzel',serif;
  `;
  screen.innerHTML = `
    <div style="text-align:center;max-width:380px;padding:40px 24px;">
      <div style="font-size:64px;margin-bottom:16px;">📖</div>
      <div style="font-size:28px;font-weight:700;color:var(--gold);letter-spacing:0.1em;margin-bottom:6px;">DM Grimoire</div>
      <div style="font-size:13px;color:var(--text-dim);margin-bottom:40px;font-family:'Crimson Text',serif;font-style:italic;">
        Your campaign, anywhere you are
      </div>
      <button onclick="signInWithGoogle()" style="
        display:flex;align-items:center;gap:12px;margin:0 auto;
        padding:14px 28px;border-radius:8px;cursor:pointer;font-size:15px;
        background:white;border:none;color:#1a1a1a;font-family:'Cinzel',serif;
        font-weight:600;letter-spacing:0.05em;box-shadow:0 4px 20px rgba(0,0,0,0.5);
        transition:transform 0.15s;
      " onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.4 13 17.8 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 6.9-10.1 7.1-17z"/>
          <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z"/>
          <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.7 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z"/>
        </svg>
        Continue with Google
      </button>
      <div style="margin-top:28px;font-size:11px;color:var(--text-dim);line-height:1.6;font-family:'Crimson Text',serif;">
        Your campaign data syncs securely across all your devices.<br>No subscription required.
      </div>
    </div>
  `;
  document.body.appendChild(screen);
}

function showSyncIndicator() {
  const ind = document.getElementById('sync-indicator');
  if (!ind) return;
  ind.textContent = '\u2601 Saved';
  ind.style.opacity = '1';
  ind.style.color = '#8fd050';
  setTimeout(() => { ind.style.opacity = '0'; }, 2500);
}
