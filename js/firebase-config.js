const firebaseConfig = {
    apiKey: "AIzaSyDmr1Cbguvfgryr2T7-Ck8G85okd9PJ-Fg",
    authDomain: "controlpess-d5c11.firebaseapp.com",
    projectId: "controlpess-d5c11",
    storageBucket: "controlpess-d5c11.firebasestorage.app",
    messagingSenderId: "294067954965",
    appId: "1:294067954965:web:1900f32e03db87c128351c"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

export { auth, db, firebaseConfig };
