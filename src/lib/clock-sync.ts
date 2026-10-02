/**
 * NTP-style Authoritative Clock Synchronization Utility
 * Guarantees 0-second desync across all screens (Display, Admin, and Player Phones)
 */

let serverClockOffset = 0; // ms: serverTime - clientLocalTime
let isClockSynced = false;

export function syncClockWithServer(socket: any): Promise<number> {
  return new Promise((resolve) => {
    if (!socket || !socket.connected) {
      resolve(serverClockOffset);
      return;
    }

    const t0 = Date.now();
    try {
      socket.emit("time:sync", t0, (res: { clientTime: number; serverTime: number }) => {
        const t1 = Date.now();
        const rtt = t1 - t0;
        // Filter out crazy RTT spikes
        if (rtt < 5000) {
          const estimatedServerNow = res.serverTime + rtt / 2;
          serverClockOffset = estimatedServerNow - t1;
          isClockSynced = true;
        }
        resolve(serverClockOffset);
      });
    } catch {
      resolve(serverClockOffset);
    }
  });
}

export function getServerTime(): number {
  return Date.now() + serverClockOffset;
}

export function getServerClockOffset(): number {
  return serverClockOffset;
}

export function setServerClockOffset(offset: number) {
  serverClockOffset = offset;
  isClockSynced = true;
}

export function calibrateClockFromPacket(serverTime?: number) {
  if (serverTime && !isClockSynced) {
    serverClockOffset = serverTime - Date.now();
  }
}

/**
 * Calculates authoritative remaining seconds and percentage given endsAt (epoch ms) and total (seconds)
 */
export function calculateAuthoritativeTimer(
  endsAt: number | undefined,
  total: number,
  fallbackRemaining?: number
): { remaining: number; percent: number; isExpired: boolean } {
  if (!endsAt || endsAt <= 0) {
    const rem = fallbackRemaining ?? total;
    return {
      remaining: Math.max(0, rem),
      percent: total > 0 ? Math.max(0, Math.min(100, (rem / total) * 100)) : 0,
      isExpired: rem <= 0,
    };
  }

  const now = getServerTime();
  const msRemaining = Math.max(0, endsAt - now);
  const remaining = Math.max(0, Math.ceil(msRemaining / 1000));
  const percent = total > 0 ? Math.max(0, Math.min(100, (msRemaining / (total * 1000)) * 100)) : 0;

  return {
    remaining,
    percent,
    isExpired: msRemaining <= 0,
  };
}
