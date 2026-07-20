// Instant skeleton shown while the top-reels server component fetches and
// enriches its reels. Mirrors the filter bar + reel card grid.
export default function TopReelsLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      {/* Filter / date bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="h-9 w-32 bg-gray-100 rounded-lg" />
        <div className="h-9 w-28 bg-gray-100 rounded-lg" />
        <div className="h-9 w-32 bg-gray-100 rounded-lg" />
        <div className="h-9 w-40 bg-gray-200 rounded-lg ml-auto" />
      </div>

      {/* Reel card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-[90%] mx-auto">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden w-full">
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100">
              <div className="h-3 w-12 bg-gray-100 rounded" />
              <div className="h-3 w-8 bg-gray-100 rounded" />
            </div>
            <div className="aspect-[9/16] bg-gray-100" />
            <div className="p-2 space-y-2">
              <div className="h-3 w-2/3 bg-gray-100 rounded" />
              <div className="h-3 w-1/2 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
