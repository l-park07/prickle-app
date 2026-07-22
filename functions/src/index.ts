/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
// auth.user().onDelete is a v1-only identity trigger — no v2 equivalent yet —
// so it's imported separately from the v2-default imports above. Firebase
// supports mixed v1/v2 exports from the same index.ts.
import * as functionsV1 from "firebase-functions/v1";
import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

/**
 * Cascades an account deletion to the account-side data we control
 * server-side. Scoped to uid-keyed records only — mail_prefs/{uid},
 * users/{uid} (Firestore), and the users/{uid}/ Storage prefix. The
 * website's waitlist collection isn't keyed by uid and is handled
 * separately; this function never touches it.
 */
export const onUserDelete = functionsV1.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const db = getFirestore();
  await db.doc(`mail_prefs/${uid}`).delete().catch(() => undefined);
  // Phase 3: also delete the user's synced logs/photos.
  await db.recursiveDelete(db.collection("users").doc(uid))
    .catch(() => undefined);
  await getStorage()
    .bucket()
    .deleteFiles({prefix: `users/${uid}/`})
    .catch(() => undefined);
});
