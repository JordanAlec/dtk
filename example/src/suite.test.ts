import { suite } from './suite.js';

// suppress the [OK] / [FAIL] console output during tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('suite runner', () => {
  it('executes steps in the order they were defined', async () => {
    const order: number[] = [];
    await suite()
      .step('first',  async () => { order.push(1); })
      .step('second', async () => { order.push(2); })
      .step('third',  async () => { order.push(3); })
      .run("continueOnError");
    expect(order).toEqual([1, 2, 3]);
  });

  it('stores each step return value in ctx.outputs under the step name', async () => {
    let captured: unknown;
    await suite()
      .step('produce', async () => ({ value: 42 }))
      .step('consume', async (ctx) => { captured = ctx.outputs['produce']; })
      .run("throwOnError");
    expect(captured).toEqual({ value: 42 });
  });

  it('makes all prior outputs available to each step', async () => {
    const seen: unknown[] = [];
    await suite()
      .step('a', async () => 'alpha')
      .step('b', async () => 'beta')
      .step('c', async (ctx) => { seen.push(ctx.outputs['a'], ctx.outputs['b']); })
      .run("throwOnError");
    expect(seen).toEqual(['alpha', 'beta']);
  });

  describe('ThrowOnError', () => {
    it('throws when a step fails', async () => {
      await expect(
        suite()
          .step('fail', async () => { throw new Error('boom'); })
          .run("throwOnError")
      ).rejects.toThrow('boom');
    });

    it('does not execute steps after the failure', async () => {
      const ran: string[] = [];
      await suite()
        .step('ok',      async () => { ran.push('ok'); })
        .step('fail',    async () => { throw new Error('boom'); })
        .step('skipped', async () => { ran.push('skipped'); })
        .run("throwOnError")
        .catch(() => {});
      expect(ran).toEqual(['ok']);
    });
  });

  describe('ContinueOnError', () => {
    it('does not throw when a step fails', async () => {
      await expect(
        suite()
          .step('fail', async () => { throw new Error('non-fatal'); })
          .run("continueOnError")
      ).resolves.toBeUndefined();
    });

    it('stops executing after the failure (does not skip to next step)', async () => {
      const ran: string[] = [];
      await suite()
        .step('ok',      async () => { ran.push('ok'); })
        .step('fail',    async () => { throw new Error('stop'); })
        .step('skipped', async () => { ran.push('skipped'); })
        .run("continueOnError");
      expect(ran).toEqual(['ok']);
      expect(ran).not.toContain('skipped');
    });

    it('logs the failure to console.error', async () => {
      await suite()
        .step('fail', async () => { throw new Error('something broke'); })
        .run("continueOnError");
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('something broke')
      );
    });
  });

});
