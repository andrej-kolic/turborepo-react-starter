import { toUppercase } from '..';

describe('Commons', () => {
  it('should return uppercase string', () => {
    expect(toUppercase('Hello wORld')).toBe('HELLO WORLD');
  });
});
