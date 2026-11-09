# C 端部署到七牛云

本项目为 Vue 3 + Vite 静态站点，工作流 **Deploy C frontend to Qiniu** 仅手动运行，发布生产构建产物。不会连接 ECS、创建空间、修改后端或因 push 自动上线。

## 一次性准备

1. 推荐新建独立**公开空间** `freeligo-c-web`。它与 B 端的 `freeligo-web`、业务图片空间均分开，避免根 `index.html` 相互覆盖。
2. 绑定 C 端自定义 HTTPS 域名并配置 DNS/证书，例如 `https://www.example.com`。大陆 CDN 使用已备案域名。七牛新空间测试域名有静态页面/强制下载限制，脚本不接受测试域名。
3. 配置默认首页 `/index.html`。`/`、`/index.html` 返回 `200 text/html`，不能强制下载或重定向。
4. 当前 Vue Router 保留 History 路由。配置页面路径**内部回退到根 index.html、HTTP 200、地址栏路径不变**，例如 `/opportunities`、`/favorites`、`/projects/:id`、`/tasks/:id`。只设置默认首页或返回 404 的错误页不够。`/releases/*` 的真实资源按原路径访问，缺失文件返回 404，不返回 HTML。如果所用七牛/CDN方案不支持该回退，需要另行调整托管方案或改用 Hash 路由，不能仅填写确认变量。
5. 缓存规则：所有页面路径（含 `/`、`/index.html`）不缓存/每次重新验证；`/releases/*` 资源长期缓存。不能只刷新首页却让其他页面缓存旧入口。
6. 准备公网 HTTPS API，例如 `https://api.example.com`，不含 `/api`。Vite `/api` 代理只用于开发，上传七牛后不提供代理。后端 CORS 明确允许 C 端域名及凭证；Cookie 登录建议同一主域名下的 HTTPS 子域名，正确设置 Cookie Secure/反向代理 HTTPS 信息。图片下载地址也需 HTTPS。
7. 准备专用七牛 CI 凭据，限制到此空间的上传、对象状态查询和所需 CDN 刷新权限。不要把凭据写入仓库或 `VITE_` 变量。

注意：当前首页笔记与本机草稿仍有演示内容；项目 README 已记录旧任务/承接接口被后端 0.0.2 下线。工作流固定 `VITE_DATA_SOURCE=api`，不会自动切 mock 掩盖接口失败，也不会将现有演示账号升级为正式认证。静态站点部署不代表旧接口已兼容，业务联调需单独完成。

官方参考：[静态页面](https://developer.qiniu.com/kodo/8604/a-static-page-management)、[域名访问策略](https://developer.qiniu.com/kodo/13421/safety-visit)、[Python SDK](https://developer.qiniu.com/kodo/sdk/python)。

## GitHub 配置

在 **qujsh/freeligo** 仓库 Settings → Secrets and variables → Actions 配置，B 端仓库的 Secrets 不会自动共享。

Repository secrets：

| 名称 | 内容 |
| --- | --- |
| `QINIU_ACCESS_KEY` | C 端发布使用的 AccessKey |
| `QINIU_SECRET_KEY` | 对应 SecretKey |

Repository variables：

| 名称 | 示例/要求 |
| --- | --- |
| `QINIU_WEB_BUCKET` | `freeligo-c-web`，独立公开空间 |
| `QINIU_WEB_ORIGIN` | `https://www.example.com`，C 端域名，不附加路径 |
| `VITE_API_BASE_URL` | `https://api.example.com`，不附加 `/api` |
| `QINIU_SPA_FALLBACK_READY` | 完成页面回退和缓存配置后填写 `true` |

无需配置 SSH Key/ECS 地址，也没有 `VITE_MCP_PUBLIC_URL`。`VITE_DATA_SOURCE` 在工作流固定为 `api`。所有 `VITE_` 变量会公开进入浏览器构建产物，不能存放秘密。空间地域由七牛 SDK 查询。

## 发布和恢复

1. 将最新页面及本部署脚本合入 **main**。当前业务开发在 `release-0.0.2`，发布 main 不会自动包含尚未合并的开发分支页面。
2. Actions → **Deploy C frontend to Qiniu** → Run workflow → main。正常发布时 `restore_sha` 留空。
3. 等待工作流结束，查看 Summary 的阶段、提交 SHA、成功/失败状态和站点链接。其他分支运行时会跳过部署 job。

流程：配置校验 → 脚本测试 → npm ci → 类型检查/lint/前端测试 → 生产构建 → 上传版本资源 → 校验公开文件 → 更新根入口 → 刷新 CDN → 验证首页与深层路径。前端检查与 `npm run check` 相同，展开命令用于传入版本 base；Vitest 单 worker，不跳过测试。npm 依赖与 SDK 依赖均固定，七牛 Secrets 仅注入上传步骤。

```text
index.html                          # 当前入口，最后上传
releases/<完整40位SHA>/index.html    # 保留的版本入口
releases/<完整40位SHA>/assets/...    # JS/CSS/动态加载资源
releases/<完整40位SHA>/images/...    # public 图片，随版本保留
releases/<完整40位SHA>/favicon.svg
```

构建使用 `--base=/releases/<SHA>/`；本地图片引用通过 `publicAssetUrl` 适配构建前缀，包括动态笔记图片路径。页面路由仍为 `/`、`/opportunities` 等站点路径，不添加版本目录。业务 API 返回的图片地址保持由 API 管理，不做路径改写。

同一 SHA 的已有文件仅在内容一致时复用，内容不同会拒绝覆盖；修改 API 等构建变量后应创建新提交。旧版本不自动删除。

失败处理：

- 检查/构建失败：不上传。
- 资源上传或版本资源公网验证失败：不切换根入口，可能留下部分版本文件。
- 根入口上传超时、CDN 刷新/入口验证失败：入口可能已经变化，Actions 标红并提示人工核对；不会自动宣称旧版正常或自动回滚。
- 成功表示版本入口和直接 JS/CSS 内容正确，`/`、`/index.html`、`/opportunities`、`/favorites` 都返回新入口。刷新受理后最多约 3 分钟验证当前访问到的 CDN 节点，不证明全球全部节点同步，也不证明真实 API/登录业务可用。
- 强制终止可能来不及写报告，应人工核对站点。

恢复：重新运行 main 的工作流，在 `restore_sha` 填写**曾成功发布的完整 40 位提交 SHA**。读取保留的入口、验证直接资源后更新根入口并刷新，不重新构建、不覆盖历史图片。历史版本仍使用当时构建的 API 地址。只上传了一半的版本不能作为可用恢复点。

## 本地验证（不上传）

```bash
python3 -m unittest discover -s deploy/web/tests -v
npm run check
```

上线后另行验收真实七牛回退/缓存、Cookie/CORS、当前后端协议，以及桌面和手机的真实业务流程。不要把静态发布绿灯当作业务验收通过。

本次本地验证：类型检查、lint（0 错误，16 条既有格式警告）、15 项前端测试、10 项发布脚本测试和版本目录生产构建通过；用真实浏览器在 1440×900、390×844 验证首页 16 张图片的版本路径、笔记阅读图片和 `/opportunities` 刷新。API 使用模拟的 401 响应，不调用真实后端；对应网络错误为预期，不代表真实业务可用。静态回退由本地预览模拟，七牛实际回退仍需上线后验收。另使用实际构建产物完成 48 个对象的内存发布演练，没有云端上传。
