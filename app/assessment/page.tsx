import { Suspense } from "react";
import { AssessmentFlow } from "@/components/assessment/assessment-flow";
import { ResearchLoading } from "@/components/assessment/research-loading";

export default function AssessmentPage() {
  return (
    <Suspense fallback={<ResearchLoading topic="" />}>
      <AssessmentFlow />
    </Suspense>
  );
}
