import { detectPlatform, resolveTarget } from './deep-link';

describe('detectPlatform', () => {
  it('detects android, ios and defaults to web', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 13)')).toBe('android');
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('ios');
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0)')).toBe('web');
    expect(detectPlatform(undefined)).toBe('web');
  });
});

describe('resolveTarget', () => {
  const link = {
    targetUrl: 'https://web.example/x',
    androidUrl: 'app://android/x',
    iosUrl: 'app://ios/x',
    fallbackUrl: 'https://store.example',
  };

  it('prefers the platform-specific deep link', () => {
    expect(resolveTarget(link, 'android')).toBe('app://android/x');
    expect(resolveTarget(link, 'ios')).toBe('app://ios/x');
    expect(resolveTarget(link, 'web')).toBe('https://web.example/x');
  });

  it('falls back to web target when platform link is absent', () => {
    expect(resolveTarget({ targetUrl: 'https://web.example/y' }, 'android')).toBe('https://web.example/y');
  });
});
