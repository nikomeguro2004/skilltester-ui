import { AssessmentSetupForm } from "@/components/home/assessment-setup-form";
import { ResumeBanner } from "@/components/home/resume-banner";
import { ScrambleHeading } from "@/components/home/scramble-heading";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-20">
      {/* aurora glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 [background:radial-gradient(ellipse_60%_45%_at_50%_-5%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_65%)]"
      />
      {/* dot grid texture */}
      <div
        aria-hidden
        className="bg-dot-grid pointer-events-none absolute inset-0 -z-20 opacity-[0.35] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_20%,black,transparent)]"
      />
      {/* film grain */}
      <div aria-hidden className="bg-noise pointer-events-none absolute inset-0 -z-20 opacity-[0.03] mix-blend-overlay" />

      {/* oversized ghost type */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-[6%] left-1/2 -z-10 -translate-x-1/2 select-none whitespace-nowrap font-sans text-[26vw] font-bold leading-none tracking-tighter text-foreground/[0.035] sm:text-[20vw]"
      >
        QUIZ
      </span>

      <div className="mb-9 inline-flex items-center gap-2.5 rounded-full border border-border/70 bg-card/50 px-3.5 py-1.5 font-sans text-[13px] tracking-wide text-muted-foreground backdrop-blur">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
        friendly_quiz
      </div>

      <ScrambleHeading lines={["What would you like", "to explore today?"]} />

      <p className="mt-6 max-w-lg text-center font-sans text-[15px] leading-relaxed text-muted-foreground sm:text-base">
        Pick any topic and get a friendly quiz that adapts to how you answer.{" "}
        <br className="hidden sm:block" />
        Relax, learn, and enjoy!
      </p>

      <div className="mt-12 flex w-full flex-col items-center">
        <ResumeBanner />
        <AssessmentSetupForm />
      </div>
    </div>
  );
}
