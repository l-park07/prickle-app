// Data-minimizing email opt-in storage: Auth already has the address, so this
// only stores a flag keyed by uid, not a duplicate copy of the email itself.

import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from './firebase';
import { PRIVACY_POLICY_VERSION } from '../constants/privacy';

export async function setMailPref(uid: string, optedIn: boolean): Promise<void> {
  const ref = doc(firestore, 'mail_prefs', uid);
  if (optedIn) {
    await setDoc(ref, {
      optedIn: true,
      updatedAt: serverTimestamp(),
      policyVersion: PRIVACY_POLICY_VERSION,
    });
  } else {
    await deleteDoc(ref); // opt-out = remove the record entirely
  }
}
