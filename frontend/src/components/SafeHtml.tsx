import DOMPurify from "dompurify";

type SafeHtmlProps = {
  html: string;
  className?: string;
};

/** Render catalog HTML only after removing executable and layout-breaking markup. */
export default function SafeHtml({ html, className }: SafeHtmlProps) {
  const sanitizedRoot = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["style"],
    RETURN_DOM: true,
  }) as HTMLElement;

  // Some imported official tables visually mark headers with <td><strong>.
  // Promote those cells without changing their text, spans or numerical data.
  sanitizedRoot.querySelectorAll("table").forEach((table) => {
    if (table.querySelector("th")) return;
    Array.from(table.rows).forEach((row) => {
      const cells = Array.from(row.cells).filter((cell) => cell.tagName === "TD");
      const hasDirectStrong = (cell: HTMLTableCellElement) => Boolean(cell.querySelector(":scope > strong"));
      const isColumnHeaderRow = cells.length > 0 && cells.every(hasDirectStrong);
      cells.forEach((cell, index) => {
        if (!isColumnHeaderRow && !(index === 0 && hasDirectStrong(cell))) return;
        const header = document.createElement("th");
        Array.from(cell.attributes).forEach(({ name, value }) => header.setAttribute(name, value));
        header.scope = isColumnHeaderRow ? "col" : "row";
        while (cell.firstChild) header.appendChild(cell.firstChild);
        cell.replaceWith(header);
      });
    });
  });

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedRoot.innerHTML }} />;
}
