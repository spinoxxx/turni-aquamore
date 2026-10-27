(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TurniStations = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_STATIONS = ["Sala", "Bar", "Ristorante", "Lavaggio", "Cucina"];

  function list(value, fallback = []) {
    const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
    const normalized = values.map((item) => String(item || "").trim()).filter(Boolean);
    return normalized.length ? [...new Set(normalized)] : [...fallback];
  }

  function canonicalStation(value, stations = DEFAULT_STATIONS) {
    const normalized = String(value || "").trim().toLocaleLowerCase("it");
    return stations.find((station) => station.toLocaleLowerCase("it") === normalized) || "";
  }

  function migrateLegacyStationState(companySettings = {}, shiftsByWeek = {}) {
    const companyName = String(companySettings?.companyName || "Ristorante Demo").trim() || "Ristorante Demo";
    const stations = list(companySettings?.stations, DEFAULT_STATIONS);
    const rawWorkplaces = list(companySettings?.workplaces, [companyName]);
    const hasExplicitStations = Object.prototype.hasOwnProperty.call(companySettings || {}, "stations");
    const legacyStationWorkplaces = hasExplicitStations
      ? []
      : rawWorkplaces.filter((workplace) => canonicalStation(workplace, stations));
    let actualWorkplaces = hasExplicitStations
      ? rawWorkplaces
      : rawWorkplaces.filter((workplace) => !canonicalStation(workplace, stations));
    if (!hasExplicitStations && !actualWorkplaces.length && Array.isArray(companySettings?.workplaceGroups)) {
      actualWorkplaces = list(
        companySettings.workplaceGroups
          .map((group) => String(group?.name || "").trim())
          .filter((name) => name && !canonicalStation(name, stations))
      );
    }
    const workplaces = actualWorkplaces.length ? actualWorkplaces : [companyName];
    const isLegacyConfiguration = !hasExplicitStations && legacyStationWorkplaces.length > 0;
    const fallbackWorkplace = workplaces.length === 1 ? workplaces[0] : "";

    const migratedWeeks = Object.fromEntries(
      Object.entries(shiftsByWeek || {}).map(([offset, shifts]) => [
        offset,
        (Array.isArray(shifts) ? shifts : []).map((shift) => {
          const currentStation = canonicalStation(shift.station, stations) || String(shift.station || "").trim();
          const legacyStation = isLegacyConfiguration ? canonicalStation(shift.workplace, stations) : "";
          if (!legacyStation) return { ...shift, station: currentStation };
          return {
            ...shift,
            workplace: fallbackWorkplace,
            station: currentStation || legacyStation
          };
        })
      ])
    );

    return {
      companySettings: {
        ...companySettings,
        companyName,
        workplaces,
        stations
      },
      shiftsByWeek: migratedWeeks,
      migratedLegacyWorkplaces: isLegacyConfiguration ? legacyStationWorkplaces : []
    };
  }

  return {
    DEFAULT_STATIONS,
    canonicalStation,
    migrateLegacyStationState
  };
});
