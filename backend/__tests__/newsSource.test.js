const mongoose = require('mongoose');

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');

  const schemaMock = jest.fn(function (definition, options) {
    this.definition = definition;
    this.options = options;
    this.index = jest.fn().mockReturnThis();
    this.pre = jest.fn().mockReturnThis();
    this.post = jest.fn().mockReturnThis();
  });

  return {
    ...actualMongoose,
    Schema: Object.assign(schemaMock, {
      Types: actualMongoose.Schema.Types
    }),
    model: jest.fn()
  };
});

describe('NewsSource model schema', () => {
  let capturedSchema;

  beforeAll(() => {
    mongoose.model.mockImplementation((_name, schema) => {
      capturedSchema = schema;
      return {};
    });
    require('../src/models/NewsSource');
  });

  it('defines required url field', () => {
    expect(capturedSchema.definition.url).toBeDefined();
    expect(capturedSchema.definition.url.required).toBe(true);
    expect(capturedSchema.definition.url.unique).toBe(true);
  });

  it('defines required language field', () => {
    expect(capturedSchema.definition.language).toBeDefined();
    expect(capturedSchema.definition.language.required).toBe(true);
    expect(capturedSchema.definition.language.index).toBe(true);
  });

  it('defaults enabled to true', () => {
    expect(capturedSchema.definition.enabled.default).toBe(true);
  });

  it('defaults maxItems to 20', () => {
    expect(capturedSchema.definition.maxItems.default).toBe(20);
  });

  it('defaults failCount to 0', () => {
    expect(capturedSchema.definition.failCount.default).toBe(0);
  });

  it('has compound language+enabled index', () => {
    expect(capturedSchema.index).toHaveBeenCalledWith({ language: 1, enabled: 1 });
  });
});
