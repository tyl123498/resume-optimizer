# 📄 AI 简历优化 SaaS (MVP)

> 一份专为求职者设计的本地 AI 工具，帮你精准匹配职位描述，让简历脱颖而出。

---

## 1. 项目简介

**AI 简历优化 SaaS** 是一款全栈 AI 应用，旨在解决求职者"简历与岗位不匹配"的核心痛点。

- **核心功能**：上传母版简历 → 粘贴目标职位描述 (JD) → AI 自动分析匹配度 → 一键生成优化版简历 → 导出 PDF。
- **技术亮点**：全本地运行（数据不外传），支持 Docker 一键部署，兼容 Windows / macOS / Linux。
- **LLM 双模式**：本地 Ollama 或云端 API（DeepSeek / 硅基流动 / OpenAI），一键切换。

---

## 2. 环境要求

| 依赖项 | 版本要求 | 安装验证命令 |
|--------|---------|-------------|
| **Node.js** | >= 20.x | `node -v` |
| **pnpm** | >= 8.x | `pnpm -v` |
| **Python** | >= 3.10 | `python --version` |
| **Ollama**（可选）| 最新版 | `ollama --version` |
| **Docker**（可选）| 最新版 | `docker --version` |

---

## 3. 快速启动

### 方式 A：Docker 一键启动

```bash
docker compose up -d --build
docker compose exec ollama ollama pull qwen2.5:7b
docker compose exec ollama ollama pull nomic-embed-text
# 访问 http://localhost:3000
```

### 方式 B：本地开发

```bash
# 终端 1：Ollama
ollama serve

# 终端 2：后端
cd backend && python -m venv venv && pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 终端 3：前端
cd frontend && pnpm install && pnpm dev
# 访问 http://localhost:3000
```

### 方式 C：切换云端 API（部署优先）

设置环境变量后启动后端，无需 Ollama：

```bash
set LLM_PROVIDER=openai
set OPENAI_API_KEY=sk-your-key
set OPENAI_BASE_URL=https://api.deepseek.com/v1
uvicorn main:app --reload --port 8000
```

---

## 4. 功能使用指南

### 注册 / 登录
打开首页，点击 Register 创建账号（邮箱 + 密码）。

### 创建简历
在仪表盘点击"新建简历"，填写标题和 Markdown 内容。可点击"使用模板"快速填充。

### JD 匹配分析（核心功能）
1. 进入 **Analyze** 页面，选择简历
2. 粘贴职位描述 (JD)
3. 点击"分析"，等待 5-15 秒
4. 查看匹配分数、缺失关键词和改进建议
5. 分析结果自动保存到历史记录

### 生成优化简历
1. 进入 **Generate** 页面，选择简历 + 粘贴 JD
2. 点击生成，AI 输出优化版 Markdown 简历
3. 可手动编辑微调
4. 点击"Export as PDF"使用浏览器打印功能导出

### 查看历史记录
仪表盘点击 **Analysis History**，或在任意页面点击 History 链接，查看所有过往分析记录。

---

## 5. 生产部署

### 架构

| 服务 | 平台 | 说明 |
|------|------|------|
| 前端 (Next.js) | **Vercel** | 免费额度，自动 HTTPS |
| 后端 (FastAPI) | **Railway** | 免费额度，持久化存储 |
| LLM | **DeepSeek API** | 云端推理，无需 GPU |

### 第一步：推送代码到 GitHub

```bash
git remote add origin https://github.com/你的用户名/resume-optimizer.git
git push -u origin main
```

### 第二步：部署后端到 Railway

1. 登录 [Railway](https://railway.app/)，导入 GitHub 仓库
2. 设置 Root Directory 为 `backend`
3. 添加环境变量：`LLM_PROVIDER=openai`、`OPENAI_API_KEY`、`OPENAI_BASE_URL`
4. 创建 Volume 挂载到 `/data`（持久化 SQLite）
5. 部署后获取域名，如 `https://resume-backend.up.railway.app`

### 第三步：部署前端到 Vercel

1. 登录 [Vercel](https://vercel.com/)，导入 GitHub 仓库
2. 设置 Root Directory 为 `frontend`
3. 添加环境变量：`NEXT_PUBLIC_API_URL` = Railway 后端域名
4. 部署

### 数据持久化说明

> **重要**：Vercel 的 Serverless 函数使用临时文件系统，前端 SQLite 数据不会持久保存。建议将数据操作迁移到后端 API（后端 Railway 挂载了持久化 Volume）。如需完全持久化，可将前端也部署到 Railway。

---

## 6. 配置与个性化

### 更换 AI 模型

| 服务 | Base URL | 推荐模型 | 成本 |
|------|----------|---------|------|
| Ollama（本地）| `http://localhost:11434` | `qwen2.5:7b` | 免费 |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | ~0.001 元/次 |
| 硅基流动 | `https://api.siliconflow.cn/v1` | `Qwen/Qwen2.5-7B-Instruct` | 免费额度 |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` | ~$0.002/次 |

### 目录结构

```
resume-optimizer/
├── frontend/           # Next.js 前端
│   ├── src/app/        # 页面路由
│   ├── src/lib/db.ts   # SQLite 数据层（better-sqlite3）
│   ├── data/           # 数据持久化目录
│   └── Dockerfile
├── backend/            # FastAPI 后端
│   ├── main.py         # API 入口
│   ├── chains.py       # LangChain 分析/生成链（双 LLM 模式）
│   └── Dockerfile
├── docker-compose.yml  # 三服务编排
└── README.md
```

---

## 7. 常见问题

| 问题 | 解决 |
|------|------|
| 分析/生成超时 | 检查 Ollama 是否运行，或切换到云端 API |
| Docker 端口被占 | 修改 docker-compose.yml 中 ports 左侧值 |
| SQLite 编译失败 | 安装 Visual Studio Build Tools（Windows） |
| Vercel 数据不持久 | 将前端也部署到 Railway，或使用 Vercel Postgres |

---

## 8. 免责声明

- 仅限个人学习与求职辅助，不构成任何录用承诺。
- 所有数据默认存储在本地，不会主动上传至第三方云端。
- 请遵守目标网站的 robots.txt 协议。

## 🚀 Railway 一键部署
### 后端 FastAPI
[![Deploy Backend on Railway](https://railway.app/button.svg)](https://railway.app/new/template?repo=https://github.com/tyl123498/resume-optimizer&branch=master&rootDir=backend)

### 前端 Next.js
[![Deploy Frontend on Railway](https://railway.app/button.svg)](https://railway.app/new/template?repo=https://github.com/tyl123498/resume-optimizer&branch=master&rootDir=frontend)