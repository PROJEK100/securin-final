import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, update, remove } from 'firebase/database';
import firebaseConfig from '../../firebaseConfig.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export const getVehicleStatus = async (vehicleId: string) => {
   try {
      const dbRef = ref(db, 'vehicle/' + vehicleId);
      const snapshot = await get(dbRef);

      if (snapshot.exists()) {
         // console.log(snapshot.val());
         return snapshot.val();
      } else {
         console.log('snapshot null');
         return null;
      }
   } catch (e) {
      console.log('Error retrieving motor status from firebase RTDB', e);
   }
};

export const getUserSettings = async (vehicleId: string) => {
   try {
      const dbRef = ref(db, 'settings/' + vehicleId);
      const snapshot = await get(dbRef);

      if (snapshot.exists()) {
         // console.log(snapshot.val());
         return snapshot.val();
      } else {
         console.log('snapshot null');
         return null;
      }
   } catch (e) {
      console.log(
         'Error retrieving user settings status from firebase RTDB',
         e,
      );
   }
};

export const abortIncident = async (vehicleId: string): Promise<void> => {
  const incRef = ref(db, `incidents/${vehicleId}/aborted`);
  await set(incRef, true);
};

export const removeNodeIncident = async (vehicleId: string): Promise<void> => {
  const incRef = ref(db, `incidents/${vehicleId}`);
  await remove(incRef);
};

export const isUserInitialized = async (jid: string): Promise<boolean> => {
   const number = jid.split('@')[0];
   const userRef = ref(db, `wausers/${number}`);
   const snapshot = await get(userRef);

   return snapshot.exists() && snapshot.val().initialized === true;
};

const initializeSettings = async (vehicleId: string): Promise<void> => {
   const settingRef = ref(db, `settings/${vehicleId}`);
   const vehicleStatus = await getVehicleStatus(vehicleId);
   const lat = vehicleStatus.location.lat;
   const long = vehicleStatus.location.lng;

   await update(settingRef, {
      notification_interval: 30,
      radius: {
         enabled: false,
         lat: lat,
         lng: long,
         value: 0,
         takeover: false,
      },
   });
};

export const initializeUser = async (
   jid: string,
   vehicleId: string,
): Promise<void> => {
   const number = jid.split('@')[0];
   const userRef = ref(db, `wausers/${number}`);
   await set(userRef, { initialized: true, isGroup: jid.endsWith('@g.us'), vehicleId });
   await initializeSettings(vehicleId);
};

export const setRadius = async (
   vehicleId: string,
   radius: number,
): Promise<string> => {
   try {
      const vehicleStatus = await getVehicleStatus(vehicleId);
      const lat = vehicleStatus.location.lat;
      const long = vehicleStatus.location.lng;

      const settingRef = ref(db, `settings/${vehicleId}/radius`);
      await update(settingRef, {
         lat: lat,
         lng: long,
         value: radius,
         takeover: false,
      });
      return `Radius untuk ${vehicleId} berhasil diset ke ${radius} km`;
   } catch (e) {
      return `Error! Terjadi kesalahan ketika mensetting data radius ke Firebase, ${e}`;
   }
};

export const setNotifInterval = async (
   vehicleId: string,
   interval: number,
): Promise<string> => {
   try {
      const intervalRef = ref(db, `settings/${vehicleId}`);
      await update(intervalRef, {
         notification_interval: interval,
      });
      return `Interval notifikasi diset ke ${interval} menit`;
   } catch (e) {
      return `Error! Terjadi kesalahan ketika mensetting interval notifikasi ke Firebase, ${e}`;
   }
};

export const setEmergencyNumber = async (
   vehicleId: string,
   emergencyNumber: string,
): Promise<string> => {
   try {
      const number = ref(db, `settings/${vehicleId}`);
      await update(number, {
         emergency_number: emergencyNumber,
      });
      return `Nomor darurat diset ke ${emergencyNumber} \n\nNotifikasi darurat akan dikirimkan ke nomor tersebut`;
   } catch (e) {
      return `Error! Terjadi kesalahan ketika mensetting interval notifikasi ke Firebase, ${e}`;
   }
};

export const setNotify = async (
   vehicleId: string,
   action: string,
): Promise<string> => {
   try {
      const notifRef = ref(db, `settings/${vehicleId}/radius`);
      const settingsRef = await getUserSettings(vehicleId);
      const notifStatusNow = settingsRef.radius.enabled;

      if (notifStatusNow && action == 'on') {
         return `Notifikasi sudah dalam kondisi on`;
      } else if (!notifStatusNow && action == 'off') {
         return `Notifikasi sudah dalam kondisi off`;
      }

      if (action == 'on') {
         await update(notifRef, { enabled: true });
         return `Notifikasi diset ke *${action}*`;
      } else if (action == 'off') {
         await update(notifRef, { enabled: false });
         return `Notifikasi diset ke *${action}*`;
      } else {
         return 'Error! Gagal mensetting notifikasi';
      }
   } catch (e) {
      return `Error! Gagal mensetting notifikasi, ${e}`;
   }
};

export const setSecurityMode = async (
   vehicleId: string,
   action: string,
): Promise<string> => {
   try {
      const secRef = ref(db, `settings/${vehicleId}/radius`);
      const settingsRef = await getUserSettings(vehicleId);
      const secStatusNow = settingsRef.radius.takeover;

      if (secStatusNow && action == 'high') {
         return `Security sudah berada dalam mode high.`;
      } else if (!secStatusNow && action == 'normal') {
         return `Security sudah berada dalam mode normal`;
      }

      if (action == 'high') {
         await update(secRef, { takeover: true });
         return `🚨 Security mode diset ke *${action}*\n\nMotor akan otomatis mati ketika diluar radius yang ditentukan`;
      } else if (action == 'normal') {
         await update(secRef, { takeover: false });
         return `🚨 Security mode diset ke *${action}*\n\nMotor tetap menyala ketika berada diluar radius, dengan notifikasi tetap menyala`;
      } else {
         return 'Error! Gagal mensetting Security mode';
      }
   } catch (e) {
      return `Error! Gagal mensetting Security mode, ${e}`;
   }
};

export const setSwitch = async (
   vehicleId: string,
   action: boolean,
): Promise<string> => {
   try {
      const switchRef = ref(db, `vehicle/${vehicleId}/master_switch`);
      const vehicleStatus = await getVehicleStatus(vehicleId);
      const switchStatus = vehicleStatus.master_switch.value;
      const switchStatusNow = Boolean(switchStatus);

      if (switchStatusNow === action) {
         const status = switchStatusNow ? 'nyala' : 'mati';
         return `Switch sudah dalam kondisi *${status}*`;
      }

      await update(switchRef, {
         value: action,
         last_updated: Math.floor(Date.now() / 1000),
      });
      const status = action ? 'nyala' : 'mati';
      return `Switch motor berhasil di *${status}kan*`;
   } catch (e) {
      return `Error! Gagal mensetting switch motor, ${e}`;
   }
};

export const getUserVehicleId = async (jid: string): Promise<string | null> => {
   const number = jid.split('@')[0];
   const userRef = ref(db, `wausers/${number}/vehicleId`);
   const snapshot = await get(userRef);
   return snapshot.exists() ? snapshot.val() : null;
};
