import { buildJitsiRoomName, JitsiAdapter } from '../providers/liveclass/jitsi.adapter';

describe('buildJitsiRoomName', () => {
  it('slugifies the title and appends a deterministic suffix from ref', () => {
    expect(buildJitsiRoomName('Algebra 101: Week 1!', 'session-abcd1234')).toBe('algebra-101-week-1-abcd1234');
  });

  it('falls back to "session" when the title has no usable characters', () => {
    expect(buildJitsiRoomName('!!!', 'ref12345')).toBe('session-ref12345');
  });
});

describe('JitsiAdapter', () => {
  it('builds a join URL on the configured base, no key required', async () => {
    const room = await new JitsiAdapter('https://meet.jit.si').createRoom({
      title: 'Math Class',
      ref: 'sess-00001234',
    });
    expect(room.provider).toBe('jitsi');
    expect(room.joinUrl).toBe('https://meet.jit.si/math-class-00001234');
    expect(room.hostUrl).toBe(room.joinUrl);
  });
});
