import admin from 'firebase-admin';
import serviceAccount from '../../serviceAccountKey.json' with { type: 'json' };

const databaseURL = "https://securin-b49ed-default-rtdb.asia-southeast1.firebasedatabase.app/";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    databaseURL,
  });
}

const db = admin.database();

export { admin, db };
