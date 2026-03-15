# 益成金屬 DICAS — 工廠儀表板

Netlify 部署版，即時連接 Notion 資料庫。

## 架構

```
瀏覽器 → Netlify (index.html)
              ↓
         Netlify Functions (notion-proxy.js)
              ↓
         Notion API (讀取 15 張資料庫)
```

- 前端：純 HTML/CSS/JS，Apple 風格 UI
- 後端：Netlify Functions (serverless)，代理 Notion API
- 密碼保護：前端輸入密碼 → 透過 header 傳給 serverless function 驗證
- Notion API Key 安全存在 Netlify 環境變數，前端看不到

## 部署步驟

### 1. 推到 GitHub

```bash
cd yc-dashboard
git init
git add .
git commit -m "初始版本"
git remote add origin https://github.com/你的帳號/yc-dashboard.git
git push -u origin main
```

### 2. 連接 Netlify

1. 登入 [Netlify](https://app.netlify.com)
2. New site from Git → 選你的 repo
3. Build settings 不用改（netlify.toml 會處理）
4. Deploy

### 3. 設定環境變數

在 Netlify → Site settings → Environment variables 新增：

| Key | Value | 說明 |
|-----|-------|------|
| `NOTION_API_KEY` | `ntn_xxxxx` | Notion Integration Token |
| `DASHBOARD_PASSWORD` | 你要設定的密碼 | 儀表板登入密碼 |

### 4. 設定 Notion 資料庫 ID

打開 `src/index.html`，找到 `DB_IDS` 區塊，填入每張資料庫的 ID：

```javascript
const DB_IDS = {
  brands:             'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  product_lines:      'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  products:           'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  parts_master:       'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  // ... 以此類推
};
```

取得 Database ID 的方法：
- 打開 Notion 資料庫
- 複製網址 → `notion.so/` 後面那段 32 字元就是 ID
- 例如：`https://notion.so/abc123def456...?v=xxx` → ID 是 `abc123def456...`

### 5. 確認 Notion Integration 權限

- 到 [Notion Integrations](https://www.notion.so/my-integrations) 確認你的 Integration 有權限
- 每張資料庫都要手動「Connect to → 你的 Integration」

### 6. 重新部署

設定完環境變數和 DB_IDS 後，push 到 GitHub，Netlify 會自動重新部署。

## 本地開發

```bash
npm install
npx netlify dev
```

需要在根目錄建 `.env` 檔案：
```
NOTION_API_KEY=ntn_xxxxx
DASHBOARD_PASSWORD=你的密碼
```

## 檔案結構

```
yc-dashboard/
├── netlify.toml          # Netlify 設定
├── package.json          # 依賴（@notionhq/client）
├── netlify/
│   └── functions/
│       └── notion-proxy.js   # Serverless function，代理 Notion API
├── src/
│   └── index.html        # 儀表板主頁（含密碼閘門 + 渲染邏輯）
└── README.md
```

## 安全性

- Notion API Key 只存在 Netlify 環境變數，前端看不到
- 每次 API 請求都需要帶密碼 header，由 serverless function 驗證
- 密碼存在 sessionStorage，關閉瀏覽器就清除
- 建議設定一個足夠複雜的密碼

## 更新資料

儀表板每次打開或按「重新整理」時，會即時從 Notion 拉最新資料。
不需要手動更新任何靜態文件。
