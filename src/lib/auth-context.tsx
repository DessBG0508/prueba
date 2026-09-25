import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { DEMO_MODE } from "./mock-data";
import type { User, UserRole } from "./types";

interface RegisterInput {
  name: string;
  matricula: string;
  email: string;
  password: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
}

const AUTH_STORAGE_KEY = "equilibra_auth_session";
const REGISTERED_USERS_KEY = "equilibra_registered_users";
const LAST_ACTIVITY_KEY = "equilibra_last_activity_ts";
// Timeout de inactividad: protege datos sensibles de salud mental cerrando sesión tras 30 minutos sin interacción
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

// Usuarios mock iniciales para DEMO_MODE
const MOCK_USERS: Array<User & { passwordHash: string }> = [
  {
    id: "demo-student-dess",
    name: "Dess Bautista",
    matricula: "202310452",
    email: "dess@tesh.mx",
    role: "estudiante",
    passwordHash: "password123",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "demo-psicologa-marta",
    name: "Dra. Marta Gómez",
    matricula: "PSI-88410",
    email: "dra.marta@tesh.mx",
    role: "psicologo",
    passwordHash: "password123",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "demo-directivo-jefatura",
    name: "Mtro. Roberto Albarrán",
    matricula: "DIR-33201",
    email: "jefatura@tesh.mx",
    role: "directivo",
    passwordHash: "password123",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getRegisteredUsers(): Array<User & { passwordHash: string }> {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(REGISTERED_USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveRegisteredUser(user: User & { passwordHash: string }) {
  if (typeof window === "undefined") return;
  try {
    const list = getRegisteredUsers().filter((u) => u.email !== user.email);
    list.push(user);
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("No se pudo guardar el usuario registrado localmente", e);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastRecordedActivityRef = useRef<number>(Date.now());

  const logout = () => {
    /* TODO(Supabase): reemplazar por supabase.auth.signOut() */
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      localStorage.setItem("equilibra_logged_out", "true");
    } catch (e) {
      console.error("Error al eliminar la sesión", e);
    }
  };

  // Inicialización de sesión y verificación de expiración por inactividad previa
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
      const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : 0;
      const now = Date.now();

      // Si existía sesión pero ya transcurrieron más de 30 minutos de inactividad
      if (raw && lastActivity > 0 && now - lastActivity > INACTIVITY_TIMEOUT_MS) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        localStorage.setItem("equilibra_logged_out", "true");
        toast.info("Sesión cerrada por inactividad", {
          description:
            "Por seguridad de tus datos de salud mental y bienestar, la sesión se cerró tras 30 minutos de inactividad.",
        });
      } else if (raw) {
        setUser(JSON.parse(raw));
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      } else if (DEMO_MODE) {
        // En DEMO_MODE, inicializamos con el usuario estudiante Dess Bautista si no se ha cerrado sesión manualmente
        const hasLoggedOut = localStorage.getItem("equilibra_logged_out") === "true";
        if (!hasLoggedOut) {
          const defaultStudent: User = {
            id: "demo-student-dess",
            name: "Dess Bautista",
            matricula: "202310452",
            email: "dess@tesh.mx",
            role: "estudiante",
            createdAt: "2026-09-01T00:00:00.000Z",
          };
          setUser(defaultStudent);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultStudent));
          localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
        }
      }
    } catch (e) {
      console.error("Error al recuperar la sesión local", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Monitor continuo de inactividad (30 minutos) mientras el usuario tiene sesión activa
  useEffect(() => {
    if (!user) return;

    // Actualiza la marca de tiempo de actividad con limitación (máx 1 vez cada 10 segundos)
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastRecordedActivityRef.current > 10000) {
        lastRecordedActivityRef.current = now;
        try {
          localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
        } catch {
          // Ignorar cuota o storage deshabilitado
        }
      }
    };

    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll", "click"];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Verificación periódica cada 20 segundos
    const checkInterval = setInterval(() => {
      try {
        const lastStr = localStorage.getItem(LAST_ACTIVITY_KEY);
        const lastTs = lastStr ? parseInt(lastStr, 10) : lastRecordedActivityRef.current;
        if (Date.now() - lastTs > INACTIVITY_TIMEOUT_MS) {
          logout();
          toast.info("Sesión cerrada por inactividad", {
            description:
              "Tu sesión ha expirado tras 30 minutos sin interacción para resguardar tu privacidad.",
          });
        }
      } catch (err) {
        console.error("Error verificando timeout de inactividad", err);
      }
    }, 20000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(checkInterval);
    };
  }, [user]);

  const login = async (email: string, password: string): Promise<User> => {
    const normalizedEmail = email.trim().toLowerCase();

    /* TODO(Supabase): reemplazar por supabase.auth.signInWithPassword() y asignar rol desde profiles */
    if (DEMO_MODE) {
      // 1. Buscar en usuarios mock predeterminados
      const mockMatch = MOCK_USERS.find((u) => u.email.toLowerCase() === normalizedEmail);

      // 2. Buscar en usuarios registrados localmente
      const registeredMatch = getRegisteredUsers().find(
        (u) => u.email.toLowerCase() === normalizedEmail,
      );

      const found = mockMatch || registeredMatch;

      if (!found) {
        throw new Error("El correo electrónico no coincide con ningún usuario registrado.");
      }

      // Validar contraseña
      if (password.length < 8 && found.passwordHash !== password) {
        throw new Error("La contraseña debe tener al menos 8 caracteres.");
      }

      const activeUser: User = {
        id: found.id,
        name: found.name,
        matricula: found.matricula,
        email: found.email,
        role: found.role,
        createdAt: found.createdAt,
      };

      setUser(activeUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(activeUser));
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      localStorage.removeItem("equilibra_logged_out");
      return activeUser;
    }

    throw new Error("Autenticación externa no configurada.");
  };

  const register = async (input: RegisterInput): Promise<User> => {
    const normalizedEmail = input.email.trim().toLowerCase();

    /* TODO(Supabase): reemplazar por supabase.auth.signUp() y guardar profile en tabla profiles */
    if (DEMO_MODE) {
      const mockExists = MOCK_USERS.some((u) => u.email.toLowerCase() === normalizedEmail);
      const registeredExists = getRegisteredUsers().some(
        (u) => u.email.toLowerCase() === normalizedEmail,
      );

      if (mockExists || registeredExists) {
        throw new Error("Este correo electrónico ya está registrado.");
      }

      const newUser: User & { passwordHash: string } = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        matricula: input.matricula.trim(),
        email: normalizedEmail,
        role: input.role,
        passwordHash: input.password,
        createdAt: new Date().toISOString(),
      };

      saveRegisteredUser(newUser);

      const activeUser: User = {
        id: newUser.id,
        name: newUser.name,
        matricula: newUser.matricula,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      };

      setUser(activeUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(activeUser));
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      localStorage.removeItem("equilibra_logged_out");
      return activeUser;
    }

    throw new Error("Autenticación externa no configurada.");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser utilizado dentro de un AuthProvider");
  }
  return context;
}
