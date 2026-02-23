import { ProjectDocuments } from "@/components/projects/ProjectDocuments";

interface JobHubDocumentsTabProps {
  projectId: string;
}

export function JobHubDocumentsTab({ projectId }: JobHubDocumentsTabProps) {
  return <ProjectDocuments projectId={projectId} />;
}
