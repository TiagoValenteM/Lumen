import Image from "next/image";

interface WorkspaceImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
}

const PLACEHOLDER_IMAGE = "/placeholder-workspace.jpg";

export function WorkspaceImage({
  src,
  alt,
  className = "",
  width,
  height,
  fill = false,
  priority = false,
}: WorkspaceImageProps) {
  const imageSrc = src || PLACEHOLDER_IMAGE;

  if (fill) {
    return (
      <Image
        src={imageSrc}
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
      src={imageSrc}
      alt={alt}
      width={width || 400}
      height={height || 300}
      className={className}
      priority={priority}
    />
  );
}
