export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
};

export type Level = {
  name: string;
  min: number;
  max: number;
  color: string;
};

const LEVELS: Level[] = [
  { name: 'Новичок', min: 0, max: 9, color: '#737373' },
  { name: 'Любитель', min: 10, max: 29, color: '#60a5fa' },
  { name: 'Атлет', min: 30, max: 59, color: '#4ade80' },
  { name: 'Спортсмен', min: 60, max: 99, color: '#fbbf24' },
  { name: 'Легенда', min: 100, max: 999999, color: '#FF4A1C' },
];

export function getLevel(trainingCount: number): Level {
  for (const lvl of LEVELS) {
    if (trainingCount >= lvl.min && trainingCount <= lvl.max) return lvl;
  }
  return LEVELS[0];
}

export function getNextLevel(trainingCount: number): Level | null {
  const idx = LEVELS.findIndex(l => trainingCount >= l.min && trainingCount <= l.max);
  if (idx < 0 || idx === LEVELS.length - 1) return null;
  return LEVELS[idx + 1];
}

export function getProgressPercent(trainingCount: number): number {
  const current = getLevel(trainingCount);
  const next = getNextLevel(trainingCount);
  if (!next) return 100;
  const range = next.min - current.min;
  const progress = trainingCount - current.min;
  return Math.round(progress / range * 100);
}

export function getAchievements(params: {
  trainings: number;
  hasMeasurements: boolean;
  hasGoal: boolean;
  hasCycle: boolean;
  hasStreakMonth: boolean;
}): Achievement[] {
  return [
    {
      id: 'first_training',
      title: 'Первый шаг',
      description: '1-я тренировка',
      icon: '🎯',
      unlocked: params.trainings >= 1,
    },
    {
      id: 'ten_trainings',
      title: 'Разогрев',
      description: '10 тренировок',
      icon: '🔥',
      unlocked: params.trainings >= 10,
    },
    {
      id: 'thirty_trainings',
      title: 'В ритме',
      description: '30 тренировок',
      icon: '⚡',
      unlocked: params.trainings >= 30,
    },
    {
      id: 'hundred_trainings',
      title: 'Железная воля',
      description: '100 тренировок',
      icon: '🏆',
      unlocked: params.trainings >= 100,
    },
    {
      id: 'first_measurement',
      title: 'Под контролем',
      description: 'Первый замер',
      icon: '📏',
      unlocked: params.hasMeasurements,
    },
    {
      id: 'first_goal',
      title: 'Целеустремлённая',
      description: 'Поставлена цель',
      icon: '🎪',
      unlocked: params.hasGoal,
    },
    {
      id: 'cycle_tracker',
      title: 'В гармонии',
      description: 'Отслеживаешь цикл',
      icon: '🌸',
      unlocked: params.hasCycle,
    },
    {
      id: 'streak_month',
      title: 'Месяц без пропусков',
      description: 'Стабильность',
      icon: '💎',
      unlocked: params.hasStreakMonth,
    },
  ];
}
export function calculateStreak(schedule: { date: string; status: string }[]): number {
  // Идём от текущей недели назад, считаем сколько недель подряд ≥ 2 тренировок
  const done = schedule.filter(s => s.status === 'проведено');
  if (done.length === 0) return 0;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  function mondayOf(d: Date) {
    const x = new Date(d);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  // Группируем по неделям
  const weekCounts: Record<string, number> = {};
  done.forEach(s => {
    const d = new Date(s.date);
    if (isNaN(d.getTime())) return;
    const mon = mondayOf(d);
    const key = mon.toISOString().split('T')[0];
    weekCounts[key] = (weekCounts[key] || 0) + 1;
  });

  // Идём от текущей недели назад
  let streak = 0;
  const cur = mondayOf(now);
  for (let i = 0; i < 52; i++) {
    const key = cur.toISOString().split('T')[0];
    const count = weekCounts[key] || 0;
    if (count >= 2) {
      streak++;
    } else if (i === 0) {
      // текущая неделя ещё не закончилась — не считаем пропуском
    } else {
      break;
    }
    cur.setDate(cur.getDate() - 7);
  }
  return streak;
}