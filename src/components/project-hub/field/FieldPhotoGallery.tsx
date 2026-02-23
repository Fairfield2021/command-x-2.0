import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, ImageIcon } from "lucide-react";
import { useFieldPhotos, useUploadFieldPhoto, useDeleteFieldPhoto, getFieldPhotoUrl } from "@/integrations/supabase/hooks/useFieldPhotos";

interface FieldPhotoGalleryProps {
  projectId: string;
}

export function FieldPhotoGallery({ projectId }: FieldPhotoGalleryProps) {
  const { data: photos, isLoading } = useFieldPhotos(projectId);
  const uploadPhoto = useUploadFieldPhoto();
  const deletePhoto = useDeleteFieldPhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await uploadPhoto.mutateAsync({ projectId, file });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Site Photos ({photos?.length || 0})</h3>
        </div>
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadPhoto.isPending}>
            <Upload className="h-4 w-4 mr-2" />
            {uploadPhoto.isPending ? "Uploading..." : "Upload Photos"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading photos...</p>
      ) : !photos || photos.length === 0 ? (
        <Card className="glass border-border">
          <CardContent className="py-8 text-center text-muted-foreground">
            No site photos yet. Upload photos to document field conditions.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="glass border-border overflow-hidden group relative">
              <img
                src={getFieldPhotoUrl(photo.storage_path)}
                alt={photo.caption || "Site photo"}
                className="w-full h-40 object-cover"
                loading="lazy"
              />
              <CardContent className="p-3">
                {photo.caption && (
                  <p className="text-xs font-medium truncate">{photo.caption}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(photo.taken_at).toLocaleDateString()}
                </p>
              </CardContent>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deletePhoto.mutate({ id: photo.id, projectId, storagePath: photo.storage_path })}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
