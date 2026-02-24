import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, Mail, Building2 } from "lucide-react";

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        <h3 className="font-heading text-lg font-semibold">Customer Contact</h3>
      </div>

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
    </div>
  );
}
