export type RankingEntry = {
  playerName: string;
  points: number;
  games: number;
};

type ScoreRow = {
  player_name: string | null;
  correct_answers: number | null;
};

export const buildRanking = (rows: ScoreRow[], basePlayers: string[] = []) => {
  const scoreMap = new Map<string, RankingEntry>();

  basePlayers.forEach((name) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    scoreMap.set(cleanName, { playerName: cleanName, points: 0, games: 0 });
  });

  rows.forEach((row) => {
    const name = (row.player_name ?? '').trim().toUpperCase();
    if (!name) return;

    const current = scoreMap.get(name) ?? { playerName: name, points: 0, games: 0 };
    current.points += row.correct_answers ?? 0;
    current.games += 1;
    scoreMap.set(name, current);
  });

  return [...scoreMap.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (a.games !== b.games) return a.games - b.games;
    return a.playerName.localeCompare(b.playerName);
  });
};
