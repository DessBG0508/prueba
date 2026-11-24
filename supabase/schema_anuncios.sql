-- ==============================================================================
-- TABLAS DE ANUNCIOS PÚBLICOS, TALLERES E INSCRIPCIONES - EQUILIBRA TESH
-- Anuncios institucionales no confidenciales (talleres, recordatorios,
-- informativos y eventos) con segmentación opcional y control de cupo.
-- Base de datos normalizada en Tercera Forma Normal (3FN):
--   - `anuncios` almacena la definición del evento/aviso.
--   - `anuncios_inscripciones` modela la relación N:M entre estudiantes y anuncios
--     con restricción UNIQUE (anuncio_id, estudiante_id).
-- Respaldos: Supabase proporciona respaldos automáticos diarios (PITR),
--   cifrado TLS 1.3 en tránsito y AES-256 en reposo.
-- ==============================================================================

-- 1. Tabla principal de anuncios públicos y talleres
CREATE TABLE IF NOT EXISTS public.anuncios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('taller', 'recordatorio', 'informativo', 'evento')),
  fecha_evento DATE,
  lugar TEXT,
  cupo INTEGER CHECK (cupo IS NULL OR cupo >= 0),
  inscritos INTEGER NOT NULL DEFAULT 0 CHECK (inscritos >= 0),
  imagen_url TEXT,
  publico_objetivo TEXT NOT NULL DEFAULT 'todos' CHECK (
    publico_objetivo IN ('todos', 'rojo', 'amarillo', 'verde', 'sin_tamizaje')
  ),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.anuncios
  ADD COLUMN IF NOT EXISTS imagen_url TEXT;

CREATE INDEX IF NOT EXISTS idx_anuncios_activo_fecha ON public.anuncios(activo, fecha_evento);
CREATE INDEX IF NOT EXISTS idx_anuncios_publico ON public.anuncios(publico_objetivo);

-- 2. Tabla de inscripciones de estudiantes a talleres/eventos
CREATE TABLE IF NOT EXISTS public.anuncios_inscripciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anuncio_id UUID NOT NULL REFERENCES public.anuncios(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (anuncio_id, estudiante_id)
);

CREATE INDEX IF NOT EXISTS idx_anuncios_inscripciones_anuncio ON public.anuncios_inscripciones(anuncio_id);
CREATE INDEX IF NOT EXISTS idx_anuncios_inscripciones_estudiante ON public.anuncios_inscripciones(estudiante_id);

-- 3. Trigger para validar cupo disponible y mantener `anuncios.inscritos` sincronizado
CREATE OR REPLACE FUNCTION public.validate_anuncio_cupo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cupo INTEGER;
  v_inscritos INTEGER;
  v_activo BOOLEAN;
BEGIN
  SELECT cupo, inscritos, activo
    INTO v_cupo, v_inscritos, v_activo
    FROM public.anuncios
   WHERE id = NEW.anuncio_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El anuncio no existe.';
  END IF;

  IF v_activo IS FALSE THEN
    RAISE EXCEPTION 'Este anuncio ya no se encuentra activo.';
  END IF;

  IF v_cupo IS NOT NULL AND v_cupo > 0 AND v_inscritos >= v_cupo THEN
    RAISE EXCEPTION 'Cupo lleno para este taller o evento.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_anuncio_cupo ON public.anuncios_inscripciones;
CREATE TRIGGER trg_validate_anuncio_cupo
  BEFORE INSERT ON public.anuncios_inscripciones
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_anuncio_cupo();

CREATE OR REPLACE FUNCTION public.sync_anuncio_inscritos_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_anuncio_id UUID;
BEGIN
  v_anuncio_id := COALESCE(NEW.anuncio_id, OLD.anuncio_id);

  UPDATE public.anuncios
     SET inscritos = (
           SELECT COUNT(*)
             FROM public.anuncios_inscripciones
            WHERE anuncio_id = v_anuncio_id
         ),
         updated_at = now()
   WHERE id = v_anuncio_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_anuncio_inscritos ON public.anuncios_inscripciones;
CREATE TRIGGER trg_sync_anuncio_inscritos
  AFTER INSERT OR DELETE ON public.anuncios_inscripciones
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_anuncio_inscritos_count();

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuncios_inscripciones ENABLE ROW LEVEL SECURITY;

-- Políticas de `anuncios`:
-- Estudiantes y público autenticado/anónimo ven únicamente los anuncios activos
DROP POLICY IF EXISTS "Estudiantes ven anuncios activos" ON public.anuncios;
CREATE POLICY "Estudiantes ven anuncios activos"
  ON public.anuncios
  FOR SELECT
  TO anon, authenticated
  USING (activo = true);

-- Psicólogos y directivos ven todos los anuncios (activos y ocultos) y gestionan CRUD completo
DROP POLICY IF EXISTS "Psicólogo y directivo gestionan anuncios" ON public.anuncios;
CREATE POLICY "Psicólogo y directivo gestionan anuncios"
  ON public.anuncios
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('psicologo', 'directivo', 'jefatura')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('psicologo', 'directivo', 'jefatura')
    )
  );

-- Políticas de `anuncios_inscripciones`:
-- Estudiantes consultan y registran únicamente sus propias inscripciones
DROP POLICY IF EXISTS "Estudiantes ven sus propias inscripciones" ON public.anuncios_inscripciones;
CREATE POLICY "Estudiantes ven sus propias inscripciones"
  ON public.anuncios_inscripciones
  FOR SELECT
  TO authenticated
  USING (estudiante_id = auth.uid());

DROP POLICY IF EXISTS "Estudiantes se inscriben a anuncios activos" ON public.anuncios_inscripciones;
CREATE POLICY "Estudiantes se inscriben a anuncios activos"
  ON public.anuncios_inscripciones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    estudiante_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.anuncios
      WHERE anuncios.id = anuncio_id AND anuncios.activo = true
    )
  );

DROP POLICY IF EXISTS "Estudiantes pueden cancelar su propia inscripción" ON public.anuncios_inscripciones;
CREATE POLICY "Estudiantes pueden cancelar su propia inscripción"
  ON public.anuncios_inscripciones
  FOR DELETE
  TO authenticated
  USING (estudiante_id = auth.uid());

-- Psicólogos y directivos pueden consultar el listado de inscripciones
DROP POLICY IF EXISTS "Psicólogo y directivo consultan inscripciones" ON public.anuncios_inscripciones;
CREATE POLICY "Psicólogo y directivo consultan inscripciones"
  ON public.anuncios_inscripciones
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('psicologo', 'directivo', 'jefatura')
    )
  );

-- 5. Bucket de Supabase Storage para flyers e imágenes de anuncios/talleres
INSERT INTO storage.buckets (id, name, public)
VALUES ('anuncios-flyers', 'anuncios-flyers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Flyers de anuncios son públicos para lectura" ON storage.objects;
CREATE POLICY "Flyers de anuncios son públicos para lectura"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'anuncios-flyers');

DROP POLICY IF EXISTS "Psicólogos y directivos suben flyers de anuncios" ON storage.objects;
CREATE POLICY "Psicólogos y directivos suben flyers de anuncios"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'anuncios-flyers'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('psicologo', 'directivo', 'jefatura')
    )
  );

DROP POLICY IF EXISTS "Psicólogos y directivos eliminan flyers de anuncios" ON storage.objects;
CREATE POLICY "Psicólogos y directivos eliminan flyers de anuncios"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'anuncios-flyers'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('psicologo', 'directivo', 'jefatura')
    )
  );
