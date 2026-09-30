import { z } from '..';

test('contracts package resolves and re-exports zod', () => {
  expect(z.string().parse('hello')).toBe('hello');
});
