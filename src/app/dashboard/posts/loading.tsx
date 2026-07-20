// Instant skeleton shown while the posts server component fetches its
// initial window. Mirrors the filter bar + reel card grid.
export default function PostsLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="h-9 w-32 bg-gray-100 rounded-lg" />
        <div className="h-9 w-28 bg-gray-100 rounded-lg" />
        <div className="h-9 w-32 bg-gray-100 rounded-lg" />
        <div className="h-9 w-24 bg-gray-100 rounded-lg" />
        <div className="h-9 w-24 bg-gray-200 rounded-lg ml-auto" />
      </div>

      {/* Reel card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="aspect-[9/16] bg-gray-100" />
            <div className="p-3 space-y-2">
              <div className="h-3 w-3/4 bg-gray-100 rounded" />
              <div className="h-3 w-1/2 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
