"use client";

import { getAccessToken } from "@privy-io/react-auth";

// POSTs to Mofi's server as the signed-in user, so routes that cost Mofi money know who is asking.
export async function postJson(path: string, body: object) {
  const token = await getAccessToken();
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body),
  });
}
