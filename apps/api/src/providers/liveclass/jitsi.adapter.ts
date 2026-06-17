import { CreateRoomInput, LiveClassPort, LiveRoom } from './liveclass.port';

/** Slugifies a title into a URL-safe, collision-resistant Jitsi room name. */
export function buildJitsiRoomName(title: string, ref?: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
  const suffix = ref ? ref.slice(-8) : Math.random().toString(36).slice(2, 10);
  return `${base || 'session'}-${suffix}`;
}

/**
 * Jitsi Meet adapter — free, public, no API key. Generates a unique room URL on the configured
 * Jitsi domain (default meet.jit.si). Self-hosting Jitsi only requires changing the base URL.
 */
export class JitsiAdapter implements LiveClassPort {
  readonly name = 'jitsi';

  constructor(private readonly baseUrl: string) {}

  async createRoom(input: CreateRoomInput): Promise<LiveRoom> {
    const roomName = buildJitsiRoomName(input.title, input.ref);
    const joinUrl = `${this.baseUrl.replace(/\/$/, '')}/${roomName}`;
    return { provider: this.name, roomName, joinUrl, hostUrl: joinUrl };
  }
}
