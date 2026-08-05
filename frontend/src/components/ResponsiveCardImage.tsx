import {
  genericResponsiveDerivative,
  type GenericResponsiveImageSource,
} from "../data/responsive-images";

type ResponsiveCardImageProps = {
  src: string;
  alt: string;
  sizes: string;
  profile?: "card" | "generic-card" | "generic-hero";
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  decoding?: "async" | "sync" | "auto";
};

function cardDerivative(src: string, width: 320 | 640) {
  return src.replace(/\.png$/i, `-card-${width}.webp`);
}

/**
 * Exact-source responsive image. The original PNG remains a fallback; every
 * WebP is a deterministic, lossless, no-crop derivative of that exact source.
 */
export default function ResponsiveCardImage({
  src,
  alt,
  sizes,
  profile = "card",
  loading = "lazy",
  fetchPriority = loading === "lazy" ? "low" : undefined,
  decoding = "async",
}: ResponsiveCardImageProps) {
  const srcSet = profile === "card"
    ? `${cardDerivative(src, 320)} 320w, ${cardDerivative(src, 640)} 640w`
    : profile === "generic-card"
      ? `${genericResponsiveDerivative(src as GenericResponsiveImageSource, 320)} 320w, ${genericResponsiveDerivative(src as GenericResponsiveImageSource, 640)} 640w`
      : `${genericResponsiveDerivative(src as GenericResponsiveImageSource, 640)} 640w, ${genericResponsiveDerivative(src as GenericResponsiveImageSource, 1280)} 1280w`;

  return (
    <picture style={{ display: "contents" }}>
      <source
        type="image/webp"
        srcSet={srcSet}
        sizes={sizes}
      />
      <img
        src={src}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={decoding}
      />
    </picture>
  );
}
