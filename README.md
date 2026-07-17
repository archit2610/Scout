# 🔎 Scout — AI Research Agent

Scout is an AI-powered research agent built to deliver efficient, well-structured, and context-aware responses.

Instead of sending every question through the same pipeline, Scout first plans how to approach a query and determines whether external information is required. When necessary, it searches the web, reads relevant sources, extracts useful context, and uses that information to generate a comprehensive response.

Scout is built using the Vercel AI SDK with Google's Gemini models and has a full-stack architecture with authentication, persistent report storage, and an appealing user interface.

> 🚀 Scout V1 is live and actively being improved.

## ✨ Features

### 🧠 Intelligent Research Pipeline

Scout uses a multi-stage research pipeline:

1. **Planner** — Analyzes the user's question, determines whether external information is required, and breaks complex queries into searchable sub-questions.
2. **Searcher** — If external information is required, Scout searches the web for relevant sources for each sub-question.
3. **Reader** — Fetches and processes the discovered webpages, extracting useful information and building relevant context.
4. **Writer** — Combines the original question with the gathered context to generate and stream a structured final response.

If the Planner determines that external information is not required, Scout skips the Searcher and Reader stages and directly generates the response.

```text
                         ┌──────────────┐
                         │  User Query  │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │   Planner    │
                         └──────┬───────┘
                                │
                    External context required?
                         /              \
                       Yes               No
                        │                 │
                        ▼                 │
                  ┌──────────┐            │
                  │ Searcher │            │
                  └────┬─────┘            │
                       │                  │
                       ▼                  │
                  ┌──────────┐            │
                  │  Reader  │            │
                  └────┬─────┘            │
                       │                  │
                       └────────┬─────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │    Writer    │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ Final Report │
                         └──────────────┘
```

### 🌐 Web Research

Scout automatically determines when a question requires external information.

When research is required, it:

- Generates relevant sub-questions
- Searches the internet for relevant sources
- Removes duplicate results
- Reads and extracts useful webpage content
- Builds context for the final response

This allows Scout to provide research-backed answers while avoiding unnecessary web searches for questions that can be answered directly.

### ⚡ Streaming Responses

Reports are streamed to the frontend as they are generated, allowing users to see the response in real time instead of waiting for the entire generation process to finish.

### 👤 Authentication

Scout includes an authentication system with:

- User registration
- Login and logout
- Email verification
- Access and refresh tokens
- Automatic access-token refresh
- Forgot/reset password functionality
- Cookie-based authentication

### 👻 Anonymous Research

Users don't need to create an account just to try Scout.

Anonymous users can ask questions and run the research pipeline without authentication.

Logged-in users get additional functionality, including persistent report storage.

### 📚 Saved Reports

Authenticated users can save their generated research reports and access them later.

Scout can store report information including:

- Original question
- Generated sub-questions
- Final report
- Research status
- Token usage
- Estimated cost

### 🗄️ Database

Scout uses PostgreSQL with a structured database architecture for storing application data.

The database currently includes schemas for:

- Users
- Reports
- Tool calls / observability
- Application settings

The database layer is managed using Drizzle ORM.

### 🛡️ Production Safeguards

Scout includes safeguards designed to keep the research pipeline controlled and reliable:

- Maximum sub-question limits
- Search result limits
- Context-size guards
- Request timeouts
- LLM usage tracking
- Error handling

## 🛠️ Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React Markdown

### Backend

- Node.js
- Express
- TypeScript
- Vercel AI SDK
- Google Gemini
- Server-Sent Events (SSE)

### Database

- PostgreSQL
- Drizzle ORM

### Research

- Web search integration
- Custom webpage extraction and reading pipeline

### Deployment

- Frontend deployed on Vercel
- Backend deployed on Render
- Cloud-hosted PostgreSQL database

## 🏗️ Architecture

```text
React Frontend
      │
      │ REST API / SSE
      ▼
Express + TypeScript Backend
      │
      ├── Authentication
      │
      ├── Reports
      │
      └── AI Research Agent
                │
                ├── Planner
                ├── Searcher
                ├── Reader
                └── Writer
                      │
                      ▼
                 Google Gemini

Backend
   │
   ▼
PostgreSQL
```

## 🚀 Scout V1

Scout V1 establishes the foundation for a more capable research agent.

The current version focuses on:

- Intelligent query planning
- Conditional web research
- Automated source reading
- Structured report generation
- Real-time streaming
- User authentication
- Persistent report storage
- Anonymous usage

## 🔮 Future Plans

Some ideas being explored for future versions include:

- Follow-up questions
- Conversational research sessions
- Embeddings and semantic search
- Retrieval from previous research
- Improved source citations
- Better research memory
- More advanced agent workflows
- Additional model support

## 🌐 Live Demo

**Try Scout:** https://scout-archit26.vercel.app/dashboard

## 📸 Screenshots

<img width="1767" height="943" alt="image" src="https://github.com/user-attachments/assets/cc75e487-7dc2-48d0-8385-5fbcb8d3d231" />


## 👨‍💻 Author

Built from scratch as a project to explore and understand AI agents, LLM orchestration, web research pipelines, streaming, authentication, databases, and full-stack AI application development.

---

⭐ If you find Scout useful or interesting, consider giving the repository a star!
