import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Target, User, Calendar, MapPin, Phone, Mail, Hash } from "lucide-react";
import { format } from "date-fns";
import { ProjectRoomsSection } from "@/components/project-hub/rooms/ProjectRoomsSection";
import type { Milestone } from "@/integrations/supabase/hooks/useMilestones";

interface JobHubOverviewTabProps {
  project: any;
  customer: any;
  milestones: Milestone[] | undefined;
  overallCompletion: number;
  projectJobOrders: any[];
}

export function JobHubOverviewTab({
  project,
  customer,
  milestones,
  overallCompletion,
  projectJobOrders,
}: JobHubOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="glass border-border">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Project Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Completion</span>
              <span className="font-bold text-primary">{overallCompletion}%</span>
            </div>
            <Progress value={overallCompletion} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {milestones && milestones.length > 0
                ? `Based on ${milestones.length} milestone${milestones.length > 1 ? "s" : ""}`
                : `Based on ${projectJobOrders.length} job order${projectJobOrders.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Project Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass border-border">
          <CardHeader>
            <CardTitle className="font-heading text-sm text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={project.status} />
            {project.customer_po && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Customer PO:</span>
                <span className="font-medium">{project.customer_po}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-border">
          <CardHeader className="flex flex-row items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="font-heading text-sm text-muted-foreground">Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{customer?.name || "Unknown"}</p>
            {customer?.company && <p className="text-sm text-muted-foreground">{customer.company}</p>}
          </CardContent>
        </Card>

        <Card className="glass border-border">
          <CardHeader className="flex flex-row items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="font-heading text-sm text-muted-foreground">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="font-medium">Start:</span>{" "}
              {format(new Date(project.start_date), "MMM dd, yyyy")}
            </p>
            <p className="text-sm">
              <span className="font-medium">End:</span>{" "}
              {project.end_date ? format(new Date(project.end_date), "MMM dd, yyyy") : "Ongoing"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Address & POC */}
      {(project.address || project.poc_name || project.description) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {project.address && (
            <Card className="glass border-border">
              <CardHeader className="flex flex-row items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="font-heading text-sm text-muted-foreground">Project Address</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{project.address}</p>
                {(project.city || project.state || project.zip) && (
                  <p className="text-sm">{[project.city, project.state, project.zip].filter(Boolean).join(", ")}</p>
                )}
              </CardContent>
            </Card>
          )}

          {project.poc_name && (
            <Card className="glass border-border">
              <CardHeader className="flex flex-row items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="font-heading text-sm text-muted-foreground">Point of Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{project.poc_name}</p>
                {project.poc_phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{project.poc_phone}</span>
                  </div>
                )}
                {project.poc_email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{project.poc_email}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Description */}
      {project.description && (
        <Card className="glass border-border">
          <CardHeader>
            <CardTitle className="font-heading text-sm text-muted-foreground">Project Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{project.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Rooms */}
      <ProjectRoomsSection projectId={project.id} />
    </div>
  );
}
