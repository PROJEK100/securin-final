import { WASocket } from '@whiskeysockets/baileys';
import { sendMessageWTyping } from '../utils/messageUtils.js';

export interface NotificationMessage {
   number: string;
   isGroup: boolean;
   vehicleId: string;
   message: string;
}

export const handleNotification = async (
   message: NotificationMessage,
   sock: WASocket,
): Promise<void> => {
   if (message?.number && message?.isGroup && message?.vehicleId && message?.message) {
      const number = `${message.number}`
      const endWith = message.isGroup ? '@g.us' : '@s.whatsapp.net';
      const jid = `${number+endWith}`
      console.log(jid)
      try {
         await sendMessageWTyping(sock, { text: message.message }, jid);
         console.log(
            `[✓] [BAILEYS] WhatsApp notification from kafka sent to ${jid}`,
         );
      } catch (error) {
         console.error(
            `[X] [BAILEYS] Failed to send WhatsApp message to ${jid}:`,
            error,
         );
      }
   } else {
      console.warn('[!] [NOTIFY] Invalid message format received:', message);
   }
};
