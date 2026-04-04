import { cn } from "utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shimmer-bg min-h-[0.75rem] rounded-xl opacity-90", className)}
      {...props}
    />
  )
}

export { Skeleton }
