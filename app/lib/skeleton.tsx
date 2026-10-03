'use client';

export function Pulse({ style = {} }: { style?: any }) {
  return <div className="animate-pulse rounded-2xl" style={{ background: '#141414', ...style }} />;
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="px-6 pt-8 pb-4">
        <Pulse style={{ height: 14, width: 100, borderRadius: 8, marginBottom: 12 }} />
        <Pulse style={{ height: 36, width: 180, borderRadius: 12 }} />
      </div>
      <div className="px-5 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Pulse key={i} style={{ height: 80 }} />
        ))}
      </div>
    </div>
  );
}

export function CardsSkeleton() {
  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="px-6 pt-8 pb-4">
        <Pulse style={{ height: 14, width: 100, borderRadius: 8, marginBottom: 12 }} />
        <Pulse style={{ height: 36, width: 220, borderRadius: 12 }} />
      </div>
      <div className="px-5">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Pulse style={{ height: 110 }} />
          <Pulse style={{ height: 110 }} />
        </div>
        <div className="space-y-3">
          <Pulse style={{ height: 90 }} />
          <Pulse style={{ height: 90 }} />
          <Pulse style={{ height: 90 }} />
        </div>
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="px-6 pt-8 pb-4">
        <Pulse style={{ height: 14, width: 100, borderRadius: 8, marginBottom: 12 }} />
        <Pulse style={{ height: 36, width: 220, borderRadius: 12 }} />
      </div>
      <div className="px-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Pulse style={{ height: 110 }} />
          <Pulse style={{ height: 110 }} />
        </div>
        <Pulse style={{ height: 220 }} />
        <div className="grid grid-cols-2 gap-3">
          <Pulse style={{ height: 110 }} />
          <Pulse style={{ height: 110 }} />
        </div>
        <Pulse style={{ height: 180 }} />
      </div>
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="px-6 pt-8 pb-4">
        <Pulse style={{ height: 14, width: 120, borderRadius: 8, marginBottom: 12 }} />
        <div className="flex justify-between items-center mt-3">
          <Pulse style={{ height: 32, width: 44, borderRadius: 10 }} />
          <Pulse style={{ height: 20, width: 140, borderRadius: 8 }} />
          <Pulse style={{ height: 32, width: 44, borderRadius: 10 }} />
        </div>
      </div>
      <div className="px-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} style={{ height: 100 }} />
        ))}
      </div>
    </div>
  );
}

export function CabinetSkeleton() {
  return (
    <div className="min-h-screen bg-black pb-28">
      <div className="px-6 pt-8 pb-4">
        <Pulse style={{ height: 14, width: 120, borderRadius: 8, marginBottom: 8 }} />
        <Pulse style={{ height: 32, width: 180, borderRadius: 10 }} />
      </div>
      <div className="px-5 space-y-4">
        <Pulse style={{ height: 200 }} />
        <Pulse style={{ height: 120 }} />
        <Pulse style={{ height: 160 }} />
      </div>
    </div>
  );
}