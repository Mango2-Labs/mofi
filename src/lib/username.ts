// A Mofi username: 3 to 20 lowercase letters, numbers or underscores. It's what an invite link carries.
export const USERNAME = /^[a-z0-9_]{3,20}$/;

// What someone typed, as a username would have it.
export const cleanUsername = (typed: string) => typed.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
