import Icon from "../ui/Icon";
import type { ReportStep } from "../../types/report";

type ReportStepTrackerProps = {
  activeStep: ReportStep;
};

const steps = [
  { number: 1, label: "Follow-Up" },
  { number: 2, label: "Review" },
  { number: 3, label: "Generate" },
  { number: 4, label: "Preview" },
  { number: 5, label: "Edit" },
  { number: 6, label: "Salin" },
] as const;

export default function ReportStepTracker({
  activeStep,
}: ReportStepTrackerProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
      <div className="flex gap-4 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const done = step.number < activeStep;
          const active = step.number === activeStep;

          return (
            <div key={step.number} className="flex shrink-0 items-center gap-4">
              <div
                className={
                  "flex items-center gap-2 text-xs " +
                  (active
                    ? "font-bold text-[#1677FF]"
                    : done
                      ? "font-semibold text-slate-800"
                      : "font-medium text-slate-400")
                }
              >
                <span
                  className={
                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px] " +
                    (done || active
                      ? "bg-[#1677FF] text-white"
                      : "border border-slate-300 bg-white text-slate-400")
                  }
                >
                  {done ? (
                    <Icon name="check" className="h-3 w-3" strokeWidth={2.6} />
                  ) : (
                    step.number
                  )}
                </span>
                {step.label}
              </div>

              {index < steps.length - 1 ? (
                <span className="h-px w-6 shrink-0 bg-slate-200" />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
