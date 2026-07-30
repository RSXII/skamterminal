/** Strips the HTML entities/tags the source dossiers are authored with, for plain-text contexts (initials, alt text). */
export function plainText(html: string) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&rsquo;|&lsquo;/g, "’")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&");
}

export function initials(name: string) {
  return plainText(name)
    .replace(/["“”]/g, "")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}
