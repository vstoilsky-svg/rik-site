import type { ImgHTMLAttributes } from 'react';
import { IMAGE_ASSETS } from '../data/image-assets.generated';

/** Original remains the fallback and its URL stays available to search crawlers. */
export default function SiteImage({
  src, alt, width, height, sizes, loading = 'lazy', decoding = 'async', ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const asset = src ? IMAGE_ASSETS[src] : undefined;
  const srcSet = props.srcSet ?? (asset?.variants.length
    ? asset.variants.map(v => `${v.src} ${v.width}w`).join(', ')
    : undefined);
  return <img {...props} src={src} alt={alt}
    width={width ?? asset?.width} height={height ?? asset?.height}
    srcSet={srcSet} sizes={srcSet ? sizes ?? '(max-width: 760px) calc(100vw - 48px), (max-width: 1200px) calc(100vw - 96px), 1120px' : undefined}
    loading={loading} decoding={decoding} />;
}
