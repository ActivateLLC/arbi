import { createLogger } from './logger';

describe('Logger', () => {
  it('should create a logger instance', () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(logger.level).toBeDefined();
  });
});
