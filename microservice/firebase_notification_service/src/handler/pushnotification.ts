import { admin, db } from '../lib/firebase.js';

/**
 * @param vehicleId - ID of the vehicle whose tokens will receive the notification
 * @param title - Notification title
 * @param body - Notification body
 * @param imageUrl - Optional URL for notification image
 */
export async function sendFCMNotification(
  vehicleId: string,
  title: string,
  body: string,
  imageUrl?: string,
) {
  try {
    const tokensRef = db.ref(`settings/${vehicleId}/fcm_token`);
    const snapshot = await tokensRef.once('value');
    const tokensData = snapshot.val() as Record<
      string,
      { token: string; updatedAt: number }
    > | null;

    if (!tokensData) {
      console.warn(`[FCM] No tokens found for vehicle ${vehicleId}`);
      return;
    }

    // Collect all tokens
    const tokens = Object.values(tokensData).map((t) => t.token);
    if (tokens.length === 0) {
      console.warn(`[FCM] Token list is empty for vehicle ${vehicleId}`);
      return;
    }

    const BATCH_SIZE = 500;
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batchTokens = tokens.slice(i, i + BATCH_SIZE);

      const message: admin.messaging.MulticastMessage = {
        notification: { title, body },
        android: imageUrl ? { notification: { imageUrl } } : undefined,
        tokens: batchTokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(
        `[FCM] Sent ${response.successCount} notifications, ${response.failureCount} failures for vehicle ${vehicleId}`,
      );
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(
              `[FCM] Error sending to ${batchTokens[idx]}:`,
              resp.error,
            );
          }
        });
      }
    }
  } catch (error) {
    console.error(`[FCM] sendNotif error for vehicle ${vehicleId}:`, error);
  }
}