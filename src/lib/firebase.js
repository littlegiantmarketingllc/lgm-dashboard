import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const app = initializeApp({
  apiKey:            'AIzaSyBPNZvbLTHwZbSj3tSba8tYL3hvP9v89Ik',
  authDomain:        'lgm-dashboard-f3e78.firebaseapp.com',
  databaseURL:       'https://lgm-dashboard-f3e78-default-rtdb.firebaseio.com',
  projectId:         'lgm-dashboard-f3e78',
  storageBucket:     'lgm-dashboard-f3e78.firebasestorage.app',
  messagingSenderId: '100662014842',
  appId:             '1:100662014842:web:79c97a67f684dc92401cc3',
});

const auth = getAuth(app);

// Resolves with a fresh ID token, signing in anonymously if needed.
// Caches the promise so parallel callers don't trigger multiple sign-ins.
let _tokenPromise = null;

export function getFirebaseToken() {
  if (!_tokenPromise) {
    _tokenPromise = new Promise((resolve, reject) => {
      onAuthStateChanged(auth, async (user) => {
        try {
          if (!user) await signInAnonymously(auth);
          const token = await auth.currentUser.getIdToken();
          resolve(token);
        } catch (err) {
          _tokenPromise = null; // reset so next call retries
          reject(err);
        }
      });
    });
  }
  return _tokenPromise;
}

// Call on app start to kick off anonymous sign-in early
export function initFirebaseAuth() {
  signInAnonymously(auth).catch(() => {});
}
