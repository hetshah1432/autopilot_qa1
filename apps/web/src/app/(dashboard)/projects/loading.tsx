export default function ProjectsLoading() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="h-10 w-48 bg-white/5 rounded-2xl animate-pulse" />
          <div className="h-5 w-80 bg-white/5 rounded-xl animate-pulse" />
        </div>
        <div className="h-12 w-48 bg-white/5 rounded-2xl animate-pulse" />
      </div>

      {/* Projects Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-[420px] bg-surface-lighter border border-white/5 rounded-[40px] p-10 space-y-8 animate-pulse shadow-2xl">
            <div className="flex justify-between items-start">
               <div className="w-20 h-20 bg-white/5 rounded-full" />
               <div className="flex gap-2">
                  <div className="w-10 h-10 bg-white/5 rounded-2xl" />
                  <div className="w-10 h-10 bg-white/5 rounded-2xl" />
               </div>
            </div>
            <div className="space-y-3 pt-4">
               <div className="h-8 w-48 bg-white/5 rounded-lg" />
               <div className="h-4 w-32 bg-white/5 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-4 pb-8 border-b border-white/5">
                <div className="h-20 bg-white/5 rounded-3xl" />
                <div className="h-20 bg-white/5 rounded-3xl" />
            </div>
            <div className="flex justify-between items-center pt-4">
               <div className="h-4 w-24 bg-white/5 rounded-md" />
               <div className="h-12 w-28 bg-white/5 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
