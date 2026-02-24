import { ProjectRateBracketsSection } from "@/components/project-hub/ProjectRateBracketsSection";
import { ProjectApplicantsSection } from "@/components/project-hub/ProjectApplicantsSection";
import { ProjectPersonnelSection } from "@/components/project-hub/ProjectPersonnelSection";
import { ProjectAssetAssignmentsSection } from "@/components/project-hub/ProjectAssetAssignmentsSection";
import { ProjectCustomerContactSection } from "@/components/project-hub/ProjectCustomerContactSection";
import { ProjectLinkedVendorsSection } from "@/components/project-hub/ProjectLinkedVendorsSection";

interface JobHubTeamTabProps {
  projectId: string;
  projectName: string;
  customerId?: string;
  pocName?: string | null;
  pocPhone?: string | null;
  pocEmail?: string | null;
}

export function JobHubTeamTab({ projectId, projectName, customerId, pocName, pocPhone, pocEmail }: JobHubTeamTabProps) {
  return (
    <div className="space-y-6">
      {customerId && (
        <ProjectCustomerContactSection
          customerId={customerId}
          pocName={pocName}
          pocPhone={pocPhone}
          pocEmail={pocEmail}
        />
      )}
      <ProjectLinkedVendorsSection projectId={projectId} />
      <ProjectRateBracketsSection projectId={projectId} />
      <ProjectApplicantsSection projectId={projectId} />
      <ProjectPersonnelSection projectId={projectId} projectName={projectName} />
      <ProjectAssetAssignmentsSection projectId={projectId} projectName={projectName} />
    </div>
  );
}
