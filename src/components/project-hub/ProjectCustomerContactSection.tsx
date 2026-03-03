import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, Building2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ProjectCustomerContactSectionProps {
  customerId: string;
  pocName?: string | null;
  pocPhone?: string | null;
  pocEmail?: string | null;
}

export function ProjectCustomerContactSection({
  customerId,
  pocName,
  pocPhone,
  pocEmail,
}: ProjectCustomerContactSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  const { data: customer } = useQuery({
    queryKey: ["customer-contact", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, email, phone, company")
        .eq("id", customerId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (!customer && !pocName) return null;

  const contactCount = (customer ? 1 : 0) + (pocName ? 1 : 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-secondary/50 hover:bg-secondary rounded-lg mb-2 transition-colors group">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary group-hover:text-foreground transition-colors" />
          <span className="font-heading text-sm sm:text-base font-semibold">Customer Contact</span>
          <Badge variant="secondary" className="text-xs">{contactCount}</Badge>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="animate-fade-in">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Customer info */}
          {customer && (
            <Card className="glass border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{customer.name}</p>
                {customer.company && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{customer.company}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <a href={`tel:${customer.phone}`} className="hover:text-foreground transition-colors">
                      {customer.phone}
                    </a>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <a href={`mailto:${customer.email}`} className="hover:text-foreground transition-colors">
                      {customer.email}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Project POC */}
          {pocName && (
            <Card className="glass border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Point of Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{pocName}</p>
                {pocPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <a href={`tel:${pocPhone}`} className="hover:text-foreground transition-colors">
                      {pocPhone}
                    </a>
                  </div>
                )}
                {pocEmail && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <a href={`mailto:${pocEmail}`} className="hover:text-foreground transition-colors">
                      {pocEmail}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
