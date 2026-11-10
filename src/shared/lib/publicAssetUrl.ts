/** public 目录资源使用构建前缀；页面路由仍从站点根路径访问。 */
export function publicAssetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}
