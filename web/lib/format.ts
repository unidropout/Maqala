const regionNames = new Intl.DisplayNames(["ru"], { type: "region" });
const languageNames = new Intl.DisplayNames(["ru"], { type: "language" });

export function countryName(code: string): string {
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export function languageName(code: string): string {
  try {
    const name = languageNames.of(code) ?? code;
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return code;
  }
}

export function licenseName(license: string): string {
  return license.startsWith("cc") ? license.toUpperCase().replace(/^CC-/, "CC ").replaceAll("-", "‑") : license;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

export function formatDate(value: string | Date | null): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}
