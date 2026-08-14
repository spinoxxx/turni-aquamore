(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.TurniWeekState = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  function resolveVisibleWeekOffset({ backendEnabled, authenticated, currentWeekOffset, stateWeekOffset }) {
    if (backendEnabled && authenticated && Number.isFinite(Number(currentWeekOffset))) {
      return Number(currentWeekOffset);
    }
    return Number(stateWeekOffset) || 0;
  }

  return { resolveVisibleWeekOffset };
});
