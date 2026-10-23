export function workSlug(title: string) {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "karya";
}

export function workHref(id: string, title: string) {
  return `/karya/${encodeURIComponent(id)}/${workSlug(title)}`;
}

export function workShareHref(title: string) {
  return `/karya/${encodeURIComponent(title)}`;
}
