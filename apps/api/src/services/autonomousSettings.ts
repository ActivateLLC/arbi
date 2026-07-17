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
  autoVideo: boolean;    // auto-generate UGC video ads for top products (Higgsfield credits)
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
  autoVideo: envFlag('AUTO_VIDEO'),
};

export function getAutonomousSettings(): AutonomousSettings {
  return { ...settings };
}

/** Apply a partial update (only boolean fields are accepted). */
export function setAutonomousSettings(patch: Partial<AutonomousSettings>): AutonomousSettings {
  const keys: (keyof AutonomousSettings)[] = ['autonomous', 'autoSource', 'autoCreate', 'autoGoLive', 'optimize', 'autoVideo'];
  for (const k of keys) {
    if (typeof patch[k] === 'boolean') settings[k] = patch[k] as boolean;
  }
  // Master switch cascades the no-spend build pipeline: turning Autonomous ON
  // means "run the whole thing" — source products, create campaigns, generate
  // UGC videos, and optimize — automatically, so the operator never has to also
  // hunt for sub-toggles or tap YouTube/TikTok. Only autoGoLive (REAL SPEND) is
  // left out: that stays an explicit, separately-confirmed decision. A caller can
  // still opt a build step OUT in the same patch (e.g. {autonomous:true, autoVideo:false}).
  if (patch.autonomous === true) {
    if (patch.autoSource === undefined) settings.autoSource = true;
    if (patch.autoCreate === undefined) settings.autoCreate = true;
    if (patch.autoVideo === undefined) settings.autoVideo = true;
    if (patch.optimize === undefined) settings.optimize = true;
  }
  return getAutonomousSettings();
}
