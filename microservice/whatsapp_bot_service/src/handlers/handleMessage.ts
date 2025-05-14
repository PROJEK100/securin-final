import { WASocket } from '@whiskeysockets/baileys';
import { sendMessageWTyping } from '../utils/messageUtils.js';
import {
   isUserInitialized,
   initializeUser,
   getUserVehicleId,
   setRadius,
   setNotify,
   setSwitch,
   setNotifInterval,
   setSecurityMode,
   setEmergencyNumber,
   abortIncident,
   removeNodeIncident
} from '../services/firebaseService.js';

import {
   formatInfoMessage,
   formatModemMessage,
   formatVehicleLocation,
   formatVehicleStatusMessage,
   helpMessage,
   initializeExampleMessage,
   intervalExampleMessage,
   emergencyExampleMessage,
   notifyExampleMessage,
   securityExampleMessage,
   successInitializeMessage,
   unitializedMessage,
   abortedMessage,
} from '../messages/messageComposer.js';

const commands: {
   [key: string]: (
      sock: WASocket,
      jid: string,
      username: string,
      args: string[],
   ) => Promise<void>;
} = {
   init: async (sock, jid, senderName, args) => {
      const vehicleId = args[0];

      if (!vehicleId) {
         await sendMessageWTyping(
            sock,
            {
               text: initializeExampleMessage(),
            },
            jid,
         );
         return;
      }

      await initializeUser(jid, vehicleId);

      const message = await successInitializeMessage(senderName, vehicleId);
      await sendMessageWTyping(
         sock,
         {
            text: message,
         },
         jid,
      );
   },
   help: async (sock, jid, username) => {
      const [context, formattedMessage] = await helpMessage(username);

      await sendMessageWTyping(
         sock,
         {
            text: formattedMessage,
            contextInfo: context,
         },
         jid,
      );
   },
   test: async (sock, jid) => {
      await sendMessageWTyping(sock, { text: 'Hello test!' }, jid);
   },
   on: async (sock, jid) => {
      const vehicleId = await getUserVehicleId(jid);
      await sendMessageWTyping(
         sock,
         { text: await setSwitch(vehicleId!, true) },
         jid,
      );
   },
   off: async (sock, jid) => {
      const vehicleId = await getUserVehicleId(jid);
      await sendMessageWTyping(
         sock,
         { text: await setSwitch(vehicleId!, false) },
         jid,
      );
   },
   info: async (sock, jid) => {
      const vehicleId = await getUserVehicleId(jid);
      await sendMessageWTyping(
         sock,
         { text: await formatInfoMessage(vehicleId!) },
         jid,
      );
   },
   location: async (sock, jid) => {
      const vehicleId = await getUserVehicleId(jid);
      await sendMessageWTyping(
         sock,
         { location: await formatVehicleLocation(vehicleId!) },
         jid,
      );
   },
   notify: async (sock, jid, _, args) => {
      if (!args[0]) {
         await sendMessageWTyping(sock, { text: notifyExampleMessage() }, jid);
         return;
      }

      const input = args[0].toLowerCase();
      if (input !== 'on' && input !== 'off') {
         await sendMessageWTyping(sock, { text: notifyExampleMessage() }, jid);
         return;
      }

      const vehicleId = await getUserVehicleId(jid);
      await sendMessageWTyping(
         sock,
         { text: await setNotify(vehicleId!, input) },
         jid,
      );
   },
   security: async (sock, jid, _, args) => {
      if (!args[0]) {
         await sendMessageWTyping(
            sock,
            { text: securityExampleMessage() },
            jid,
         );
         return;
      }

      const input = args[0].toLowerCase();
      if (input !== 'high' && input !== 'normal') {
         await sendMessageWTyping(
            sock,
            { text: securityExampleMessage() },
            jid,
         );
         return;
      }

      const vehicleId = await getUserVehicleId(jid);
      await sendMessageWTyping(
         sock,
         { text: await setSecurityMode(vehicleId!, input) },
         jid,
      );
   },
   setradius: async (sock, jid, _, args) => {
      const vehicleId = await getUserVehicleId(jid);
      const radius = parseInt(args[0]);
      if (typeof vehicleId != 'string' && typeof radius != 'number') return;

      await sendMessageWTyping(
         sock,
         {
            text: await setRadius(vehicleId!, radius),
         },
         jid,
      );
   },
   setinterval: async (sock, jid, _, args) => {
      const vehicleId = await getUserVehicleId(jid);
      const interval = parseInt(args[0]);

      if (typeof vehicleId != 'string' || typeof interval != 'number') {
         await sendMessageWTyping(
            sock,
            { text: intervalExampleMessage() },
            jid,
         );

         return;
      } else {
         await sendMessageWTyping(
            sock,
            {
               text: await setNotifInterval(vehicleId!, interval),
            },
            jid,
         );
      }
   },
   setemergency: async (sock, jid, _, args) => {
      const vehicleId = await getUserVehicleId(jid);
      const emergencyNumber = args[0];

      if (emergencyNumber == null) {
         await sendMessageWTyping(
            sock,
            { text: emergencyExampleMessage() },
            jid,
         );

         return;
      } else {
         await sendMessageWTyping(
            sock,
            {
               text: await setEmergencyNumber(vehicleId!, emergencyNumber),
            },
            jid,
         );
      }
   },
   abort: async (sock, jid) => {
      const vehicleId = await getUserVehicleId(jid);

      await abortIncident(vehicleId!);

      // await removeNodeIncident(vehicleId!);
      await sendMessageWTyping(
         sock,
         {
            text: abortedMessage(),
         },
         jid,
      );
   },
   status: async (sock, jid) => {
      const vehicleId = await getUserVehicleId(jid);

      await sendMessageWTyping(
         sock,
         { text: await formatVehicleStatusMessage(vehicleId!) },
         jid,
      );
   },
   modem: async (sock, jid) => {
      const vehicleId = await getUserVehicleId(jid);

      await sendMessageWTyping(
         sock,
         { text: await formatModemMessage(vehicleId!) },
         jid,
      );
   },
};

export const commandMiddleware = async (
   sock: WASocket,
   jid: string,
   command: string,
   username: string,
   args: string[],
   handler: (
      sock: WASocket,
      jid: string,
      username: string,
      args: string[],
   ) => Promise<void>,
) => {
   if (command !== 'init') {
      const isInitialized = await isUserInitialized(jid);
      if (!isInitialized) {
         await sendMessageWTyping(
            sock,
            {
               text: unitializedMessage(),
            },
            jid,
         );
         return;
      }
   }

   await handler(sock, jid, username, args);
};

export const handleMessage = async (
   body: string,
   username: string,
   jid: string,
   sock: WASocket,
) => {
   try {
      const prefix = body[0];
      if (!['/', '!', '#', '.'].includes(prefix)) return;

      const [command, ...args] = body.slice(1).trim().split(/ +/);

      const handler = commands[command?.toLowerCase()];
      if (handler) {
         await commandMiddleware(sock, jid, command, username, args, handler);
      } else {
         await sendMessageWTyping(
            sock,
            { text: 'Ketikkan */help* untuk melihat commands.' },
            jid,
         );
      }
   } catch (error) {
      console.error('Error handling message:', { body, jid, error });
   }
};
