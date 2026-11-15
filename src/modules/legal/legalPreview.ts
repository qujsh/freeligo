/** 协议正文在后端清理后仍使用隔离文档展示；不执行上传HTML的脚本或内联事件。 */
export function legalPreview(html: string) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>body{max-width:800px;margin:0 auto;padding:24px;color:#34373c;font:16px/1.9 system-ui,sans-serif;overflow-wrap:anywhere}h1,h2,h3{line-height:1.5}table{display:block;max-width:100%;overflow:auto;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}pre{white-space:pre-wrap}a{color:#e95520}</style></head><body>${html}</body></html>`;
}
