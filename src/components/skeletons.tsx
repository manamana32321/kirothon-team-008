import { Skeleton } from "@/components/ui/skeleton";

export function GroupSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <Skeleton className="mt-4 h-10 w-2/3" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </main>
  );
}

export function SettingsSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <Skeleton className="mt-4 h-10 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-24 w-full" />
    </main>
  );
}
