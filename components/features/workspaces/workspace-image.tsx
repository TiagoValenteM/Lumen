import Image from "next/image";
import { Coffee } from "lucide-react";

interface WorkspaceImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
}

export function WorkspaceImage({
  src,
  alt,
  className = "",
  width,
  height,
  fill = false,
  priority = false,
}: WorkspaceImageProps) {
  if (!src) {
    return <WorkspaceImagePlaceholder alt={alt} fill={fill} width={width} height={height} />;
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        priority={priority}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 400}
      height={height || 300}
      className={className}
      priority={priority}
    />
  );
}

function WorkspaceImagePlaceholder({
  alt,
  fill,
  width,
  height,
}: {
  alt: string;
  fill: boolean;
  width?: number;
  height?: number;
}) {
  const sizeStyle = fill ? undefined : { width: width || 400, height: height || 300 };

  return (
    <div
      role="img"
      aria-label={`${alt} photo placeholder`}
      style={sizeStyle}
      className={[
        fill ? "absolute inset-0" : "",
        "flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_25%_20%,hsl(var(--primary)/0.16),transparent_34%),linear-gradient(135deg,hsl(var(--muted)/0.82),hsl(var(--card)))]",
      ].join(" ")}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background/70 text-primary shadow-sm shadow-black/10 backdrop-blur-sm dark:bg-background/50 dark:shadow-black/30">
        <Coffee className="h-6 w-6" aria-hidden="true" />
      </div>
    </div>
  );
}
