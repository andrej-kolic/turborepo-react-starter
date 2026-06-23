export function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function mcpToolError(error, transform) {
  const message = transform
    ? transform(errorMessage(error))
    : errorMessage(error);
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  };
}
