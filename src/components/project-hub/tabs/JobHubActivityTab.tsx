import { ProjectActivityTimeline } from "@/components/project-hub/ProjectActivityTimeline";

interface JobHubActivityTabProps {
  projectId: string;
}

export function JobHubActivityTab({ projectId }: JobHubActivityTabProps) {
  return <ProjectActivityTimeline projectId={projectId} />;
}
