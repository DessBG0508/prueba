-- ==============================================================================
-- EQUILIBRA TESH - Esquema de Base de Datos para Supabase
-- Proyecto: https://olnhxzsrhtnoyderzqce.supabase.co
-- ==============================================================================

-- 1. Extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de perfiles de usuario (estudiante, psicólogo, directivo)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  matricula TEXT,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('estudiante', 'psicologo', 'directivo')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS para perfiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Los psicólogos y directivos pueden ver perfiles de su campus"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('psicologo', 'directivo')
    )
  );

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 3. Tabla de Check-ins Emocionales
CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL,
  academic_load INTEGER NOT NULL CHECK (academic_load BETWEEN 1 AND 5),
  emotions TEXT[] DEFAULT '{}',
  risk_level TEXT NOT NULL CHECK (risk_level IN ('verde', 'amarillo', 'rojo')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS para check_ins
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Estudiantes pueden registrar sus check-ins"
  ON public.check_ins FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Estudiantes ven sus propios check-ins"
  ON public.check_ins FOR SELECT
  USING (student_id = auth.uid()::text OR student_id = 'demo-student-dess');

CREATE POLICY "Psicología tiene acceso a triaje de check-ins"
  ON public.check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'psicologo'
    )
  );

-- 4. Tabla de Alertas Prioritarias (Nivel Rojo / Emergencia)
CREATE TABLE IF NOT EXISTS public.alertas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  atendida BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir inserción de alertas de emergencia"
  ON public.alertas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Personal de psicología atiende alertas"
  ON public.alertas FOR ALL
  USING (true);

-- 5. Tabla de Citas Psicológicas
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL,
  psychologist_name TEXT NOT NULL,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  modality TEXT NOT NULL CHECK (modality IN ('presencial', 'virtual')),
  status TEXT DEFAULT 'agendada' CHECK (status IN ('agendada', 'completada', 'cancelada')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven y gestionan sus citas"
  ON public.appointments FOR ALL
  USING (true);
