export const GENERIC_RESPONSIVE_IMAGE_SOURCES = [
  "/photo/catalog/bar-product.png",
  "/photo/catalog/central-units-combined.png",
  "/photo/catalog/duct-flanges.png",
  "/photo/catalog/duct-parts.png",
  "/photo/catalog/duct-rect.png",
  "/photo/catalog/duct-round.png",
  "/photo/catalog/gidromodul-rgm.png",
  "/photo/catalog/re-round.png",
  "/photo/catalog/rf-round.png",
  "/photo/catalog/rik-m-source.png",
  "/photo/catalog/rik-s-source.png",
  "/photo/catalog/rkz-obogrev.png",
  "/photo/catalog/rkz-rect.png",
  "/photo/catalog/ro-rect.png",
  "/photo/catalog/rop-k.png",
  "/photo/catalog/rop.png",
  "/photo/catalog/rq-round.png",
  "/photo/catalog/rw-round.png",
] as const;

export type GenericResponsiveImageSource = typeof GENERIC_RESPONSIVE_IMAGE_SOURCES[number];

const genericResponsiveImageSet = new Set<string>(GENERIC_RESPONSIVE_IMAGE_SOURCES);

export function hasGenericResponsiveSource(
  src: string | null | undefined,
): src is GenericResponsiveImageSource {
  return Boolean(src && genericResponsiveImageSet.has(src));
}

export function genericResponsiveDerivative(
  src: GenericResponsiveImageSource,
  width: 320 | 640 | 1280,
) {
  return src.replace(/\.png$/i, `-responsive-${width}.webp`);
}
