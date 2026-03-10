import { describe, it, expect } from 'vitest';
import { validateEntityLogicalName, validateAttributeName, ValidationError } from '../../src/odata/query-validator';

describe('Query Validator', () => {
  describe('validateEntityLogicalName', () => {
    it('should accept valid entity names', () => {
      expect(() => validateEntityLogicalName('account')).not.toThrow();
      expect(() => validateEntityLogicalName('contact')).not.toThrow();
      expect(() => validateEntityLogicalName('custom_entity')).not.toThrow();
    });

    it('should reject invalid entity names', () => {
      expect(() => validateEntityLogicalName('')).toThrow(ValidationError);
      expect(() => validateEntityLogicalName('Account')).toThrow(ValidationError);
      expect(() => validateEntityLogicalName('account; DROP TABLE')).toThrow(ValidationError);
      expect(() => validateEntityLogicalName("'); OR 1=1--")).toThrow(ValidationError);
    });
  });

  describe('validateAttributeName', () => {
    it('should accept valid attribute names', () => {
      expect(() => validateAttributeName('firstname')).not.toThrow();
      expect(() => validateAttributeName('emailaddress1')).not.toThrow();
    });

    it('should reject invalid attribute names', () => {
      expect(() => validateAttributeName('')).toThrow(ValidationError);
      expect(() => validateAttributeName('FirstName')).toThrow(ValidationError);
    });
  });
});
