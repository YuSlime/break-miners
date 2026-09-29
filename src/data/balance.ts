export const BALANCE = {
  simulationHz: 60,
  uiPublishHz: 10,
  runDurationSeconds: 480,
  miningPulseSeconds: 0.1,
  breakTimeDurationSeconds: 8,
  maxBreaksPerTick: 150,
  maxChainDepth: 8,
  maxPendingGameplayEvents: 10_000,
  comboDecayDelaySeconds: 1.2,
  tileSize: 32,
  chunkWidthTiles: 20,
  chunkHeightTiles: 12,
} as const;
