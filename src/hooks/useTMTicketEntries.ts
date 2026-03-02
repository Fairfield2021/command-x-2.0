import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TMTicketEntry {
  id: string;
  tm_ticket_id: string;
  entry_date: string;
  hours: number;
  personnel_id: string | null;
  description: string | null;
  created_at: string;
}

export const useTMTicketEntries = (ticketId: string | null) => {
  return useQuery({
    queryKey: ["tm-ticket-entries", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("tm_ticket_entries")
        .select("*")
        .eq("tm_ticket_id", ticketId)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TMTicketEntry[];
    },
    enabled: !!ticketId,
  });
};

interface CreateTMTicketEntryParams {
  tm_ticket_id: string;
  entry_date: string;
  hours: number;
  personnel_id?: string | null;
  description?: string | null;
}

export const useCreateTMTicketEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateTMTicketEntryParams) => {
      // Pre-check: reject if ticket status is cap_reached
      const { data: ticket, error: ticketError } = await supabase
        .from("tm_tickets")
        .select("status")
        .eq("id", params.tm_ticket_id)
        .single();

      if (ticketError) throw ticketError;

      if (ticket?.status === "cap_reached") {
        throw new Error("Cap reached — ticket must be approved before adding more hours.");
      }

      const { data, error } = await supabase
        .from("tm_ticket_entries")
        .insert([{
          tm_ticket_id: params.tm_ticket_id,
          entry_date: params.entry_date,
          hours: params.hours,
          personnel_id: params.personnel_id ?? null,
          description: params.description ?? null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as TMTicketEntry;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tm-ticket-entries", variables.tm_ticket_id] });
      queryClient.invalidateQueries({ queryKey: ["tm-tickets"] });
      toast.success("Time entry added");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteTMTicketEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ticketId }: { id: string; ticketId: string }) => {
      const { error } = await supabase
        .from("tm_ticket_entries")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { ticketId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tm-ticket-entries", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tm-tickets"] });
      toast.success("Time entry deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete time entry: ${error.message}`);
    },
  });
};
