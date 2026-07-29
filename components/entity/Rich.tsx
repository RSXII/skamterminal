/** Renders GM-authored dossier copy, which relies on entities/inline tags (curly quotes, <strong>, etc). */
export function Rich({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
