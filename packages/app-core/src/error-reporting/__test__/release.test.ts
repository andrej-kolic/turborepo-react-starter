import { describe, expect, it } from 'vitest';
import { sentryRelease } from '../release';

const COMMIT = 'abc1234def5678abc1234def5678abc1234def56';

describe('sentryRelease', () => {
  it('returns package@version when there is no commit', () => {
    expect(sentryRelease('0.1.6')).toBe('turborepo-react-starter@0.1.6');
  });

  it('appends +<short commit> to a version without build metadata', () => {
    expect(sentryRelease('0.1.6', COMMIT)).toBe(
      'turborepo-react-starter@0.1.6+abc1234',
    );
  });

  it('appends .<short commit> to a version that already has a + part', () => {
    expect(sentryRelease('0.2.0+build5', COMMIT)).toBe(
      'turborepo-react-starter@0.2.0+build5.abc1234',
    );
  });
});
