import { ClassicContractorTemplate } from "./ClassicContractorTemplate";
import type { ContractorProfile } from "@/pro/[slug]/types";

export function ModernProTemplate({ profile }: { profile: ContractorProfile }) {
  return <ClassicContractorTemplate profile={profile} />;
}
