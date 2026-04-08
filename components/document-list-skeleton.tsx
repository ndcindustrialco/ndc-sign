export default function DocumentListSkeleton() {
 return (
 <div className="overflow-hidden rounded-xl border border-zinc-200">
 <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
 <div className="flex gap-8">
 {["w-24", "w-12", "w-14", "w-20", "w-8"].map((w, i) => (
 <div key={i} className={`${w} h-3 animate-pulse rounded bg-zinc-200`} />
 ))}
 </div>
 </div>
 {Array.from({ length: 5 }).map((_, i) => (
 <div
 key={i}
 className="flex items-center gap-8 border-b border-zinc-100 px-4 py-3 last:border-0"
 >
 <div className="h-3.5 w-48 animate-pulse rounded bg-zinc-100" />
 <div className="h-3 w-12 animate-pulse rounded bg-zinc-100" />
 <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-100" />
 <div className="h-3 w-28 animate-pulse rounded bg-zinc-100" />
 <div className="h-3 w-8 animate-pulse rounded bg-zinc-100" />
 </div>
 ))}
 </div>
 )
}
