export interface CustomType {
  _type: 'test';
}

export function toUppercase(text = ''): string {
  return text.toUpperCase();
}
