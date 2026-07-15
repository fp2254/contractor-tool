import { ClassicContractorTemplate } from "./ClassicContractorTemplate";
import type { ContractorProfile } from "@/pro/[slug]/types";

export function TrustContractorTemplate({ profile }: { profile: ContractorProfile }) {
  return <ClassicContractorTemplate profile={profile} />;
}
