import { redirect } from "next/navigation";

export default function ProfileWizardPage() {
  redirect("/app/onboarding?redo=1");
}
