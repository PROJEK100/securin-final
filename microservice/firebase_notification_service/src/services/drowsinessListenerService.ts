import { db } from '../lib/firebase.js';
import { sendFCMNotification } from '../handler/pushnotification.js';
import { produceMessage } from '../lib/kafkaProducer.js';

interface Drowsiness {
  status_code: number;
}

interface Detection {
  drowsiness: Drowsiness;
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

export const listenToDrowsiness = () => {
  const drowsinessDetectRef = db.ref('vehicle');

  drowsinessDetectRef.on('child_changed', async (snapshot) => {
    const vehicleId = snapshot.key!;
    const detection: Detection | null = snapshot.val()?.detection;

    const settings = await getVehicleSettings(vehicleId);

    if (!settings || !settings.enabled) {
      console.log(`[.] Settings disabled for vehicle ${vehicleId}.`);
      return;
    }

    if (typeof detection?.drowsiness?.status_code == 'number') {
      
      if (detection.drowsiness.status_code == 1) {
        console.log(
          `[.] User yawning  on vehicle ${vehicleId}.`,
        );

        // const number = await getWhatsAppNumber(vehicleId);
        const details = await getUserDetails(vehicleId);
        if (!details) {
          console.warn(`[X] No WA User found for vehicleId ${vehicleId}`);
          return;
        }

        if (shouldSendNotification(vehicleId, settings.notificationInterval)) {
          const kafkaMessage: KafkaNotificationMessage = {
            vehicleId,
            message: ` *ʏᴀᴡɴɪɴɢ ᴅᴇᴛᴇᴄᴛᴇᴅ* 💤💤\n*Kami mendeteksi anda menguap, jika mengantuk istirahatlah sebentar demi keselamatan ☕*\n\n🛎️ Notifikasi akan kembali dikirimkan dalam interval ${settings.notificationInterval} menit kedepan\n\n*/ɴᴏᴛɪꜰʏ ᴏꜰꜰ* untuk mematikan notifikasi\n*/sᴇᴛɪɴᴛᴇʀᴠᴀʟ <ᴍɪɴ>* untuk merubah interval`,
            number: details.number,
            isGroup: details.isGroup,
          };
          await sendNotification(kafkaMessage);

          const title = `💤 Yawning Detected!`;
          const body = `Terdeteksi menguap, jika mengantuk istirahat dahulu ☕}`;
          const yawningImageUrl = `https://thumb.ac-illust.com/0b/0bc27691456f9c8b97b5dd634b5dc8e6_t.jpeg`;

          await sendFCMNotification(vehicleId, title, body, yawningImageUrl);
        }
      } else if (detection.drowsiness.status_code == 2) {

          console.log(
          `[.] User sleepy on vehicle ${vehicleId}.`,
        );

        // const number = await getWhatsAppNumber(vehicleId);
        const details = await getUserDetails(vehicleId);
        if (!details) {
          console.warn(`[X] No WA User found for vehicleId ${vehicleId}`);
          return;
        }

        if (shouldSendNotification(vehicleId, settings.notificationInterval)) {
          const kafkaMessage: KafkaNotificationMessage = {
            vehicleId,
            message: `💤💤 *sʟᴇᴇᴘʏ ᴅᴇᴛᴇᴄᴛᴇᴅ* 💤💤\n*Kami mendeteksi anda mengantuk, usahakan tetap fokus dalam berkendara atau istirahat dahulu demi keselamatan ☕*\n\n🛎️ Notifikasi akan kembali dikirimkan dalam interval ${settings.notificationInterval} menit kedepan\n\n*/ɴᴏᴛɪꜰʏ ᴏꜰꜰ* untuk mematikan notifikasi\n*/sᴇᴛɪɴᴛᴇʀᴠᴀʟ <ᴍɪɴ>* untuk merubah interval`,
            number: details.number,
            isGroup: details.isGroup,
          };
          await sendNotification(kafkaMessage);

          const title = `💤 Sleepy Detected!`;
          const body = `Anda mengantuk, tetap fokus atau istirahat dahulu ☕}`;
          const yawningImageUrl = `https://media.istockphoto.com/id/1068466754/vector/sleepless-girl-suffers-from-insomnia.jpg?s=612x612&w=0&k=20&c=dXxtQfCFpo6f2AkR-551szCUbghVO3RueRF6RqFdtRM=`;

          await sendFCMNotification(vehicleId, title, body, yawningImageUrl);
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
