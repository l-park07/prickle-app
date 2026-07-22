# Prickle — privacy & consent: where everything goes and how it connects

You have **two repos** (or two deploy targets): the **website** (getprickle.app) and
the **app** (Expo). The two are connected by exactly one thing — a URL — plus one
version string you keep in sync. That's the whole coupling. Nothing else has to
build together.

---

## 1. Website repo (getprickle.app)

Drop these two files wherever your site serves static HTML from (root, `/public`,
`/static`, `/docs` for GitHub Pages — depends on your host):

| File | Served at |
|---|---|
| `privacy.html` | `https://getprickle.app/privacy.html` |
| `contact.html` | `https://getprickle.app/contact.html` |

**Wire up the contact form (5 min):**
1. Go to web3forms.com, enter your email, get a free **access key** (no account needed).
2. In `contact.html`, replace `YOUR_WEB3FORMS_ACCESS_KEY` with it.
3. Submissions now arrive in your inbox. (Formspree or Basin work the same way if
   you prefer — swap the `action` URL and field.)

The contact form doubles as your **Google Play / App Store account-deletion URL**.
Both stores now require a way to request deletion; point them at
`https://getprickle.app/contact.html`.

---

## 2. App repo (Expo)

Place the files (these assume `@/*` resolves to your project root — check
`tsconfig.json` `compilerOptions.paths`; adjust if you use `src/`):

| File | Path |
|---|---|
| `constants/privacy.ts` | `@/constants/privacy` |
| `lib/consent.ts` | `@/lib/consent` |
| `components/EmailUpdatesOptIn.tsx` | signup + settings |
| `components/onboarding/PrivacyConsentStep.tsx` | onboarding carousel |
| `components/account/PrivacyScreen.tsx` | account modal → Privacy tab |
| `components/settings/CloudSyncToggle.tsx` | settings (Phase 3) |

**Install the deps used by these files:**
```bash
npx expo install expo-web-browser react-native-webview
# AsyncStorage you already have (Firebase Auth persistence uses it).
# @expo/vector-icons ships with Expo.
```

**Adjust to your conventions:** the components reference `AppText` variants
(`title`, `body`, `link`, `button`, `caption`) and `theme.palette` keys
(`sage`, `sageDeep`, `clay`, `inkSoft`). Rename to match your actual `AppText`
variants and `theme.ts`.

---

## 3. Wiring each piece

**Onboarding consent** — add `PrivacyConsentStep` as one screen of the Welcome →
name → … carousel (put it right after Welcome). Its `onAccept` records consent and
should advance the carousel. Consent is captured here, so finishing onboarding
implies the user agreed to the current policy version.

**Signup email opt-in** — put `<EmailUpdatesOptIn variant="checkbox" />` on your
account-creation screen (default off). After the Firebase account is created and
you have a `uid`, read the preference and write it to Firestore (section 4):
```ts
import { getEmailUpdatesOptIn } from '@/lib/consent';
const optedIn = await getEmailUpdatesOptIn();
if (optedIn) await setMailPref(uid, true); // section 4
```

**Account modal → Privacy tab** — replace that tab's body with `<PrivacyScreen />`.
It loads the live website page, so editing `privacy.html` updates the in-app view
with no app release.

**Settings** — add `<CloudSyncToggle />` and `<EmailUpdatesOptIn variant="switch" />`
so both opt-ins are changeable anytime.

**Root-layout gate (re-consent on updates)** — in your root `_layout.tsx`, alongside
the `onboarding_complete` check, verify consent is current. This is what makes a
future policy change re-prompt existing users:
```ts
import { hasCurrentPrivacyConsent } from '@/lib/consent';

// ...after loading onboarding_complete:
const consentOk = await hasCurrentPrivacyConsent();
if (onboardingComplete && !consentOk) {
  // Policy version was bumped since they agreed → show a short re-consent screen
  // (reuse PrivacyConsentStep, onAccept just dismisses it).
}
```

---

## 4. Storing email opt-ins in Firestore (data-minimizing)

Don't duplicate the email — Auth already has it. Store only a flag keyed by uid:

```
mail_prefs/{uid} = { optedIn: true, updatedAt: <ts>, policyVersion: "2026-07-21" }
```

Helper (put in `lib/mailPrefs.ts`):
```ts
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PRIVACY_POLICY_VERSION } from '@/constants/privacy';

export async function setMailPref(uid: string, optedIn: boolean) {
  const ref = doc(db, 'mail_prefs', uid);
  if (optedIn) {
    await setDoc(ref, { optedIn: true, updatedAt: serverTimestamp(), policyVersion: PRIVACY_POLICY_VERSION });
  } else {
    await deleteDoc(ref); // opt-out = remove the record entirely
  }
}
```
Then in `lib/consent.ts`, fill the `syncEmailUpdatesPref` stub to call `setMailPref`.

**Security rules** (`firestore.rules`) — a user may only touch their own record:
```
match /mail_prefs/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```
Your server (Admin SDK) bypasses rules to read the list when sending.

