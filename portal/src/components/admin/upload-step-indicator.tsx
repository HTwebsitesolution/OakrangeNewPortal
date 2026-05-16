import { cn } from "@/lib/ui/cn";

const STEPS = ["Customer & site", "Certificate details", "Review & publish"] as const;

export function UploadStepIndicator({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  return (
    <ol className="flex flex-wrap gap-2 sm:gap-4" aria-label="Upload progress">
      {STEPS.map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3;
        const isActive = step === activeStep;
        const isComplete = step < activeStep;
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
              isActive && "bg-oak-orange text-white",
              isComplete && "bg-oak-navy/10 text-oak-navy",
              !isActive && !isComplete && "bg-slate-100 text-oak-muted"
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                isActive && "bg-white/20",
                isComplete && "bg-oak-navy text-white",
                !isActive && !isComplete && "bg-white text-oak-muted"
              )}
              aria-hidden
            >
              {isComplete ? "✓" : step}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
