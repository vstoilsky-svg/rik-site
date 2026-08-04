import DOMPurify from "dompurify";

type SafeHtmlProps = {
  html: string;
  className?: string;
};

/** Render catalog HTML only after removing executable and layout-breaking markup. */
export default function SafeHtml({ html, className }: SafeHtmlProps) {
  const sanitized = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["style"],
  });

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
