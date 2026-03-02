import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChevronDown, ChevronRight, Clock, Plus, Trash2, CalendarIcon, DollarSign, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { useTMTicketEntries, useCreateTMTicketEntry, useDeleteTMTicketEntry } from "@/hooks/useTMTicketEntries";
import { useApproveTMTicket, useUpdateTMTicket } from "@/integrations/supabase/hooks/useTMTickets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Extended ticket type for the hourly-rate T&M flow
interface TMTicketData {
  id: string;
  ticket_number: string;
  description: string | null;
  status: string;
  hourly_rate: number | null;
  cap_hours: number | null;
  hours_logged: number | null;
  materials_cost: number | null;
  total: number;
  before_photo_url: string | null;
  after_photo_url: string | null;
  approved_by: string | null;
  approval_date: string | null;
  work_date: string;
  created_at: string;
}

interface TMTicketCardProps {
  ticket: TMTicketData;
  currentUserId: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-500/20 text-blue-500 border-blue-500/30" },
  cap_reached: { label: "Cap Reached - Approval Required", className: "bg-amber-500/20 text-amber-500 border-amber-500/30" },
  pending_approval: { label: "Pending Approval", className: "bg-amber-500/20 text-amber-500 border-amber-500/30" },
  approved: { label: "Approved", className: "bg-green-500/20 text-green-500 border-green-500/30" },
  invoiced: { label: "Invoiced", className: "bg-teal-500/20 text-teal-500 border-teal-500/30" },
  converted_to_co: { label: "Converted to CO", className: "bg-purple-500/20 text-purple-500 border-purple-500/30" },
};

