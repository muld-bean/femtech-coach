'use client';

const ORANGE = '#FF4A1C';

type Point = {
  date: string;
  value: number;
};

export default function WeightChart({ data }: { data: Point[] }) {
  if (data.length < 2) {
    return (
      <div className="text-sm text-white/40 text-center py-6">
        Нужно минимум 2 замера для графика
      </div>
    );
  }

  // Сортируем по дате (старые сначала)
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  const W = 320;
  const H = 140;
  const PAD_X = 24;
  const PAD_Y = 24;

  const values = sorted.map(p => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const stepX = (W - PAD_X * 2) / (sorted.length - 1);

  const points = sorted.map((p, i) => {
    const x = PAD_X + i * stepX;
    const y = H - PAD_Y - ((p.value - minV) / range) * (H - PAD_Y * 2);
    return { x, y, value: p.value, date: p.date };
  });

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const diff = Math.round((last.value - first.value) * 10) / 10;
  const diffColor = diff < 0 ? '#4ade80' : diff > 0 ? '#fbbf24' : '#737373';

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-xs text-white/50">Сейчас</div>
          <div className="text-2xl font-black" style={{ color: ORANGE }}>{last.value} кг</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/50">Изменение</div>
          <div className="text-lg font-bold" style={{ color: diffColor }}>
            {diff > 0 ? '+' : ''}{diff} кг
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
        {/* Горизонтальные линии сетки */}
        {[0, 0.5, 1].map((ratio, i) => {
          const y = PAD_Y + ratio * (H - PAD_Y * 2);
          return (
            <line key={i} x1={PAD_X} y1={y} x2={W - PAD_X} y2={y} stroke="#262626" strokeWidth={1} />
          );
        })}

        {/* Линия */}
        <path d={pathD} fill="none" stroke={ORANGE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Точки */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#0a0a0a" stroke={ORANGE} strokeWidth={2} />
        ))}

        {/* Значения сверху */}
        <text x={points[0].x} y={points[0].y - 8} fill="#737373" fontSize="10" textAnchor="middle">{first.value}</text>
        <text x={points[points.length - 1].x} y={points[points.length - 1].y - 8} fill={ORANGE} fontSize="11" fontWeight="bold" textAnchor="middle">{last.value}</text>
      </svg>

      <div className="flex justify-between text-[10px] text-white/40 mt-1">
        <span>{first.date}</span>
        <span>{last.date}</span>
      </div>
    </div>
  );
}