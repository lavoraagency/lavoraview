// Instant skeleton shown by Next.js while the analytics server component
// fetches its data. Mirrors the real AnalyticsClient layout so the page
// frame appears immediately instead of a 20-30s blank wait.
export default function AnalyticsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-7 w-40 bg-gray-200 rounded" />
        <div className="h-4 w-64 bg-gray-100 rounded mt-2" />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-9 w-48 bg-gray-200 rounded-lg" />
        <div className="h-9 w-32 bg-gray-100 rounded-lg" />
        <div className="h-9 w-32 bg-gray-100 rounded-lg" />
        <div className="h-9 w-32 bg-gray-100 rounded-lg" />
        <div className="h-9 w-28 bg-gray-100 rounded-lg" />
        <div className="h-9 w-40 bg-gray-200 rounded-lg ml-auto" />
      </div>

      {/* Stat card blocks */}
      {[4, 4].map((cols, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-200">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="p-4 md:p-5 space-y-2">
                <div className="h-3 w-24 bg-gray-100 rounded" />
                <div className="h-6 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Donut charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="h-4 w-28 bg-gray-100 rounded" />
            <div className="mx-auto h-32 w-32 rounded-full border-8 border-gray-100" />
          </div>
        ))}
      </div>

      {/* Bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="space-y-2 pt-2">
              {[90, 70, 55, 40, 30].map((w, j) => (
                <div key={j} className="h-4 bg-gray-100 rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
