/** 管理端创作入口。开发时保持页面主机名一致，让同一个HttpOnly Cookie正常跨端使用。 */
export function buildManagementNoteUrl(configured: string | undefined, pageUrl: string, development: boolean, view?: "trash") {
  const page = new URL(pageUrl);
  const loopback = (hostname: string) => hostname === "localhost" || hostname === "127.0.0.1";
  const configuredUrl = configured?.trim();
  if (!configuredUrl && !(development && loopback(page.hostname))) {
    throw new Error("管理端地址尚未配置，请配置 VITE_MANAGEMENT_URL");
  }
  const target = new URL(configuredUrl || `${page.protocol}//${page.hostname}:4173/notes`);
  if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) {
    throw new Error("管理端地址必须是有效的 HTTP 或 HTTPS 地址");
  }
  if (development && loopback(page.hostname) && loopback(target.hostname)) target.hostname = page.hostname;
  target.searchParams.delete("compose");
  if (view) target.searchParams.set("view", view);
  else target.searchParams.delete("view");
  return target.href;
}
export function managementNoteUrl(view?: "trash") {
  return buildManagementNoteUrl(import.meta.env.VITE_MANAGEMENT_URL, window.location.href, import.meta.env.DEV, view);
}
