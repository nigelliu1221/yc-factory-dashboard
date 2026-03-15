// netlify/functions/notion-proxy.js
// 
// 這支 serverless function 的作用：
// 1. 前端打這支 API，不直接碰 Notion
// 2. Notion API key 安全存在 Netlify 環境變數裡
// 3. 支援查詢任何 Notion 資料庫
//
// Netlify 環境變數需設定：
//   NOTION_API_KEY = 你的 Notion Integration Token
//   DASHBOARD_PASSWORD = 儀表板密碼

const { Client } = require("@notionhq/client");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Dashboard-Auth",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // 密碼驗證
  const authHeader = event.headers["x-dashboard-auth"];
  const correctPassword = process.env.DASHBOARD_PASSWORD;
  if (!authHeader || authHeader !== correctPassword) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  // 初始化 Notion client
  const notion = new Client({ auth: process.env.NOTION_API_KEY });

  try {
    const body = JSON.parse(event.body);
    const { action, database_id, filter, sorts, page_size, start_cursor } = body;

    let result;

    switch (action) {
      // 查詢資料庫
      case "query": {
        const params = { database_id };
        if (filter) params.filter = filter;
        if (sorts) params.sorts = sorts;
        if (page_size) params.page_size = page_size;
        if (start_cursor) params.start_cursor = start_cursor;
        result = await notion.databases.query(params);
        break;
      }

      // 取得資料庫結構
      case "retrieve_database": {
        result = await notion.databases.retrieve({ database_id });
        break;
      }

      // 取得單筆 page
      case "retrieve_page": {
        result = await notion.pages.retrieve({ page_id: body.page_id });
        break;
      }

      // 批次查詢多張資料庫（儀表板首次載入用）
      case "dashboard_load": {
        const db_ids = body.database_ids; // { brands: "xxx", parts: "xxx", ... }
        const results = {};

        for (const [key, dbId] of Object.entries(db_ids)) {
          try {
            const queryParams = { database_id: dbId, page_size: 100 };
            // 特定資料庫加上排序
            if (key === "station_progress") {
              queryParams.sorts = [{ property: "completed_at", direction: "descending" }];
            }
            if (key === "outsource_tracking") {
              queryParams.sorts = [{ property: "sent_date", direction: "descending" }];
            }
            if (key === "issues") {
              queryParams.sorts = [{ property: "created_at", direction: "descending" }];
            }
            if (key === "inventory_log") {
              queryParams.sorts = [{ property: "date", direction: "descending" }];
              queryParams.page_size = 50; // 只拉最近 50 筆
            }
            results[key] = await notion.databases.query(queryParams);
          } catch (err) {
            results[key] = { error: err.message };
          }
        }

        result = results;
        break;
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Unknown action: ${action}` }),
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Notion API error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
