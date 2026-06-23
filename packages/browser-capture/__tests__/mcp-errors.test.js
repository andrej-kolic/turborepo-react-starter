import { describe, expect, it } from 'vitest';
import { errorMessage, mcpToolError } from '../src/mcp/errors.js';

describe('mcpToolError', () => {
  it('formats Error instances', () => {
    expect(mcpToolError(new Error('boom'))).toEqual({
      content: [{ type: 'text', text: 'Error: boom' }],
      isError: true,
    });
  });

  it('formats non-Error throws', () => {
    expect(mcpToolError('plain failure')).toEqual({
      content: [{ type: 'text', text: 'Error: plain failure' }],
      isError: true,
    });
  });

  it('applies an optional message transform', () => {
    expect(
      mcpToolError(new Error('No existing Chrome page target found.'), (msg) =>
        msg.includes('No existing Chrome page') ? 'friendly' : msg,
      ),
    ).toEqual({
      content: [{ type: 'text', text: 'Error: friendly' }],
      isError: true,
    });
  });
});

describe('errorMessage', () => {
  it('stringifies unknown values', () => {
    expect(errorMessage(404)).toBe('404');
  });
});
