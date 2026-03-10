const ENTITY_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
const ATTRIBUTE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateEntityLogicalName(name: string): void {
  if (!name || !ENTITY_NAME_PATTERN.test(name)) {
    throw new ValidationError(`Invalid entity name: "${name}". Must match pattern: ${ENTITY_NAME_PATTERN}`);
  }
}

export function validateAttributeName(name: string): void {
  if (!name || !ATTRIBUTE_NAME_PATTERN.test(name)) {
    throw new ValidationError(`Invalid attribute name: "${name}". Must match pattern: ${ATTRIBUTE_NAME_PATTERN}`);
  }
}

export function sanitizeForOData(text: string): string {
  return text.replace(/[^a-z0-9_]/gi, '');
}
