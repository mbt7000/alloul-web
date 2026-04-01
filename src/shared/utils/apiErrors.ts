/** Normalize thrown API/network errors for UI copy. */
export function formatApiError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message: string }).message;
    if (m === "NETWORK_UNREACHABLE") return "No connection. Check your network.";
    return String(m);
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}
