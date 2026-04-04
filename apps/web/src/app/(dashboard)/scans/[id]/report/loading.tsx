export default function ReportLoading() {
  return (
    <div className="max-w-[1400px] mx-auto py-12 px-8 space-y-16 pb-48 animate-in fade-in duration-700">
      {/* Hero Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
         <div className="lg:col-span-3 h-[400px] bg-surface-lighter border border-white/5 rounded-[48px] p-12 animate-pulse space-y-8">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 bg-white/5 rounded-3xl" />
               <div className="space-y-2">
                  <div className="h-10 w-64 bg-white/5 rounded-lg" />
                  <div className="h-4 w-32 bg-white/5 rounded-md" />
               </div>
            </div>
            <div className="space-y-4">
               <div className="h-6 w-32 bg-white/5 rounded-md" />
               <div className="h-20 w-full bg-white/5 rounded-xl" />
            </div>
            <div className="h-12 w-48 bg-white/5 rounded-2xl" />
         </div>
         <div className="lg:col-span-2 h-[400px] bg-surface-lighter border border-white/5 rounded-[48px] animate-pulse flex flex-col items-center justify-center space-y-8">
            <div className="w-32 h-32 bg-white/5 rounded-full" />
            <div className="h-4 w-32 bg-white/5 rounded-md" />
         </div>
      </div>

      {/* Metrics Grid Skeleton */}
      <div className="space-y-12">
        <div className="h-10 w-64 bg-white/5 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           <div className="lg:col-span-2 h-48 bg-surface-lighter border border-white/5 rounded-[48px] animate-pulse" />
           <div className="lg:col-span-2 h-48 bg-surface-lighter border border-white/5 rounded-[48px] animate-pulse" />
           {[...Array(4)].map((_, i) => (
             <div key={i} className="h-40 bg-surface-lighter border border-white/5 rounded-[40px] animate-pulse" />
           ))}
        </div>
      </div>

      {/* Findings Skeleton */}
      <div className="space-y-12">
        <div className="flex justify-between items-center">
           <div className="h-10 w-64 bg-white/5 rounded-lg animate-pulse" />
           <div className="h-10 w-32 bg-white/5 rounded-xl animate-pulse" />
        </div>
        <div className="space-y-6">
           {[...Array(4)].map((_, i) => (
             <div key={i} className="h-32 bg-surface-lighter border border-white/5 rounded-[40px] animate-pulse" />
           ))}
        </div>
      </div>
    </div>
  )
}
