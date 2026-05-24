import { PROJECT_DETAILS } from "@/app/find-contractors/mockData";
import ProjectPageClient from "./ProjectPageClient";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = PROJECT_DETAILS.find((p) => p.slug === slug);
  if (!project) return { title: "Project Not Found | TradeBase" };
  return {
    title: `${project.title} — ${project.contractor_name} | TradeBase`,
    description: project.description.slice(0, 155),
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = PROJECT_DETAILS.find((p) => p.slug === slug);
  if (!project) notFound();
  return <ProjectPageClient project={project} />;
}
