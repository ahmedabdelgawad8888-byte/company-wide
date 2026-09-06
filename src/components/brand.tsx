import { cn } from "@/lib/utils";

export function TrygcMark({ className }: { className?: string }) {
  return <img src="/favicon.png" alt="Trygc" className={cn("size-8 object-contain", className)} />;
}

export function TrygcLogo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <TrygcMark className="size-8 shrink-0" />
      {collapsed ? null : (
        <div className="leading-tight">
          <div className="font-display text-base font-semibold tracking-tight">TryGC</div>
          <div className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
            WORKSPACE HUB
          </div>
        </div>
      )}
    </div>
  );
}
