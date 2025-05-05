import { db } from '../lib/firebase.js';

export const listenToSettings = () => {
  const ref = db.ref('settings');

  ref.on('child_changed', (snapshot) => {
    const vehicleId = snapshot.key!;
    const settings = snapshot.val();

    console.log(`[.] Settings updated for vehicle ${vehicleId}`);

    Object.keys(settings || {}).forEach((feature) => {
      const featureSettings = settings[feature];

      if (typeof featureSettings?.enabled !== 'undefined') {
        const state = featureSettings.enabled ? 'enabled' : 'disabled';
        console.log(
          `[NOTIFY] ${feature.toUpperCase()} setting is ${state} for vehicle ${vehicleId}`,
        );
      }
    });
  });

  console.log('[+] Listening to settings updates...');
};
