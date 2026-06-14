/**
 * Runtime autonomous-engine settings.
 *
 * Seeded from env at boot, but mutable at runtime so the dashboard can toggle
 * autonomy on/off (and the real-spend AUTO_GO_LIVE switch) WITHOUT a redeploy.
 * Both the engine and the API read from here, so it's the single source of truth.
 */

export interface AutonomousSettings {
  autonomous: boolean;   // master switch — engine acts only when true
  autoSource: boolean;   // scan retailers each cycle
  autoCreate: boolean;   // create PAUSED campaigns for new products
  autoGoLive: boolean;   // enable campaigns (REAL SPEND)
  optimize: boolean;     // run the optimization pass
}

const envFlag = (k: string, dflt = false) => {
  const v = (process.env[k] || '').toLowerCase();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return dflt;
};

let settings: AutonomousSettings = {
  autonomous: envFlag('ENABLE_AUTONOMOUS'),
  autoSource: envFlag('AUTO_SOURCE'),
  autoCreate: envFlag('AUTO_CREATE'),
  autoGoLive: envFlag('AUTO_GO_LIVE'),
  optimize: envFlag('AUTO_OPTIMIZE', true),
};

export function getAutonomousSettings(): AutonomousSettings {
  return { ...settings };
}

/** Apply a partial update (only boolean fields are accepted). */
export function setAutonomousSettings(patch: Partial<AutonomousSettings>): AutonomousSettings {
  const keys: (keyof AutonomousSettings)[] = ['autonomous', 'autoSource', 'autoCreate', 'autoGoLive', 'optimize'];
  for (const k of keys) {
    if (typeof patch[k] === 'boolean') settings[k] = patch[k] as boolean;
  }
  return getAutonomousSettings();
}
