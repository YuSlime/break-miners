import type { ReactElement } from "react";
import type { SettingsData } from "../save/saveTypes";

export interface SettingsScreenProps {
  settings: Readonly<SettingsData>;
  onChange(settings: SettingsData): void;
  onBack(): void;
}

export function settingsWithSystemMotionPreference(
  settings: Readonly<SettingsData>,
  hasSavedOverride: boolean,
  prefersReducedMotion: boolean,
): SettingsData {
  return {
    ...settings,
    reducedMotion: hasSavedOverride ? settings.reducedMotion : prefersReducedMotion,
  };
}

export function SettingsScreen({ settings, onChange, onBack }: SettingsScreenProps): ReactElement {
  const update = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    onChange({ ...settings, [key]: value });
  };
  return (
    <main className="settings-screen">
      <header className="settings-header"><p className="eyebrow">SYSTEM</p><h1>SETTINGS</h1></header>
      <section className="settings-grid" aria-label="Game settings">
        <label>Master Volume<input aria-label="Master Volume" className="touch-control" max="1" min="0" onChange={(event) => update("masterVolume", event.currentTarget.valueAsNumber)} step="0.05" type="range" value={settings.masterVolume} /></label>
        <label>Music<input aria-label="Music" className="touch-control" max="1" min="0" onChange={(event) => update("musicVolume", event.currentTarget.valueAsNumber)} step="0.05" type="range" value={settings.musicVolume} /></label>
        <label>SFX<input aria-label="SFX" className="touch-control" max="1" min="0" onChange={(event) => update("sfxVolume", event.currentTarget.valueAsNumber)} step="0.05" type="range" value={settings.sfxVolume} /></label>
        <label>Particles<select aria-label="Particles" className="touch-control" onChange={(event) => update("quality", event.currentTarget.value as SettingsData["quality"])} value={settings.quality}><option>AUTO</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></label>
        <label>Camera Shake<input aria-label="Camera Shake" className="touch-control" max="100" min="0" onChange={(event) => update("cameraShakePercent", event.currentTarget.valueAsNumber)} type="range" value={settings.cameraShakePercent} /></label>
        <label className="toggle-label">Damage Numbers<input aria-label="Damage Numbers" checked={settings.damageNumbers} className="touch-control" onChange={(event) => update("damageNumbers", event.currentTarget.checked)} type="checkbox" /></label>
        <label className="toggle-label">Screen Flash<input aria-label="Screen Flash" checked={settings.screenFlash} className="touch-control" onChange={(event) => update("screenFlash", event.currentTarget.checked)} type="checkbox" /></label>
        <label className="toggle-label">Vibration<input aria-label="Vibration" checked={settings.vibration} className="touch-control" onChange={(event) => update("vibration", event.currentTarget.checked)} type="checkbox" /></label>
        <label>FPS Limit<select aria-label="FPS Limit" className="touch-control" onChange={(event) => update("fpsLimit", Number(event.currentTarget.value) as SettingsData["fpsLimit"])} value={settings.fpsLimit}><option value="30">30</option><option value="60">60</option><option value="120">120</option></select></label>
        <label className="toggle-label">Reduced Motion<input aria-label="Reduced Motion" checked={settings.reducedMotion} className="touch-control" onChange={(event) => update("reducedMotion", event.currentTarget.checked)} type="checkbox" /></label>
      </section>
      <button className="secondary-button settings-back" onClick={onBack} type="button">BACK</button>
    </main>
  );
}
