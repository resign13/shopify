# Storefront Project

目录结构：
- frontend：前台商城 Vue 3 项目
- storefront-backend：前台商城 Flask 后端

项目归属：
- 商城会话数据：storefront-backend\data
- 商城后端依赖：storefront-backend\_vendor
- 商城后端通过接口连接后台后端，不再使用 shared-data

环境变量：
- LUMIERE_ADMIN_API_BASE_URL=http://127.0.0.1:5002
- LUMIERE_SERVICE_TOKEN=lumiere-service-token

启动：
1. cd storefront-backend
2. python app.py
3. cd ..\frontend
4. npm install
5. npm run dev

## GitHub 自动部署

推送 `main` 或手动运行 `.github/workflows/deploy.yml` 会在 GitHub runner
使用 Node.js 22 构建前端，然后上传代码包到服务器并重启 `smawell-store-api`。
生产目录为 `/opt/smawell/shopify`，采用 Nginx、systemd 和 PostgreSQL。

仓库 Secrets：`DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_PASSWORD`、
`DEPLOY_KNOWN_HOSTS`（已核验的 SSH 主机公钥）。当前部署主机为 `47.82.147.236`。

部署包排除 `.env`、虚拟环境、上传目录和运行数据。服务器需预先具备
Python 虚拟环境、rsync、生产配置和对应 systemd 服务。
每次部署会备份代码、配置及数据库到 `/opt/smawell/backups/actions-*`，
并通过共享锁串行执行商城和后台更新。部署失败恢复代码并重启服务，
数据库新增字段保留，不自动恢复数据库备份以免覆盖新业务数据。
前端构建失败时不会修改服务器。
