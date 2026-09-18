# 商城图片加载

配合 `shopify-admin` 的 `/uploads/<filename>?w=...` WebP 缩略图服务使用。先部署后台图片服务，再部署商城。

- 商品卡默认 640 px；库存、订单、结算及颜色/图库小图 160 px；首页横幅和详情大图 1600 px。
- 商品图片从已知旧图片域名映射到 `https://admin.gingtto.store/uploads/`。可以在构建时通过 `VITE_IMAGE_BASE_URL` 配置其他后台图片服务，需支持相同接口。
- 保留懒加载，异步解码，缩略图加载失败回退原始 URL；不改变数据库中的图片链接。
- 外部图片、带签名参数的链接、PDF、GIF、blob/data URL 保持不变。原图仍可由原 URL 访问。
- Cloudflare 自定义缓存键需保留查询参数 `w`。

```sh
cd frontend
node --test imageUrl.test.js
npm run build
```

本地浏览器已验证实际 LazyImage 组件的尺寸选择、离屏延迟加载、图片切换和失败回退；服务端并发、缓存与原图保留测试位于后台仓库。不涉及生产数据库写入。
