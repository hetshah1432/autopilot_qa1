export default function DashboardLoading() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="h-10 w-64 bg-white/5 rounded-2xl animate-pulse" />
          <div className="h-5 w-96 bg-white/5 rounded-xl animate-pulse" />
        </div>
        <div className="h-12 w-48 bg-white/5 rounded-2xl animate-pulse" />
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-40 bg-surface-lighter border border-white/5 rounded-[22px] p-8 space-y-4 animate-pulse">
            <div className="h-4 w-24 bg-white/5 rounded-lg" />
            <div className="h-8 w-16 bg-white/5 rounded-xl" />
            <div className="h-3 w-32 bg-white/5 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 h-[450px] bg-surface-lighter border border-white/5 rounded-[22px] p-8 animate-pulse">
          <div className="h-6 w-48 bg-white/5 rounded-lg mb-8" />
          <div className="h-[300px] w-full bg-white/5 rounded-2xl" />
        </div>
        <div className="h-[450px] bg-surface-lighter border border-white/5 rounded-[22px] p-8 animate-pulse">
          <div className="h-6 w-32 bg-white/5 rounded-lg mb-8" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-white/5 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Recent Scans Table Skeleton */}
      <div className="h-96 bg-surface-lighter border border-white/5 rounded-[22px] p-8 animate-pulse">
        <div className="h-6 w-32 bg-white/5 rounded-lg mb-8" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
