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

  it('turning autonomous ON cascades the no-spend build steps (incl. video), but NOT real spend', () => {
    setAutonomousSettings({ autoSource: false, autoCreate: false, autoVideo: false, autoGoLive: false });
    const s = setAutonomousSettings({ autonomous: true });
    expect(s.autoSource).toBe(true);
    expect(s.autoCreate).toBe(true);
    expect(s.autoVideo).toBe(true);   // video generation starts automatically
    expect(s.optimize).toBe(true);
    expect(s.autoGoLive).toBe(false); // real spend stays an explicit decision
  });

  it('lets a caller opt a build step OUT while enabling autonomous', () => {
    setAutonomousSettings({ autonomous: false, autoVideo: false });
    const s = setAutonomousSettings({ autonomous: true, autoVideo: false });
    expect(s.autonomous).toBe(true);
    expect(s.autoVideo).toBe(false);
  });
});
