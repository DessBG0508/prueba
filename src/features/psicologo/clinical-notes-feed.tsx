import { useState, useEffect } from "react";
import { FileText, AlertTriangle, PhoneCall, Calendar, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllClinicalNotes } from "@/lib/psychologist-store";
import { useAuth } from "@/lib/auth-context";
import { supabase, hasRealSupabaseSession, isDemoUserId } from "@/lib/supabase";
import type { ClinicalNote } from "@/lib/types";

interface ClinicalNotesFeedProps {
  onSelectCase?: (caseId: string) => void;
}

const categoryStyles: Record<
  ClinicalNote["category"],
  { label: string; surface: string; icon: typeof FileText }
> = {
  emergencia: {
    label: "Crisis / Emergencia",
    surface: "bg-rose-100 text-rose-800 border-rose-300",
    icon: AlertTriangle,
  },
  sesion: {
    label: "Sesión Clínica",
    surface: "bg-teal/15 text-teal border-teal/30",
    icon: Calendar,
  },
  contacto: {
    label: "Contacto / Llamada",
    surface: "bg-amber-100 text-amber-800 border-amber-300",
    icon: PhoneCall,
  },
  seguimiento: {
    label: "Seguimiento",
    surface: "bg-indigo-100 text-indigo-800 border-indigo-300",
    icon: FileText,
  },
};

export function ClinicalNotesFeed({ onSelectCase }: ClinicalNotesFeedProps) {
  const { user } = useAuth();
  const isRealUser = Boolean(user?.id && !isDemoUserId(user.id));

  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const isRealSession = (await hasRealSupabaseSession()) || isRealUser;
      if (!isRealSession) {
        if (active) setNotes(getAllClinicalNotes());
        return;
      }

      try {
        const { data, error } = await supabase
          .from("expedientes_clinicos")
          .select("folio, campos_clinicos, updated_at")
          .order("updated_at", { ascending: false });

        if (!error && Array.isArray(data) && active) {
          const mapped: ClinicalNote[] = data
            .map((row: Record<string, unknown>) => {
              const campos = (row.campos_clinicos as Record<string, unknown>) || {};
              const objetivos = (campos.objetivos_sesion as Record<string, unknown>) || {};
              const notasLibres = String(objetivos.notas_libres || "").trim();
              const motivo = String(campos.motivo_en_palabras || "").trim();
              const hipotesis = String(campos.hipotesis_trabajo || "").trim();
              const content = [motivo, hipotesis, notasLibres].filter(Boolean).join("\n\n");
              if (!content) return null;

              return {
                id: `exp-${String(row.folio)}`,
                caseId: String(row.folio),
                date: row.updated_at
                  ? new Date(String(row.updated_at)).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Reciente",
                author: user?.name || "Psicología TESH",
                category: "seguimiento" as const,
                title: `Expediente Clínico — Folio ${String(row.folio)}`,
                content,
              };
            })
            .filter((item): item is ClinicalNote => item !== null);
          setNotes(mapped);
          return;
        }
        if (active) setNotes([]);
      } catch {
        if (active) setNotes([]);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [isRealUser, user?.name]);

  const filteredNotes = notes.filter((n) => {
    const matchesFilter = filter === "all" || n.category === filter;
    const matchesSearch =
      search === "" ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      n.author.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl text-primary">
            Bitácora de Intervenciones
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Registro cronológico y confidencial de notas de evolución y contactos realizados.
          </p>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtro de Categoría */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en notas por palabra clave o profesional..."
            className="pl-9 rounded-xl border-border bg-card text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "Todas" },
            { id: "emergencia", label: "Emergencia" },
            { id: "sesion", label: "Sesión" },
            { id: "contacto", label: "Contacto" },
            { id: "seguimiento", label: "Seguimiento" },
          ].map(({ id, label }) => (
            <Button
              key={id}
              size="sm"
              variant={filter === id ? "default" : "outline"}
              onClick={() => setFilter(id)}
              className={`h-8 rounded-lg text-xs ${
                filter === id ? "bg-primary text-primary-foreground" : "bg-card/70"
              }`}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista de Notas */}
      <div className="space-y-3">
        {filteredNotes.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
            <FileText className="size-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No se encontraron notas</p>
            <p className="text-xs text-muted-foreground mt-1">
              Las notas que agregues en el expediente de cada alumno aparecerán aquí organizadas.
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const catInfo = categoryStyles[note.category] || categoryStyles.seguimiento;
            const Icon = catInfo.icon;

            return (
              <div
                key={note.id}
                className="ethereal-card p-4 sm:p-5 rounded-2xl border border-border/70 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`${catInfo.surface} text-xs font-semibold gap-1`}
                    >
                      <Icon className="size-3" />
                      {catInfo.label}
                    </Badge>
                    <h3 className="text-sm font-bold text-foreground">{note.title}</h3>
                  </div>

                  <span className="text-xs text-muted-foreground">{note.date}</span>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/20 p-3 rounded-xl border border-border/40">
                  {note.content}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-teal">
                    Registrado por: {note.author}
                  </span>

                  {onSelectCase && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectCase(note.caseId)}
                      className="text-xs text-accent hover:underline h-7 px-2"
                    >
                      Ver expediente asociado →
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
