import { db } from '../lib/firebase.js';
import { produceMessage } from '../lib/kafkaProducer.js';

interface Electricity {
  voltage: number;
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

export const listenToElectricity = () => {
  const vehicleElectricityRef = db.ref('vehicle');

  vehicleElectricityRef.on('child_changed', async (snapshot) => {
    const vehicleId = snapshot.key!;
    const electricity: Electricity | null = snapshot.val()?.electricity;

    const settings = await getVehicleSettings(vehicleId);
    if (!settings || !settings.enabled) {
      console.log(`[.] Settings disabled for vehicle ${vehicleId}.`);
      return;
    }

    if (typeof electricity?.voltage == 'number') {
      if (electricity.voltage < 11) {
        console.log(
          `[.] Vehicle ${vehicleId} voltage status is low, now ${electricity.voltage} volt.`,
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
            message: `🪫 *ᴇʟᴇᴄᴛʀɪᴄɪᴛʏ ᴀʟᴇʀᴛ* 🪫\n*Motor anda dengan ID ${vehicleId}* mengalami penurunan sumber daya aki menjadi *${electricity.voltage} Volt*. Harap lakukan pengisian aki\n\n🛎️ Notifikasi akan kembali dikirimkan dalam interval ${settings.notificationInterval} menit kedepan\n\n*/ɴᴏᴛɪꜰʏ ᴏꜰꜰ* untuk mematikan notifikasi\n*/sᴇᴛɪɴᴛᴇʀᴠᴀʟ <ᴍɪɴ>* untuk merubah interval`,
            number: details.number,
            isGroup: details.isGroup
          };
          await sendNotification(kafkaMessage);
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

const getWhatsAppNumber = async (vehicleId: string): Promise<string | null> => {
  const wausersRef = db.ref('wausers');
  const snapshot = await wausersRef.once('value');
  const wausers = snapshot.val() as Record<
    string,
    { vehicleId: string }
  > | null;

  if (!wausers) return null;

  for (const [key, value] of Object.entries(wausers)) {
    if (value.vehicleId === vehicleId) return key;
  }

  return null;
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