export function TMTicketCard({ ticket, currentUserId }: TMTicketCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [entryHours, setEntryHours] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [editingMaterials, setEditingMaterials] = useState(false);
  const [materialsCostValue, setMaterialsCostValue] = useState(String(ticket.materials_cost ?? 0));

  const { data: entries = [], isLoading: entriesLoading } = useTMTicketEntries(isOpen ? ticket.id : null);
  const createEntry = useCreateTMTicketEntry();
  const deleteEntry = useDeleteTMTicketEntry();
  const approveMutation = useApproveTMTicket();
  const updateMutation = useUpdateTMTicket();

  const hoursLogged = ticket.hours_logged ?? 0;
  const capHours = ticket.cap_hours ?? 10;
  const hourlyRate = ticket.hourly_rate ?? 0;
  const progress = capHours > 0 ? (hoursLogged / capHours) * 100 : 0;

  const statusConfig = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
  const isLocked = ["cap_reached", "converted_to_co", "invoiced"].includes(ticket.status);

  const getProgressColor = () => {
    if (progress >= 100) return "bg-destructive";
    if (progress >= 80) return "bg-amber-500";
    return "bg-green-500";
  };

  const handleAddEntry = () => {
    if (!entryHours || parseFloat(entryHours) <= 0) return;
    createEntry.mutate(
      {
        tm_ticket_id: ticket.id,
        entry_date: format(entryDate, "yyyy-MM-dd"),
        hours: parseFloat(entryHours),
        description: entryDescription.trim() || null,
      },
      {
        onSuccess: () => {
          setEntryHours("");
          setEntryDescription("");
          setEntryDate(new Date());
        },
      }
    );
  };

  const handleApprove = () => {
    if (!currentUserId) return;
    approveMutation.mutate({ id: ticket.id, approved_by: currentUserId });
  };

  const handleSaveMaterials = async () => {
    const val = parseFloat(materialsCostValue) || 0;
    const { error } = await supabase
      .from("tm_tickets")
      .update({ materials_cost: val } as any)
      .eq("id", ticket.id);
    if (error) {
      toast.error("Failed to update materials cost");
    } else {
      toast.success("Materials cost updated");
      setEditingMaterials(false);
    }
  };

  return (
    <Card className="border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/30 transition-colors">
            {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">{ticket.ticket_number}</span>
                <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {ticket.description || "No description"}
              </p>
            </div>

            {/* Hours progress */}
            <div className="hidden sm:flex flex-col items-end gap-1 min-w-[120px]">
              <span className="text-xs text-muted-foreground">
                {hoursLogged} / {capHours} hrs
              </span>
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", getProgressColor())}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            {/* Amount */}
            <div className="text-right shrink-0">
              <div className="font-bold text-sm">{formatCurrency(ticket.total)}</div>
              {hourlyRate > 0 && (
                <div className="text-xs text-muted-foreground">@ {formatCurrency(hourlyRate)}/hr</div>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4 border-t border-border">
            {/* Full description */}
            <div className="pt-3">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="text-sm mt-1">{ticket.description || "—"}</p>
            </div>

            {/* Mobile hours bar */}
            <div className="sm:hidden">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Hours</span>
                <span>{hoursLogged} / {capHours} hrs</span>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", getProgressColor())}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            {/* Materials cost */}
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Materials:</span>
              {editingMaterials && ticket.status === "open" ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={materialsCostValue}
                    onChange={(e) => setMaterialsCostValue(e.target.value)}
                    className="w-24 h-7 text-sm"
                  />
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleSaveMaterials}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingMaterials(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <span
                  className={cn("text-sm font-medium", ticket.status === "open" && "cursor-pointer hover:underline")}
                  onClick={() => ticket.status === "open" && setEditingMaterials(true)}
                >
                  {formatCurrency(ticket.materials_cost ?? 0)}
                </span>
              )}
            </div>

            {/* Before / After photos */}
            {(ticket.before_photo_url || ticket.after_photo_url) && (
              <div className="flex gap-4">
                {ticket.before_photo_url && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Before</Label>
                    <img src={ticket.before_photo_url} alt="Before" className="mt-1 h-20 w-20 rounded object-cover border border-border" />
                  </div>
                )}
                {ticket.after_photo_url && (
                  <div>
                    <Label className="text-xs text-muted-foreground">After</Label>
                    <img src={ticket.after_photo_url} alt="After" className="mt-1 h-20 w-20 rounded object-cover border border-border" />
                  </div>
                )}
              </div>
            )}

            {/* Time entries */}
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Time Entries
              </Label>
              <div className="mt-2 space-y-1">
                {entriesLoading ? (
                  <p className="text-xs text-muted-foreground">Loading...</p>
                ) : entries.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No time entries yet.</p>
                ) : (
                  entries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-secondary/30">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{format(new Date(entry.entry_date), "MMM dd")}</span>
                        <span className="font-medium">{entry.hours}h</span>
                        {entry.description && <span className="text-muted-foreground">— {entry.description}</span>}
                      </div>
                      {ticket.status === "open" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => deleteEntry.mutate({ id: entry.id, ticketId: ticket.id })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Log hours form */}
              {isLocked ? (
                <p className="text-xs text-amber-500 mt-2">
                  {ticket.status === "cap_reached"
                    ? "Hour cap reached. PM approval required to log more time."
                    : "Ticket is locked — no more entries allowed."}
                </p>
              ) : (
                <div className="flex items-end gap-2 mt-3 flex-wrap">
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("w-[120px] justify-start text-left font-normal h-8 text-xs")}>
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {format(entryDate, "MMM dd")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={entryDate}
                          onSelect={(d) => d && setEntryDate(d)}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-xs">Hours</Label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0.25"
                      value={entryHours}
                      onChange={(e) => setEntryHours(e.target.value)}
                      placeholder="1.5"
                      className="w-20 h-8 text-xs"
                    />
                  </div>
                  <div className="flex-1 min-w-[100px]">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={entryDescription}
                      onChange={(e) => setEntryDescription(e.target.value)}
                      placeholder="Optional"
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={handleAddEntry}
                    disabled={createEntry.isPending || !entryHours}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              )}
            </div>

            {/* Action buttons by status */}
            {ticket.status === "cap_reached" && (
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve & Extend (+10 hrs)
                </Button>
                <Button variant="outline" size="sm" className="text-purple-500 border-purple-500/30 hover:bg-purple-500/10">
                  Convert to Change Order
                </Button>
              </div>
            )}

            {ticket.status === "approved" && ticket.approval_date && (
              <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                Approved on {format(new Date(ticket.approval_date), "MMM dd, yyyy")}
                {ticket.approved_by && ` by ${ticket.approved_by}`}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
