import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FieldPhoto {
  id: string;
  project_id: string;
  daily_log_id: string | null;
  uploaded_by: string;
  storage_path: string;
  caption: string | null;
  location_tag: string | null;
  taken_at: string;
  created_at: string;
}

export function useFieldPhotos(projectId: string | undefined) {
  return useQuery({
    queryKey: ["field-photos", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("field_photos")
        .select("*")
        .eq("project_id", projectId)
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return data as FieldPhoto[];
    },
    enabled: !!projectId,
  });
}

export function useUploadFieldPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      file,
      caption,
      locationTag,
      dailyLogId,
    }: {
      projectId: string;
      file: File;
      caption?: string;
      locationTag?: string;
      dailyLogId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `${user.id}/${projectId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("field-photos")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("field_photos")
        .insert([{
          project_id: projectId,
          uploaded_by: user.id,
          storage_path: filePath,
          caption,
          location_tag: locationTag,
          daily_log_id: dailyLogId || null,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["field-photos", data.project_id] });
      toast.success("Photo uploaded");
    },
    onError: (error: Error) => {
      toast.error("Failed to upload photo: " + error.message);
    },
  });
}

export function useDeleteFieldPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, storagePath }: { id: string; projectId: string; storagePath: string }) => {
      await supabase.storage.from("field-photos").remove([storagePath]);
      const { error } = await supabase.from("field_photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["field-photos", variables.projectId] });
      toast.success("Photo deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete photo: " + error.message);
    },
  });
}

export function getFieldPhotoUrl(storagePath: string) {
  const { data } = supabase.storage.from("field-photos").getPublicUrl(storagePath);
  return data.publicUrl;
}
