import { useState, useEffect, useRef } from "react";
import { Loader2, VideoOff } from "lucide-react";
import { isExternalEmbedVideo, getEmbedVideoUrl, detectVideoOrientation } from "./recursos-service";
import { resolvePlayableVideoUrl } from "./video-storage";
import type { VideoOrientation } from "@/lib/types";

export type ResolvedOrientation = "horizontal" | "vertical" | "square";

interface VideoPlayerViewProps {
  videoUrl?: string;
  title?: string;
  orientation?: VideoOrientation;
  onOrientationDetected?: (orientation: ResolvedOrientation) => void;
  className?: string;
}

export function VideoPlayerView({
  videoUrl,
  title,
  orientation = "auto",
  onOrientationDetected,
  className = "",
}: VideoPlayerViewProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const onOrientationRef = useRef(onOrientationDetected);
  useEffect(() => {
    onOrientationRef.current = onOrientationDetected;
  }, [onOrientationDetected]);

  const initialOrientation = detectVideoOrientation(videoUrl, orientation);
  const [detectedOrientation, setDetectedOrientation] =
    useState<ResolvedOrientation>(initialOrientation);
  const [exactAspectRatio, setExactAspectRatio] = useState<string | null>(null);

  useEffect(() => {
    const nextInitial = detectVideoOrientation(videoUrl, orientation);
    setDetectedOrientation(nextInitial);
    setExactAspectRatio(null);
    onOrientationRef.current?.(nextInitial);
  }, [videoUrl, orientation]);

  useEffect(() => {
    let isMounted = true;
    if (!videoUrl) {
      setResolvedSrc(null);
      setIsLoading(false);
      return;
    }

    if (isExternalEmbedVideo(videoUrl)) {
      setResolvedSrc(videoUrl);
      setHasError(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    async function resolve() {
      try {
        const src = await resolvePlayableVideoUrl(videoUrl);
        if (isMounted) {
          if (!src) {
            setResolvedSrc(null);
            setHasError(true);
          } else {
            setResolvedSrc(src);
          }
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

  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoEl = e.currentTarget;
    const w = videoEl.videoWidth;
    const h = videoEl.videoHeight;
    if (!w || !h) return;

    // Respetar preferencia manual si el psicólogo la fijó explícitamente, si es auto detectamos
    let nextOrientation: ResolvedOrientation = "horizontal";
    if (orientation && orientation !== "auto") {
      nextOrientation = orientation;
    } else if (h > w * 1.05) {
      nextOrientation = "vertical";
    } else if (Math.abs(w - h) / Math.max(w, h) < 0.08) {
      nextOrientation = "square";
    }

    setDetectedOrientation(nextOrientation);
    setExactAspectRatio(`${w} / ${h}`);
    onOrientationRef.current?.(nextOrientation);
  };

  // Clases y relación de aspecto adaptativas según si el video es vertical, cuadrado u horizontal
  const containerSizingClass =
    detectedOrientation === "vertical"
      ? "mx-auto w-full max-w-[330px] sm:max-w-[370px] max-h-[75vh]"
      : detectedOrientation === "square"
        ? "mx-auto w-full max-w-[460px]"
        : "mx-auto w-full max-w-3xl";

  const fallbackAspectRatio =
    detectedOrientation === "vertical"
      ? "9 / 16"
      : detectedOrientation === "square"
        ? "1 / 1"
        : "16 / 9";

  return (
    <div
      style={{ aspectRatio: exactAspectRatio || fallbackAspectRatio }}
      className={`relative overflow-hidden rounded-2xl border border-border/80 bg-zinc-950 shadow-md transition-all duration-300 ${containerSizingClass} ${className}`}
    >
      {isLoading ? (
        <div className="grid h-full w-full place-items-center text-muted-foreground bg-zinc-950 p-4">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin text-teal-400" />
            <span className="text-xs text-slate-300">Cargando video demostrativo...</span>
          </div>
        </div>
      ) : hasError || (!resolvedSrc && !embedUrl) ? (
        <div className="grid h-full w-full place-items-center text-white/70 bg-zinc-950 p-5 text-center">
          <div className="flex flex-col items-center gap-2 max-w-md">
            <VideoOff className="size-6 text-zinc-400" />
            <p className="text-xs text-slate-200 font-medium">
              No se pudo reproducir este archivo de video aquí.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Si fue guardado en otro navegador o sesión, súbelo de nuevo desde el Panel del
              Psicólogo (preferentemente en formato MP4 H.264 o WebM) o vincula un enlace de
              YouTube/Vimeo.
            </p>
          </div>
        </div>
      ) : isEmbed && embedUrl ? (
        <iframe
          src={embedUrl}
          title={title || "Video demostrativo"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className={
            detectedOrientation === "horizontal"
              ? "w-full aspect-video rounded-lg border-0"
              : "w-full h-full rounded-lg border-0"
          }
        />
      ) : (
        <video
          key={resolvedSrc}
          src={resolvedSrc || undefined}
          controls
          playsInline
          onLoadedMetadata={handleVideoMetadata}
          onError={() => setHasError(true)}
          className="w-full h-full rounded-lg object-contain bg-zinc-950"
          preload="metadata"
        >
          Tu navegador no soporta la reproducción directa de este formato de video.
        </video>
      )}
    </div>
  );
}
