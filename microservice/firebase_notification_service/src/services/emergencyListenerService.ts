import { db } from '../lib/firebase.js';
import { sendFCMNotification } from '../handler/pushnotification.js';
import { produceMessage } from '../lib/kafkaProducer.js';

interface State {
  status: string;
}

interface VehicleSettings {
  value: number;
  enabled: boolean;
  lat: number;
  lng: number;
  takeover: boolean;
  notificationInterval: number;
}

interface KafkaNotificationMessage extends Record<string, unknown> {
  vehicleId: string;
  message: string;
  number: string;
  isGroup: boolean;
}

interface UserDetails {
  number: string;
  isGroup: boolean;
}

const KAFKA_TOPIC = 'whatsapp-notifications';
const DELAY_MS = 15000;
const lastNotificationMap = new Map<string, number>();

const shouldSendNotification = (
  vehicleId: string,
  interval: number,
): boolean => {
  const now = Date.now();
  const lastSentTime = lastNotificationMap.get(vehicleId) || 0;
  const elapsedMinutes = (now - lastSentTime) / 1000 / 60;

  if (elapsedMinutes >= interval) {
    lastNotificationMap.set(vehicleId, now);
    return true;
  }

  return false;
};

async function getEmergencyNumber(vehicleId: string): Promise<string | null> {
  const snap = await db
    .ref(`settings/${vehicleId}/emergency_number`)
    .once('value');
  return snap.exists() ? (snap.val() as string) : null;
}

export const listenToEmergency = () => {
  const stateRef = db.ref('vehicle');

  stateRef.on('child_changed', async (snapshot) => {
    const vehicleId = snapshot.key!;
    const state: State | null = snapshot.val()?.state;

    const settings = await getVehicleSettings(vehicleId);

    if (!settings || !settings.enabled) {
      console.log(`[.] Settings disabled for vehicle ${vehicleId}.`);
      return;
    }

    if (typeof state?.status == 'string') {
      if (state.status.toUpperCase() == 'ACCIDENT') {
        console.log(`[.] Accident detected  on vehicle ${vehicleId}.`);

        // const number = await getWhatsAppNumber(vehicleId);
        const details = await getUserDetails(vehicleId);
        if (!details) {
          console.warn(`[X] No WA User found for vehicleId ${vehicleId}`);
          return;
        }

        if (shouldSendNotification(vehicleId, settings.notificationInterval)) {
          // const kafkaMessage: KafkaNotificationMessage = {
          //   vehicleId,
          //   message: `⚠️ *ᴀᴄᴄɪᴅᴇɴᴛ ᴅᴇᴛᴇᴄᴛᴇᴅ* ⚠️\n*Kami mendeteksi adanya insiden!*\n\n🚨 Notifikasi akan dikirimkan ke nomor darurat dan *rumah sakit terdekat* dalam waktu 1,5 menit!\n\n*PERHATIAN* 📌 Balas */ᴀʙᴏʀᴛ* untuk membatalkan`,
          //   number: details.number,
          //   isGroup: details.isGroup,
          // };
          const initialMsg: KafkaNotificationMessage = {
            vehicleId,
            number: details.number,
            isGroup: details.isGroup,
            message: `⚠️ *ᴀᴄᴄɪᴅᴇɴᴛ ᴅᴇᴛᴇᴄᴛᴇᴅ* ⚠️
*Kami mendeteksi adanya insiden!*  

🚨 Notifikasi akan dikirimkan ke nomor darurat dan *rumah sakit terdekat* dalam waktu 1,5 menit!  

*PERHATIAN* 📌 Balas */abort* untuk membatalkan`,
          };

          await sendNotification(initialMsg);

          const title = `⚠️ Accident Detected!`;
          const body = `Terjadi insiden, notifikasi darurat akan dikirimkan segera 🚨`;
          const accidentImageUrl = `https://cdni.iconscout.com/illustration/premium/thumb/ambulance-emergency-doctors-carried-lying-illness-woman-on-stretcher-illustration-download-in-svg-png-gif-file-formats--doctor-specialist-service-medical-bag-pack-healthcare-illustrations-8022584.png?f=webp`;

          await sendFCMNotification(vehicleId, title, body, accidentImageUrl);

          setTimeout(async () => {
            const incRef = db.ref(`incidents/${vehicleId}`);
            const incSnap = await incRef.once('value');
            const inc = incSnap.val();

            // Sesudah abort
            if (inc?.aborted === true) {
              console.log(`[i] Incident ${vehicleId} aborted; cleaning up.`);
              await incRef.remove(); // <— cleanup
              return; 
            }
            
            const emergencyNumber = await getEmergencyNumber(vehicleId);
            if (!emergencyNumber) {
              console.warn(`No emergency number for ${vehicleId}`);
              return;
            }

            const finalMsg: KafkaNotificationMessage = {
              vehicleId,
              number: emergencyNumber,
              isGroup: false,
              message: `🚨 *DARURAT!* 🚨\nLokasi kecelakaan: https://maps.google.com/?q=${settings.lat},${settings.lng}\nMohon segera ditindaklanjuti.`,
            };

            await sendNotification(finalMsg);
            await incRef.remove();

            // // produce final Kafka message ke emergency contact
            // await produceMessage(KAFKA_TOPIC, {
            //   vehicleId,
            //   number: `${emergencyNumber}@s.whatsapp.net`,
            //   isGroup: false,
            //   message: `🚨 *DARURAT!* 🚨\nLokasi kecelakaan: https://maps.google.com/?q=${settings.lat},${settings.lng}\nMohon segera ditindaklanjuti.`,
            //   phase: 'final',
            // });
          }, DELAY_MS);
        }
      }
    }
  });
};

const getVehicleSettings = async (
  vehicleId: string,
): Promise<VehicleSettings | null> => {
  const settingsRef = db.ref(`settings/${vehicleId}`);
  const snapshot = await settingsRef.once('value');
  const settings = snapshot.val();

  if (!settings) return null;

  return {
    value: settings.radius?.value || 0,
    enabled: settings.radius?.enabled || false,
    lat: settings.radius?.lat || 0,
    lng: settings.radius?.lng || 0,
    takeover: settings.radius?.takeover || false,
    notificationInterval: settings.notification_interval || 30,
  };
};

const getUserDetails = async (
  vehicleId: string,
): Promise<UserDetails | null> => {
  const wausersRef = db
    .ref('wausers')
    .orderByChild('vehicleId')
    .equalTo(vehicleId);

  const snapshot = await wausersRef.once('value');
  if (!snapshot.exists()) return null;

  const users = snapshot.val() as Record<
    string,
    { vehicleId: string; isGroup: boolean }
  >;

  const [number, user] = Object.entries(users)[0];
  return {
    number,
    isGroup: user.isGroup,
  };
};

const sendNotification = async (message: KafkaNotificationMessage) => {
  try {
    await produceMessage(KAFKA_TOPIC, message);
    console.log(
      `[✓] Notification sent to Kafka for vehicle ${message.vehicleId} and number ${message.number}.`,
    );
  } catch (error) {
    console.error(`[X] Failed to send Kafka notification:`, error);
  }
};
