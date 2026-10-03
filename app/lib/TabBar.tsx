'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function TabBar() {
  const router = useRouter();
  const path = usePathname();

  const tabs = [
    { key: '/dashboard', label: 'Главная' },
    { key: '/schedule', label: 'Расписание' },
    { key: '/clients', label: 'Клиенты' },
    { key: '/templates', label: 'Шаблоны' },
    { key: '/requests', label: 'Заявки' },
    { key: '/finance', label: 'Финансы' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-40 overflow-x-auto">
      {tabs.map(t => {
        const active = path === t.key || path.startsWith(t.key + '/');
        return (
          <button
            key={t.key}
            onClick={() => router.push(t.key)}
            className={'flex-1 text-center text-xs font-semibold py-1 min-w-[60px] ' + (active ? 'text-purple-700' : 'text-gray-400')}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}