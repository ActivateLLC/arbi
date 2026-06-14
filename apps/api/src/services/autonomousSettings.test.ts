import { getAutonomousSettings, setAutonomousSettings } from './autonomousSettings';

describe('autonomous settings (runtime toggle)', () => {
  it('exposes the five boolean switches', () => {
    const s = getAutonomousSettings();
    for (const k of ['autonomous', 'autoSource', 'autoCreate', 'autoGoLive', 'optimize']) {
      expect(typeof (s as any)[k]).toBe('boolean');
    }
  });

  it('updates only boolean fields and ignores junk', () => {
    const updated = setAutonomousSettings({ autonomous: true, autoGoLive: true, bogus: 'x' } as any);
    expect(updated.autonomous).toBe(true);
    expect(updated.autoGoLive).toBe(true);
    expect((updated as any).bogus).toBeUndefined();
  });

  it('returns a copy (callers cannot mutate internal state)', () => {
    const a = getAutonomousSettings();
    a.autonomous = !a.autonomous;
    expect(getAutonomousSettings().autonomous).not.toBe(a.autonomous);
  });

  it('can toggle autonomy off at runtime', () => {
    setAutonomousSettings({ autonomous: true });
    expect(getAutonomousSettings().autonomous).toBe(true);
    setAutonomousSettings({ autonomous: false });
    expect(getAutonomousSettings().autonomous).toBe(false);
  });
});
