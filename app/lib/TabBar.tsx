'use client';

import { useRouter, usePathname } from 'next/navigation';

const ORANGE = '#FF4A1C';

export default function TabBar() {
  const router = useRouter();
  const path = usePathname();

  const tabs = [
    { key: '/dashboard', label: 'Главная' },
    { key: '/schedule', label: 'Распис' },
    { key: '/clients', label: 'Клиенты' },
    { key: '/requests', label: 'Заявки' },
    { key: '/analytics', label: 'Стата' },
    { key: '/finance', label: 'Финанс' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40" style={{ background: '#0a0a0a', borderTop: '1px solid #1a1a1a' }}>
      <div className="flex justify-around py-3">
        {tabs.map(t => {
          const active = path === t.key || path.startsWith(t.key + '/');
          return (
            <button
              key={t.key}
              onClick={() => router.push(t.key)}
              className="flex-1 text-center py-1 min-w-[50px]"
            >
              <div
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: active ? ORANGE : '#525252' }}
              >
                {t.label}
              </div>
              {active && (
                <div className="w-5 h-0.5 mx-auto mt-1 rounded-full" style={{ background: ORANGE }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}