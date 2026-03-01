export const SITE_TITLE = "Brendan Tierney";
export const SITE_URL = "https://tiernebre.github.io";

export function pageTitle(title: string): string {
  return `${title} | ${SITE_TITLE}`;
}
