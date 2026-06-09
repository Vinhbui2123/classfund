export function normalizeVietnamese(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s]/g, '') // Keep alphanumeric and spaces
    .replace(/\s+/g, ' ')           // Strip extra whitespace
    .trim()
    .toLowerCase();
}

export function normalizeReferenceCode(str: string): string {
  // Generate uppercase, alphanumeric-only string for banking references
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '') // Alphanumeric only, no spaces
    .toUpperCase();
}
