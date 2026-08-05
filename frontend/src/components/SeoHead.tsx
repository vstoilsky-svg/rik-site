import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  DEFAULT_DESCRIPTION,
  SITE_ORIGIN,
  canonicalUrl,
  normalizeSeoPath,
  resolveSeoRoute,
  structuredDataFor,
} from "../seo/routes";

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let node = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attribute, key);
    document.head.appendChild(node);
  }
  node.content = content;
}

export default function SeoHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const normalizedPath = normalizeSeoPath(pathname);
    const seo = resolveSeoRoute(normalizedPath);
    const title = seo?.title ?? "Страница не найдена — РИК";
    const description = seo?.description ?? DEFAULT_DESCRIPTION;
    const currentCanonical = seo ? canonicalUrl(seo) : `${SITE_ORIGIN}${normalizedPath}`;
    const image = seo ? `${SITE_ORIGIN}${seo.image}` : `${SITE_ORIGIN}/logo.png`;

    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", seo ? "index, follow, max-image-preview:large" : "noindex, follow");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", currentCanonical);
    setMeta("property", "og:type", seo?.ogType ?? "website");
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = currentCanonical;

    let structuredData = document.head.querySelector<HTMLScriptElement>("#rik-structured-data");
    if (seo) {
      if (!structuredData) {
        structuredData = document.createElement("script");
        structuredData.id = "rik-structured-data";
        structuredData.type = "application/ld+json";
        document.head.appendChild(structuredData);
      }
      structuredData.textContent = JSON.stringify(structuredDataFor(seo));
    } else {
      structuredData?.remove();
    }
  }, [pathname]);

  return null;
}
