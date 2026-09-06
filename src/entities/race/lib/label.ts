/** パンくず等の 1 行表記。「札幌 1R レース名」の形で、会場略称とレース番号は無ければ省く。 */
export function formatRaceLabel(race: {
  venueShortName?: string | null;
  raceNumber: number | null;
  name: string;
}): string {
  return [race.venueShortName, race.raceNumber ? `${race.raceNumber}R` : null, race.name].filter(Boolean).join(' ');
}
