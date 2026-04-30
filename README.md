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
