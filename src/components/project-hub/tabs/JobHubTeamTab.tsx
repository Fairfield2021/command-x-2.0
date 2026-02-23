import { ProjectRateBracketsSection } from "@/components/project-hub/ProjectRateBracketsSection";
import { ProjectApplicantsSection } from "@/components/project-hub/ProjectApplicantsSection";
import { ProjectPersonnelSection } from "@/components/project-hub/ProjectPersonnelSection";
import { ProjectAssetAssignmentsSection } from "@/components/project-hub/ProjectAssetAssignmentsSection";

interface JobHubTeamTabProps {
  projectId: string;
  projectName: string;
}

export function JobHubTeamTab({ projectId, projectName }: JobHubTeamTabProps) {
  return (
    <div className="space-y-6">
      <ProjectRateBracketsSection projectId={projectId} />
      <ProjectApplicantsSection projectId={projectId} />
      <ProjectPersonnelSection projectId={projectId} projectName={projectName} />
      <ProjectAssetAssignmentsSection projectId={projectId} projectName={projectName} />
    </div>
  );
}
