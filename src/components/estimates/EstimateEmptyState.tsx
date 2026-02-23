import { FileText } from "lucide-react";

interface EstimateEmptyStateProps {
  createAction?: React.ReactNode;
  hasFilters?: boolean;
}

export function EstimateEmptyState({ createAction, hasFilters }: EstimateEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="text-center py-12 glass rounded-lg">
        <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
          No estimates found
        </h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          No estimates match your current filters. Try adjusting your search or status filter.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12 glass rounded-lg">
      <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
        No estimates yet
      </h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        Create your first project estimate to start winning new business.
      </p>
      {createAction}
    </div>
  );
}
