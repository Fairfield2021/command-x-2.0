
-- Create daily_field_logs table
CREATE TABLE public.daily_field_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL,
  weather_conditions TEXT,
  crew_count INTEGER DEFAULT 0,
  work_performed TEXT,
  safety_incidents TEXT,
  delays TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, log_date, created_by)
);

ALTER TABLE public.daily_field_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view field logs" ON public.daily_field_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create field logs" ON public.daily_field_logs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authors can update their own draft logs" ON public.daily_field_logs
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete field logs" ON public.daily_field_logs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Create field_photos table
CREATE TABLE public.field_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  daily_log_id UUID REFERENCES public.daily_field_logs(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL,
  storage_path TEXT NOT NULL,
  caption TEXT,
  location_tag TEXT,
  taken_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.field_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view field photos" ON public.field_photos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload field photos" ON public.field_photos
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploaders can update their own photos" ON public.field_photos
  FOR UPDATE USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins can delete field photos" ON public.field_photos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Create storage bucket for field photos
INSERT INTO storage.buckets (id, name, public) VALUES ('field-photos', 'field-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for field-photos bucket
CREATE POLICY "Anyone can view field photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'field-photos');

CREATE POLICY "Authenticated users can upload field photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'field-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own field photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'field-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own field photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'field-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
