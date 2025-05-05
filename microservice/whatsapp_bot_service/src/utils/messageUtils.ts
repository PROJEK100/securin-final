import { AnyMessageContent, delay, WASocket } from '@whiskeysockets/baileys';

export const sendMessageWTyping = async (
   sock: WASocket,
   msg: AnyMessageContent,
   jid: string,
) => {
   await sock.presenceSubscribe(jid);
   await delay(500);

   await sock.sendPresenceUpdate('composing', jid);
   await delay(2000);

   await sock.sendPresenceUpdate('paused', jid);

   await sock.sendMessage(jid, msg);
};
