# 健保支付標準查詢系統 (JianBaoSearch)

即時查詢衛生福利部中央健康保險署「全民健康保險醫療服務給付項目及支付標準」，支援**自動每日同步最新健保署開放資料**，並可免費部署至 **GitHub Pages**、**Cloudflare Pages** 或 **Vercel**。

## 主要功能

- **多關鍵字即時搜尋**：支援同時搜尋診療項目代碼、中文項目名稱、英文項目名稱及備註（多關鍵字以空格分隔，例如：`超音波 腹部`）。
- **表別與層級篩選**：快速切換 `C 含基層診所`、`B 醫院`、`A 醫學中心/區域`、`P 專案計畫` 及其他類別。
- **生效狀態與排序**：自動比對今日日期區分「現行有效」與「非現行」項目，支援依相關度、代碼、點數高低或最新生效日排序。
- **詳細規範檢視**：點擊任一項目開啟側邊抽屜，完整呈現健保支付點數、生效起迄日、表別說明與自動分行的備註規範，並支援一鍵複製代碼或完整資訊。
- **常用收藏與 CSV 匯出**：支援將常用代碼加入「★ 常用收藏」（儲存於瀏覽器本機），並可隨時將篩選結果匯出為 UTF-8 CSV 檔案。

## 自動更新機制

- **資料來源**：[政府資料開放平臺－醫療服務給付項目及支付標準 (174450)](https://data.gov.tw/dataset/174450)
- **更新腳本**：[`scripts/update_data.py`](scripts/update_data.py)
- **排程工作流程**：[`.github/workflows/update-nhi-data.yml`](.github/workflows/update-nhi-data.yml)
  - 每日台灣時間 `09:00`（UTC `01:00`）自動執行檢查，若有異動便自動更新 `data/fee-schedule.json` 與 `data/meta.json` 並提交至 GitHub。
  - 亦可隨時於 GitHub Repository 的 **Actions → Auto Update NHI Fee Schedule → Run workflow** 手動觸發更新。

## 免費部署方式

本專案為純靜態網頁（無須建置指令），以下平台皆提供免費方案：

- **Cloudflare Pages**：連結此 GitHub Repo，Build command 留空，Build output directory 設為 `/`（根目錄）。每次 GitHub Actions 自動更新資料後會自動重新部署。
- **Vercel**：匯入此 GitHub Repo，Framework Preset 選 `Other`，不需設定 Build Command，直接部署即可。
- **GitHub Pages**：於 Repo 的 **Settings → Pages** 選擇 `Deploy from a branch`（`main` / `/ (root)`）。
