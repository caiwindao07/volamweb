"use strict";

/* “Luyện công tại ải hiện tại” is a user choice. Legacy combat code used to
 * re-enable push after three cleared waves, which silently changed maps. Keep
 * the legacy wave/reward flow but restore the selected stage and preference at
 * the shared transition boundary. */
if (typeof waveCleared === "function") {
  const legacyWaveClearedForStagePolicy = waveCleared;
  waveCleared = function (...args) {
    const holdStage = typeof S !== "undefined" && S && S.push === false &&
      !(R && R.tk) && !(S && S.siege) && !(R && R.tower);
    const stage = holdStage ? S.stage : null;
    const maxStage = holdStage ? S.maxStage : null;
    const out = legacyWaveClearedForStagePolicy.apply(this, args);
    if (holdStage) {
      const changed = S.stage !== stage || S.maxStage !== maxStage;
      S.stage = stage;
      S.maxStage = maxStage;
      S.push = false;
      R.farm = 0;
      if (changed && typeof onStageChange === "function") onStageChange();
    }
    return out;
  };
}
