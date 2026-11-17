// Where this device keeps the friend behind an invite link until the visitor signs up.
export const INVITE_KEY = "mofi:invite";

// Set once a wallet has been asked for an invite code on this device (or can't use one), so it isn't asked again.
export const askedKey = (wallet: string) => `mofi:invite-asked:${wallet}`;
