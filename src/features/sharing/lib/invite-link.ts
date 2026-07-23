/** Build the absolute invite URL for a secret token. */
export function inviteUrlForToken(token: string) {
  if (typeof window === "undefined") {
    return `/invite/${token}`;
  }
  return `${window.location.origin}/invite/${token}`;
}

export async function copyInviteLink(token: string) {
  const url = inviteUrlForToken(token);
  await navigator.clipboard.writeText(url);
  return url;
}
