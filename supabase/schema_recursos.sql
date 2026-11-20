-- ==============================================================================
-- TABLA DE RECURSOS Y VIDEOS PSICOEDUCATIVOS - EQUILIBRA TESH
-- Soporta lecturas, técnicas terapéuticas, enlaces externos y videos subidos
-- Base de datos normalizada en Tercera Forma Normal (3FN):
--   todos los atributos atómicos dependen exclusivamente de la PK `id`.
-- Almacenamiento y Respaldos: videos alojados en Supabase Storage (`recursos-videos`)
--   con RLS; respaldos automáticos diarios (PITR), cifrado TLS 1.3 / AES-256
--   y monitoreo de consultas en Supabase Dashboard.
-- ==============================================================================

-- 1. Crear tabla public.recursos
CREATE TABLE IF NOT EXISTS public.recursos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (
    category IN ('Ansiedad', 'Estrés', 'Sueño', 'Ánimo', 'Respiración')
  ),
  read_time TEXT NOT NULL DEFAULT '4 min de lectura',
  icon_name TEXT NOT NULL DEFAULT 'bookOpen',
  tone TEXT NOT NULL DEFAULT 'teal' CHECK (
    tone IN ('teal', 'cyan', 'mint', 'lavender', 'rose')
  ),
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  key_takeaway TEXT,
  video_url TEXT,
  video_title TEXT,
  video_orientation TEXT DEFAULT 'auto' CHECK (
    video_orientation IS NULL OR video_orientation IN ('auto', 'horizontal', 'vertical', 'square')
  ),
  format TEXT NOT NULL DEFAULT 'lectura' CHECK (
    format IN ('video', 'lectura', 'ejercicio', 'audio', 'infografia')
  ),
  author TEXT DEFAULT 'Área de Psicología TESH',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Si la tabla ya existía sin video_orientation, agregarla de forma segura
ALTER TABLE public.recursos
  ADD COLUMN IF NOT EXISTS video_orientation TEXT DEFAULT 'auto';

CREATE INDEX IF NOT EXISTS idx_recursos_category ON public.recursos(category);
CREATE INDEX IF NOT EXISTS idx_recursos_active ON public.recursos(active);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;

-- Lectura pública / estudiantes para recursos activos
DROP POLICY IF EXISTS "Recursos activos visibles para todos" ON public.recursos;
CREATE POLICY "Recursos activos visibles para todos"
  ON public.recursos
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Psicólogos y directivos pueden ver todos (incluyendo ocultos)
DROP POLICY IF EXISTS "Psicólogos ven todos los recursos" ON public.recursos;
CREATE POLICY "Psicólogos ven todos los recursos"
  ON public.recursos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('psicologo', 'directivo')
    )
  );

-- Psicólogos pueden crear, editar y eliminar recursos
DROP POLICY IF EXISTS "Psicólogos gestionan recursos" ON public.recursos;
CREATE POLICY "Psicólogos gestionan recursos"
  ON public.recursos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('psicologo', 'directivo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('psicologo', 'directivo')
    )
  );

-- 3. Bucket de Supabase Storage para videos subidos directamente (MP4, WebM, MOV)
INSERT INTO storage.buckets (id, name, public)
VALUES ('recursos-videos', 'recursos-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para el bucket recursos-videos
DROP POLICY IF EXISTS "Videos de recursos son públicos para lectura" ON storage.objects;
CREATE POLICY "Videos de recursos son públicos para lectura"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'recursos-videos');

DROP POLICY IF EXISTS "Psicólogos pueden subir videos de recursos" ON storage.objects;
CREATE POLICY "Psicólogos pueden subir videos de recursos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recursos-videos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('psicologo', 'directivo')
    )
  );

DROP POLICY IF EXISTS "Psicólogos pueden actualizar o eliminar videos de recursos" ON storage.objects;
CREATE POLICY "Psicólogos pueden actualizar o eliminar videos de recursos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recursos-videos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('psicologo', 'directivo')
    )
  );
