/** Maps a Firebase Auth error to warm, plain-spoken copy instead of a raw error code. */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null | undefined)?.code;

  switch (code) {
    case 'auth/email-already-in-use':
      return "Looks like there's already an account with that email — try signing in instead.";
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return "That email and password don't match what we have. Mind trying again?";
    case 'auth/weak-password':
      return 'Passwords need to be at least 6 characters.';
    case 'auth/invalid-email':
      return "That email doesn't look quite right.";
    case 'auth/network-request-failed':
      return "Couldn't reach the network — check your connection and try again.";
    case 'auth/too-many-requests':
      return 'Too many tries — give it a minute and try again.';
    default:
      return "Something didn't work on our end. Mind trying again in a moment?";
  }
}