**Sending** still needs a delivery service — the "Trigger Email" Firebase Extension
(SendGrid/Mailgun under the hood) or a Cloud Function + email API. At send time,
list `mail_prefs` where `optedIn == true`, resolve each email from Auth by uid, send,
and include an unsubscribe link. **If that provider is external, add "an email
delivery provider" to the Privacy Policy's "who we share with" section.**

---

## 5. Deletion that actually cascades

When someone deletes their account (via the app or the contact form), remove
everything. A Cloud Function on Auth user-deletion is the robust way — it fires
whether deletion came from the app or you doing it manually in the console:

```ts
// functions/src/index.ts  (Cloud Functions)
import * as functions from 'firebase-functions/v1';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

export const onUserDelete = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const db = getFirestore();
  await db.doc(`mail_prefs/${uid}`).delete().catch(() => {});
  // Phase 3: also delete the user's synced logs/photos
  await db.recursiveDelete(db.collection('users').doc(uid)).catch(() => {});
  await getStorage().bucket().deleteFiles({ prefix: `users/${uid}/` }).catch(() => {});
});
```

For form-based requests you verify identity first (the form asks for the account
email), then delete the Auth user in the console — the function does the rest.
On-device data is already gone once they uninstall; deletion here is about the
account and any cloud backup.

---

## 6. The one ritual to remember

The website policy and the app's version string must move together. When you make
a **material** change (anything affecting how personal/health data is handled):

1. Edit `privacy.html`, update the **"Last updated"** date.
2. Bump `PRIVACY_POLICY_VERSION` in `constants/privacy.ts` to match, ship an app update.

`hasCurrentPrivacyConsent()` then returns false for existing users and the
root-layout gate re-prompts them. Small typo fixes don't need a bump.

---

## 7. Claude Code prompts for wiring it in

Use these one at a time, in order. They assume you've dropped the six app files
**and this INTEGRATION.md** into `scratch/` first (your usual pattern), and that
you'll run each in **plan mode**, approve the plan, then review the diff. Firebase
console steps, rule/function **deploys**, and `.env` values you do yourself — the
prompts are written to stop before those.

### Prompt 1 — Place files, fix imports, install deps
```
Plan mode. I've put six reference files in scratch/: constants/privacy.ts,
lib/consent.ts, components/EmailUpdatesOptIn.tsx,
components/onboarding/PrivacyConsentStep.tsx,
components/account/PrivacyScreen.tsx,
components/settings/CloudSyncToggle.tsx.

First read the project structure and my conventions: the tsconfig path alias,
where constants/lib/components live, the variant names in components/AppText.tsx,
and the palette keys in theme/theme.ts. Then move each file to the right place and
fix it to match: correct import paths, rename AppText `variant` values and
`theme.palette` keys to ones that actually exist. Run
`npx expo install expo-web-browser react-native-webview`.

Do NOT wire anything into screens yet — just place, fix, and typecheck. Show the
plan first.
```

### Prompt 2 — Onboarding consent step
```
Plan mode. Add PrivacyConsentStep as one screen in the onboarding carousel, right
after the Welcome/name step and before the Sites/Triggers/Medications steps. Match
how the existing carousel steps are structured and navigated. Its onAccept already
records consent internally — it should advance the carousel. Don't touch the
onboarding_complete flag logic in this step. Show the plan first.
```

### Prompt 3 — Root-layout re-consent gate
```
Plan mode. In the root _layout.tsx, next to the existing onboarding_complete
check, call hasCurrentPrivacyConsent() from @/lib/consent. If onboarding is
complete but consent is stale (i.e. the policy version was bumped since they
agreed), route to a lightweight re-consent screen that reuses PrivacyConsentStep,
where onAccept just records and dismisses. Keep all other gating behaviour
identical. Show the plan first.
```

### Prompt 4 — Signup email opt-in
```
Plan mode. On the account-creation screen, add <EmailUpdatesOptIn
variant="checkbox" /> (it defaults to off). After the Firebase account is created
and user.uid exists, read the preference with getEmailUpdatesOptIn() and, if true,
persist it via setMailPref(uid, true).

Create lib/mailPrefs.ts exactly as described in scratch/INTEGRATION.md section 4,
using my existing Firestore `db` export. Then wire the syncEmailUpdatesPref stub in
lib/consent.ts to call setMailPref. Don't deploy anything. Show the plan first.
```

### Prompt 5 — Privacy tab + settings toggles
```
Plan mode. Replace the body of the existing Privacy tab under the account modal
with <PrivacyScreen />. In the settings/profile screen, add <CloudSyncToggle /> and
<EmailUpdatesOptIn variant="switch" />, matching my existing settings-row layout and
spacing. Show the plan first.
```

### Prompt 6 — Firestore rules + deletion cascade
```
Plan mode. Add the mail_prefs security rule from scratch/INTEGRATION.md section 4
to firestore.rules. Then, if a Cloud Functions project exists, add the onUserDelete
function from section 5; if there is NO functions/ setup yet, stop and tell me so I
can run `firebase init functions` first. Do NOT deploy rules or functions — I'll
deploy them myself. Show the plan first.
```

**After each:** review the diff, then run your usual checks — `npx tsc --noEmit`,
and for anything touching bundling, `npx expo export --platform android` plus a grep
to confirm no dev/seed ids leaked (per your existing verification step).
