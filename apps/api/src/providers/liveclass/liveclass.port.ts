/**
 * Capability port for live video sessions. Feature code depends only on this interface, never
 * a vendor SDK. The free-first default is Jitsi Meet (public meet.jit.si — no account, no key).
 * Swap LIVECLASS_PROVIDER (jitsi | livekit | bbb | ...) with no feature-code changes.
 */
export const LIVECLASS_PORT = Symbol('LIVECLASS_PORT');

export interface CreateRoomInput {
  /** Human-friendly room title (used to derive a unique room name). */
  title: string;
  /** Optional stable id to make the room deterministic (e.g. session id). */
  ref?: string;
  /** Display name of the host. */
  hostName?: string;
}

export interface LiveRoom {
  provider: string;
  roomName: string;
  /** URL participants open to join. */
  joinUrl: string;
  /** Optional separate moderator URL/token. */
  hostUrl?: string;
}

export interface LiveClassPort {
  readonly name: string;
  createRoom(input: CreateRoomInput): Promise<LiveRoom>;
}
