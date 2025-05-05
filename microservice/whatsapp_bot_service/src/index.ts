import { Boom } from '@hapi/boom';
import NodeCache from 'node-cache';
import readline from 'readline';
import {
   makeWASocket,
   DisconnectReason,
   fetchLatestBaileysVersion,
   getAggregateVotesInPollMessage,
   makeCacheableSignalKeyStore,
   makeInMemoryStore,
   useMultiFileAuthState,
   WAMessageContent,
   WAMessageKey,
} from '@whiskeysockets/baileys';

import Proto from '@whiskeysockets/baileys/WAProto/index.js';
import P from 'pino';
import { handleMessage } from './handlers/handleMessage.js';
import { listenToKafkaMessages } from './lib/kafkaListener.js';
import {
   NotificationMessage,
   handleNotification,
} from './handlers/notificationHandler.js';

const { proto } = Proto;

const logger = P(
   { timestamp: () => `,"time":"${new Date().toJSON()}"` },
   P.destination('./logs/wa-logs.txt'),
);
logger.level = 'trace';

const useStore = !process.argv.includes('--no-store');
const usePairingCode = process.argv.includes('--use-pairing-code');

const msgRetryCounterCache = new NodeCache();

const rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout,
});

const question = (text: string) =>
   new Promise<string>((resolve) => rl.question(text, resolve));

const store = useStore ? makeInMemoryStore({ logger }) : undefined;
store?.readFromFile('./auth/baileys_store_multi.json');

setInterval(() => {
   store?.writeToFile('./auth/baileys_store_multi.json');
}, 10_000);

const startSock = async () => {
   const { state, saveCreds } = await useMultiFileAuthState(
      'auth/baileys_auth_info',
   );
   // fetch latest version of WA Web
   const { version, isLatest } = await fetchLatestBaileysVersion();
   console.log(
      `[.] [BAILEYS] Using WA v${version.join('.')}, isLatest: ${isLatest}`,
   );

   const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: true,
      auth: {
         creds: state.creds,
         /** caching makes the store faster to send/recv messages */
         keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      msgRetryCounterCache,
      generateHighQualityLinkPreview: true,
      // ignore all broadcast messages -- to receive the same
      // comment the line below out
      // shouldIgnoreJid: jid => isJidBroadcast(jid),
      // implement to handle retries & poll updates
      getMessage,
   });

   store?.bind(sock.ev);

   // Pairing code for Web clients
   if (usePairingCode && !sock.authState.creds.registered) {
      // todo move to QR event
      const phoneNumber = await question('Please enter your phone number:\n');
      const code = await sock.requestPairingCode(phoneNumber);
      console.log(`Pairing code: ${code}`);
   }

   sock.ev.process(
      // events is a map for event name => event data
      async (events) => {
         // something about the connection changed
         // maybe it closed, or we received all offline message or connection opened
         if (events['connection.update']) {
            const update = events['connection.update'];
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
               // reconnect if not logged out
               if (
                  (lastDisconnect?.error as Boom)?.output?.statusCode !==
                  DisconnectReason.loggedOut
               ) {
                  startSock();
               } else {
                  console.log(
                     '[X] [BAILEYS] Connection closed. You are logged out.',
                  );
               }
            }

            console.log('[+] [BAILEYS] connection update', update);
         }

         // credentials updated -- save them
         if (events['creds.update']) {
            await saveCreds();
         }

         if (events['labels.association']) {
            console.log(events['labels.association']);
         }

         if (events['labels.edit']) {
            console.log(events['labels.edit']);
         }

         if (events.call) {
            console.log('[+] [BAILEYS] recv call event', events.call);
         }

         // history received
         if (events['messaging-history.set']) {
            const { chats, contacts, messages, isLatest, progress, syncType } =
               events['messaging-history.set'];
            if (syncType === proto.HistorySync.HistorySyncType.ON_DEMAND) {
               console.log(
                  'received on-demand history sync, messages=',
                  messages,
               );
            }
            console.log(
               `recv ${chats.length} chats, ${contacts.length} contacts, ${messages.length} msgs (is latest: ${isLatest}, progress: ${progress}%), type: ${syncType}`,
            );
         }

         // received a new message
         if (events['messages.upsert']) {
            const upsert = events['messages.upsert'];

            // console.log('[BAILEYS] recv messages ', JSON.stringify(upsert, undefined, 2));

            if (upsert.type === 'notify') {
               for (const msg of upsert.messages) {
                  if (!msg.key.fromMe) {
                     const text =
                        msg.message?.conversation ||
                        msg.message?.extendedTextMessage?.text;

                     console.log('[+] [BAILEYS] Received message: ', text);
                     console.log(msg)
                     if (
                        typeof text === 'string' &&
                        typeof msg.pushName === 'string'
                     ) {
                        try {
                           await sock!.readMessages([msg.key]);
                           await handleMessage(
                              text,
                              msg.pushName,
                              msg.key.remoteJid!,
                              sock,
                           );
                        } catch (err) {
                           console.error('Error processing message:', {
                              err,
                              text,
                           });
                        }
                     }
                  }
               }
            }
         }

         if (events['messages.update']) {
            // console.log(
            //    JSON.stringify(events['messages.update'], undefined, 2),
            // );

            for (const { key, update } of events['messages.update']) {
               if (update.pollUpdates) {
                  const pollCreation = await getMessage(key);
                  if (pollCreation) {
                     console.log(
                        'got poll update, aggregation: ',
                        getAggregateVotesInPollMessage({
                           message: pollCreation,
                           pollUpdates: update.pollUpdates,
                        }),
                     );
                  }
               }
            }
         }

         // if (events['message-receipt.update']) {
         //    console.log(events['message-receipt.update']);
         // }

         // if (events['messages.reaction']) {
         //    console.log(events['messages.reaction']);
         // }

         // if (events['presence.update']) {
         //    console.log(events['presence.update']);
         // }

         // if (events['chats.update']) {
         //    console.log(events['chats.update']);
         // }

         if (events['contacts.update']) {
            for (const contact of events['contacts.update']) {
               if (typeof contact.imgUrl !== 'undefined') {
                  const newUrl =
                     contact.imgUrl === null
                        ? null
                        : await sock!
                             .profilePictureUrl(contact.id!)
                             .catch(() => null);
                  console.log(
                     `contact ${contact.id} has a new profile pic: ${newUrl}`,
                  );
               }
            }
         }

         if (events['chats.delete']) {
            console.log('[-] [BAILEYS] chats deleted ', events['chats.delete']);
         }
      },
   );

   await listenToKafkaMessages<NotificationMessage>(
      'whatsapp-notifications',
      (message) => handleNotification(message, sock),
   );

   return sock;

   async function getMessage(
      key: WAMessageKey,
   ): Promise<WAMessageContent | undefined> {
      if (store) {
         const msg = await store.loadMessage(key.remoteJid!, key.id!);
         return msg?.message || undefined;
      }

      return proto.Message.fromObject({});
   }
};

startSock();
