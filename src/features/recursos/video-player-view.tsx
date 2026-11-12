import { useState, useEffect } from "react";
import { Play, Loader2, VideoOff } from "lucide-react";
import { isExternalEmbedVideo, getEmbedVideoUrl } from "./recursos-service";
import { resolvePlayableVideoUrl } from "./video-storage";

interface VideoPlayerViewProps {
  videoUrl?: string;
  title?: string;
  className?: string;
}

export function VideoPlayerView({ videoUrl, title, className = "" }: VideoPlayerViewProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!videoUrl) {
      setResolvedSrc(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    async function resolve() {
      try {
        const src = await resolvePlayableVideoUrl(videoUrl);
        if (isMounted) {
          setResolvedSrc(src);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    }

    resolve();
    return () => {
      isMounted = false;
    };
  }, [videoUrl]);

  if (!videoUrl) return null;

  const isEmbed = isExternalEmbedVideo(videoUrl);
  const embedUrl = isEmbed ? getEmbedVideoUrl(videoUrl) : null;

  return (
    <div
      className={`relative w-full aspect-video overflow-hidden rounded-xl border border-border bg-black shadow-md ${className}`}
    >
      {isLoading ? (
        <div className="grid h-full place-items-center text-muted-foreground bg-zinc-950 p-4">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin text-rose-500" />
            <span className="text-xs">Cargando video demostrativo...</span>
          </div>
        </div>
      ) : hasError || (!resolvedSrc && !embedUrl) ? (
        <div className="grid h-full place-items-center text-white/70 bg-zinc-950 p-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <VideoOff className="size-6 text-zinc-400" />
            <p className="text-xs">No se pudo cargar la vista previa del video.</p>
          </div>
        </div>
      ) : isEmbed && embedUrl ? (
        <iframe
          src={embedUrl}
          title={title || "Video demostrativo"}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <video
          key={resolvedSrc}
          src={resolvedSrc || undefined}
          controls
          playsInline
          className="w-full h-full object-contain bg-black"
          preload="metadata"
        >
          Tu navegador no soporta la reproducción directa de este formato de video.
        </video>
      )}
    </div>
  );
}
