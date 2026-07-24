# 🔎 Scout

Scout is an autonomous AI-powered research agent that transforms user questions into structured, source-backed research reports.

Instead of simply answering prompts, Scout plans research, determines whether additional external information is required, searches and reads relevant sources, and generates a comprehensive report.

With conversation memory, Scout can also understand follow-up questions and retrieve relevant information from previously generated reports.

---

## ✨ Features

### 🧠 Autonomous Research Pipeline

Scout uses a multi-stage research pipeline:

User Question
→ Memory Retrieval
→ Research Planning
→ Web Search (if required)
→ Source Reading
→ Report Generation
→ Memory Storage

The planner determines whether the existing conversation context is sufficient to answer the question. If additional information is required, Scout automatically performs external research before generating the report.

---

### 💬 Conversation-Based Research

Every question asked in Scout represents a new research request.

Each conversation contains a sequence of:

- User questions
- AI-generated research reports

A generated report acts as the assistant's response within the conversation, allowing users to continue researching a topic naturally through follow-up questions.

---

### 🧠 Semantic Conversation Memory

Scout uses embeddings and PostgreSQL with pgvector to provide long-term semantic memory.

After generating a report:

1. The report is split into semantic text chunks.
2. Chunks are converted into vector embeddings.
3. Embeddings are stored using pgvector.
4. Future questions are embedded and compared against previous report chunks.
5. The most relevant context is retrieved and provided to the research planner.

This allows Scout to understand questions such as:

> "What were the major risks you mentioned earlier?"

without unnecessarily repeating the entire research process.

---

### 🔍 Intelligent Research Decisions

Before performing external research, Scout considers:

- The current user question
- Relevant information retrieved from previous reports
- Existing conversation context

If the available information is sufficient, Scout generates the report directly.

If additional information is required, the planner generates research sub-questions and triggers the web research pipeline.

This reduces unnecessary searches while maintaining research quality.

---

### 🌐 Web Research

When external information is required, Scout:

1. Breaks complex questions into focused sub-questions.
2. Searches the web for relevant sources.
3. Deduplicates search results.
4. Extracts and processes useful webpage content.
5. Provides the gathered context to the report writer.

---

### 📡 Real-Time Streaming

Scout uses Server-Sent Events (SSE) to stream research progress and generated content to the frontend.

Users can see stages such as:

- Planning research
- Searching the web
- Reading sources
- Writing the report

The generated report is streamed as it is produced.

---

### 👤 Authentication & Guest Support

Scout supports both authenticated and guest research sessions.

Authenticated users can maintain persistent conversations associated with their accounts.

Guest sessions can be identified using temporary session identifiers, allowing the conversation architecture to support anonymous usage without requiring authentication.

---

### 📊 Observability & Cost Tracking

Scout tracks information about AI operations, including:

- Token usage
- Estimated model cost
- Tool invocations
- Research execution
- Memory usage

This provides visibility into the behavior and operational cost of the research pipeline.

---

## 🏗️ Architecture

The core Scout pipeline:

User Question
      ↓
Retrieve Relevant Memory
      ↓
Research Planner
      ↓
Is Existing Context Sufficient?
      │
      ├── Yes ──────────────→ Report Writer
      │
      └── No
           ↓
      Generate Sub-Questions
           ↓
        Web Search
           ↓
       Source Reader
           ↓
       Report Writer
           ↓
     Generated Report
           ↓
     Save to Conversation
           ↓
       Chunk Report
           ↓
     Generate Embeddings
           ↓
      Store in pgvector

The V2 memory system was designed as a layer around the original Scout research pipeline, allowing the existing planner, searcher, reader, and writer architecture to remain intact.

---

## 🛠️ Tech Stack

### Backend

- TypeScript
- Node.js
- Express.js
- PostgreSQL
- pgvector
- Drizzle ORM

### AI

- Vercel AI SDK
- Google Gemini
- Gemini Embeddings

### Architecture

- Autonomous research pipeline
- Retrieval-Augmented Generation (RAG)
- Vector similarity search
- Semantic conversation memory
- Server-Sent Events (SSE)

### Infrastructure

- Docker
- PostgreSQL + pgvector
- Vercel
- Render

---

## 🗃️ Core Data Model

### Conversations

Stores individual research conversations and their ownership.

A conversation can belong to:

- An authenticated user
- A temporary guest session

### Reports

Each user question creates a report request.

Reports store research-specific information such as:

- Question
- Generated report
- Research status
- Sub-questions
- Citations
- Token usage
- Cost
- Memory usage

### Memory Chunks

Generated reports are divided into chunks and embedded for semantic retrieval.

Each chunk contains:

- Original content
- Vector embedding
- Conversation ID
- Source type
- Source ID
- Token count

This allows relevant sections of previous reports to be retrieved for future questions.

---

## 🚀 V2 — Conversation Memory

Scout V2 introduces persistent conversation-based research and semantic memory.

### Added

- Conversation-based research sessions
- Follow-up question support
- Semantic report retrieval
- Vector embeddings with pgvector
- Report chunking with overlap
- Cosine similarity search
- Context-aware research planning
- Guest conversation architecture
- Conversation ownership handling
- Cascading conversation cleanup

### V2 Research Flow

Question
→ Retrieve Previous Relevant Reports
→ Run Scout Research Pipeline
→ Generate Report
→ Save Report to Conversation
→ Embed Report
→ Use as Memory for Future Questions

The core design principle remains simple:

> Every user question is a research request, and every generated report is the assistant's response within that conversation.

---

## 🔮 Future Improvements

- Persistent anonymous conversation history across browser sessions
- Automatic migration of guest conversations after signup
- Cross-conversation semantic search
- Improved conversation summarization
- Advanced memory ranking
- Hybrid keyword + vector retrieval
- Source credibility scoring
- Improved research observability

---

## 📌 Project Status

Scout is under active development.

V1 established the autonomous research pipeline.

V2 extends the existing architecture with conversation-based research and semantic memory without replacing the original research pipeline.

## 🌐 Live Demo

**Try Scout:** https://scout-archit26.vercel.app/dashboard

## 📸 Screenshots

<img width="1857" height="977" alt="image" src="https://github.com/user-attachments/assets/8426580a-d937-4400-9309-5c0632d098df" />

## 👨‍💻 Author

Built from scratch as a project to explore and understand AI agents, LLM orchestration, web research pipelines, streaming, authentication, databases, and full-stack AI application development.

---

⭐ If you find Scout useful or interesting, consider giving the repository a star!
