/*
Sample SMS worker for the project.

Usage:
  - Set `GOOGLE_APPLICATION_CREDENTIALS` to your service account JSON path
  - Optionally set `SMS_PROVIDER_URL` and `SMS_PROVIDER_API_KEY` to use a real provider
  - Run: `node functions/smsWorkerSample.js`

Behavior:
  - Listens for new entries under Realtime DB `/smsQueue` (child_added)
  - Processes entries with `status === 'pending'`
  - Attempts to send using configured provider (or mock)
  - Updates `/smsQueue/{id}` with `status` ('sent'|'error'), `attempts`, and `providerResponse`
  - Also updates Firestore `wallet_history/{walletHistoryId}.smsStatus` or `roitai/{roitaiId}.sms` when applicable
*/

const admin = require('firebase-admin');
const axios = require('axios');

// Init admin (expects GOOGLE_APPLICATION_CREDENTIALS or environment defaults)
admin.initializeApp();
const realtime = admin.database();
const firestore = admin.firestore();

const SMS_PROVIDER_URL = process.env.SMS_PROVIDER_URL || '';
const SMS_PROVIDER_API_KEY = process.env.SMS_PROVIDER_API_KEY || '';
const RETRY_MAX = parseInt(process.env.SMS_RETRY_MAX || '3', 10);
const PROCESS_CONCURRENCY = parseInt(process.env.SMS_WORKER_CONCURRENCY || '4', 10);

console.log('SMS Worker starting...');
console.log('Using provider url:', SMS_PROVIDER_URL ? 'configured' : 'mock');

const sendSmsViaProvider = async ({ phone, message }) => {
  if (!SMS_PROVIDER_URL) {
    // mock send
    await new Promise((res) => setTimeout(res, 300));
    return { success: true, providerId: `mock-${Date.now()}` };
  }

  try {
    const resp = await axios.post(SMS_PROVIDER_URL, {
      to: phone,
      message,
    }, {
      headers: SMS_PROVIDER_API_KEY ? { Authorization: `Bearer ${SMS_PROVIDER_API_KEY}` } : {},
      timeout: 15000,
    });

    return { success: true, providerId: resp.data && resp.data.id ? resp.data.id : null, raw: resp.data };
  } catch (err) {
    return { success: false, error: err.message || String(err), raw: err.response ? err.response.data : null };
  }
};

let processing = new Set();

const processQueueItem = async (id, data) => {
  if (!data || data.status !== 'pending') return;
  if (processing.has(id)) return;
  processing.add(id);

  try {
    const attempts = Number(data.attempts || 0) + 1;
    console.log(`Processing smsQueue/${id} (attempt ${attempts}) -> ${data.phone}`);

    // send
    const result = await sendSmsViaProvider({ phone: data.phone, message: data.smsMessage || data.message || '' });

    if (result.success) {
      // update realtime queue
      await realtime.ref(`smsQueue/${id}`).update({
        status: 'sent',
        attempts,
        providerResponse: result.raw || { providerId: result.providerId },
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });

      // update firestore if walletHistoryId present
      if (data.walletHistoryId) {
        try {
          await firestore.collection('wallet_history').doc(data.walletHistoryId).update({
            smsStatus: 'sent',
            smsSentAt: admin.firestore.FieldValue.serverTimestamp(),
            smsProviderResponse: result.raw || { providerId: result.providerId },
          });
        } catch (e) {
          console.error('Failed to update wallet_history:', e.message || e);
        }
      }

      // update roitai doc if type indicates roitai
      if (data.roitaiId || data.type === 'roitai') {
        const rid = data.roitaiId || (data.walletHistoryId && String(data.walletHistoryId).startsWith('roitai_') ? String(data.walletHistoryId).replace('roitai_', '') : null);
        if (rid) {
          try {
            await firestore.collection('roitai').doc(rid).update({
              sms: 'sent',
              smsSentAt: admin.firestore.FieldValue.serverTimestamp(),
              smsProviderResponse: result.raw || { providerId: result.providerId },
            });
          } catch (e) {
            console.error('Failed to update roitai:', e.message || e);
          }
        }
      }

      console.log(`smsQueue/${id} sent`);
    } else {
      const isFinal = attempts >= RETRY_MAX;
      const newStatus = isFinal ? 'error' : 'pending';

      await realtime.ref(`smsQueue/${id}`).update({
        status: isFinal ? 'error' : 'pending',
        attempts,
        providerResponse: result.raw || { error: result.error },
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });

      console.warn(`smsQueue/${id} send failed (attempt ${attempts}). final=${isFinal} err=${result.error}`);

      if (isFinal) {
        // update firestore wallet_history if present
        if (data.walletHistoryId) {
          try {
            await firestore.collection('wallet_history').doc(data.walletHistoryId).update({
              smsStatus: 'error',
              smsSentAt: admin.firestore.FieldValue.serverTimestamp(),
              smsProviderResponse: result.raw || { error: result.error },
            });
          } catch (e) {
            console.error('Failed to update wallet_history on error:', e.message || e);
          }
        }
      }
    }
  } catch (err) {
    console.error('Unexpected worker error:', err.message || err);
  } finally {
    processing.delete(id);
  }
};

// Listen for new items
const queueRef = realtime.ref('smsQueue');

queueRef.on('child_added', (snapshot) => {
  const id = snapshot.key;
  const data = snapshot.val();
  if (!data) return;
  if (data.status === 'pending') processQueueItem(id, data);
});

// Also listen for updates so retries or newly marked pending get picked up
queueRef.on('child_changed', (snapshot) => {
  const id = snapshot.key;
  const data = snapshot.val();
  if (!data) return;
  if (data.status === 'pending') processQueueItem(id, data);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  queueRef.off();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  queueRef.off();
  process.exit(0);
});

module.exports = { processQueueItem };
