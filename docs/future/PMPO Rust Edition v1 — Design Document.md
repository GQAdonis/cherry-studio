# **PMPO Rust Edition v1 — Design Document**







## **1. Overview & Goals**







### **1.1 Purpose**





The purpose of PMPO (Prometheus Meta-Prompting Orchestrator) Rust Edition is to provide a robust, production-grade orchestration layer for agents in the Prometheus AI ecosystem that:



- Speaks the standard Model Context Protocol (MCP) to expose tools, data sources, and prompts as a server. 
- Can also act as a client to consume other MCP servers — enabling chaining, federation or composition of toolsets and data sources.
- Implements additional protocols for inter-agent communication and coordination: e.g. Agent-to-Agent Protocol (A2A) and Agent Communication Protocol (ACP) — to support multi-agent workflows, collaboration, and UI / orchestration layers. 
- Provides a production-ready Rust crate (library) for embedding in Rust-based agents/services, and a standalone daemon/service binary to act as an orchestration hub.
- Integrates with the rest of the Prometheus platform stack (databases, storage, vector DB, IPFS, RAG, etc.) — enabling agents built on Prometheus to uniformly leverage shared infrastructure via MCP / A2A / ACP.







### **1.2 Strategic Motivation**





- **Standardization & Interoperability** — By adopting MCP (and additional protocols), agents built on Prometheus remain interoperable with the broader AI ecosystem, reducing bespoke tooling and increasing compatibility.
- **Modularity and Composability** — PMPO becomes a “plug-and-play” core service: any tool, data source, or external system can be exposed easily; agents can consume arbitrary external MCP servers; different agents/services can coordinate via A2A/ACP.
- **Consistency across environments** — Since Rust can compile to diverse targets (cloud, local, embedded), PMPO Rust Edition ensures that orchestration infrastructure works across servers, desktops, embedded devices, mobile, etc.
- **Security, Governance, and Maintainability** — Centralizing orchestration and protocol-handling in a well-tested, audited Rust core helps enforce consistent ACLs, logging, tool-authorization, and reduces risk compared to many ad-hoc integrations.
- **Platform Integration** — Tight coupling with Prometheus’s existing data layers (Postgres/pglite, SurrealDB, IPFS, vector DB, RAG pipelines) makes PMPO the natural “agent gateway” for all internal and external services.





------





## **2. Background & Related Protocols**







### **2.1 Model Context Protocol (MCP)**





- MCP is an open standard (launched Nov 2024) to provide a universal interface for AI systems (LLMs / agents) to access external tools, data sources, and services. 
- Architecture: an MCP Client (embedded in the agent host) communicates with one or more MCP Servers (tool/data providers) over JSON-RPC 2.0. 
- Servers expose capabilities as “Tools,” “Resources,” or “Prompts.” Clients discover available servers, then dynamically call tools / request resources as needed. 
- Widely adopted by the AI agent ecosystem; many languages have SDKs; ecosystems are forming around shared MCP tooling. 





Thus MCP is the baseline protocol for external integration; PMPO must fully support it.





### **2.2 Multi-Agent Protocols: A2A, ACP, AG-UI**





- Beyond MCP, multi-agent systems often require protocols for inter-agent communication (not just agent ↔ tool/data). The A2A protocol enables agent-to-agent messaging, peer collaboration, task delegation, and orchestration flows across agents. 
- The ACP protocol provides a standardized communication and coordination channel among agents — suitable for sharing contextual data, citations, execution status, multimodal data, streaming results, and more. 
- AG-UI refers to a protocol (or set of conventions) for agent–user interaction via a UI layer; for example: updating UI in real time, displaying agent status/progress, showing tool usage, enabling agent control, etc. In multi-agent ecosystems, UI protocols complement underlying comms so humans can meaningfully supervise or observe. 





By implementing A2A + ACP + AG-UI in PMPO, you enable not just tool access, but full workflow orchestration, agent collaboration, and user monitoring — crucial for complex enterprise-grade AI apps.





### **2.3 AI Agent Orchestration — Why It Matters**





- As per standard definitions, agent orchestration coordinates multiple specialized agents to solve complex tasks, manage workflows, and delegate responsibilities. 
- Orchestration patterns (e.g., sequential, concurrent, hierarchical, handoff, group-chat, maker-checker loops) allow structuring workflows to optimize for specialization, scalability, maintainability and performance. 
- A robust orchestrator (such as PMPO) becomes the backbone of a multi-agent system, offering dynamic routing, resource sharing, tool invocation, coordination — leading to powerful agent ecosystems capable of large, multi-step, multimodal tasks.





Thus embedding orchestration protocols is not optional for a mature agent platform; it is essential for scaling beyond simple single-agent usage.



------





## **3. Architecture — Components & Responsibilities**





Below is a high-level architecture for PMPO Rust Edition v1.

```
+-------------------+
|   Agent Host(s)   |   <-- agents built on Prometheus (Rust or via FFI/WASM etc.)
|  (LLM Runtime,    |        • Could embed PMPO client
|   Prompt Engine,  |        • Could embed PMPO server (tool exposure)
|   Application UI) |
+---------+---------+
          |
          | MCP / ACP / A2A over JSON-RPC / HTTP / WebSocket / SSE
          |
+---------v------------+
|  PMPO Core Library   |   (Rust crate: pmpo_core)
|  ------------------  |       • MCP Server framework
|  • Tool / Resource    |       • MCP Client library
|  registry / runtime  |       • A2A / ACP protocol handlers
|  • Request routing    |       • Agent registry & orchestration engine
|  • Authentication /   |       • Security / ACL / sandbox + logging
|    Authorization      |
+---------+------------+
          |
          | Optional: connect to underlying infrastructure
          | (database, vector DB, IPFS, file system, external APIs...)
          |
+---------v------------+
|  Back-end Systems     |   e.g. Postgres / pglite, SurrealDB, IPFS, Vector DB, etc.
+-----------------------+
```



### **3.1 Core Modules & Responsibilities**



| **Module**                                 | **Responsibility**                                           |
| ------------------------------------------ | ------------------------------------------------------------ |
| **MCP Server Module**                      | Provide a JSON-RPC 2.0 server (HTTP +/or WebSocket / SSE) that can register and expose **Tools**, **Resources**, and **Prompts** per MCP specification. Manage tool invocation, parameter validation, execution, and response serialization. |
| **MCP Client Module**                      | Allow PMPO (or embedded agents) to discover and consume other MCP servers; manage connections, send requests, receive results; handle error cases, timeouts, retries. |
| **A2A / ACP Module**                       | Implement peer-to-peer (or orchestrated) agent-to-agent communication using A2A and ACP protocols. Handle message serialization, routing, session management, authentication (optional), message tracking, streaming results, and optional multi-agent coordination logic. |
| **Agent Registry & Orchestration Engine**  | Maintain registry of active agents, their capabilities, status, and communication endpoints. Provide orchestration logic: route tasks to agents, coordinate multi-agent workflows (e.g. subtask delegation, aggregator agents, result collection), manage lifecycle of agents (spawn, retire), support concurrency, coordination patterns (sequential, parallel, handoff, maker-checker, etc.). |
| **Security & Governance Layer**            | Enforce authentication/authorization for tool access, client/server connections; implement ACLs, sandboxing (if executing external code), rate-limiting, logging, auditing of all tool calls and inter-agent messages; ensure isolation and least-privilege execution. |
| **Configuration / Deployment Module**      | Enable configuration via structured config file (YAML / JSON), allowing to declare which tools/resources are exposed, access policies, network bindings, transport protocols (HTTP/WebSocket/SSE), logging / telemetry settings, performance tuning. |
| **Optional UI / Monitoring Layer (AG-UI)** | Provide a minimal user interface (web UI or CLI/TUI) to visualize agents, tool calls, message flows, running sessions, logs, metrics — giving developers / operators real-time visibility into orchestrator behavior, agent status, tool usage, etc. |



### **3.2 Modes of Operation**





PMPO Rust Edition should support multiple deployment / usage modes:



1. **Library Mode** — as a Rust crate (pmpo_core) that can be embedded in any Rust-based agent or service. Developers can pick and choose: just client, just server, or both.
2. **Standalone Daemon / Service Mode** — compiled binary (e.g. pmpo-server) runs as a service, exposing configured tools/resources, handling MCP / ACP / A2A, orchestrating agents at runtime. Useful for deployment as a central orchestrator in cloud or self-hosted environments.
3. **Hybrid Mode** — an agent built on Prometheus embeds PMPO (client and perhaps mini-server), connecting to a central PMPO daemon, enabling internal composition and cross-agent interaction.





------





## **4. Security, Governance, and Safety Considerations**





Because PMPO will have powerful capabilities (tool execution, data access, inter-agent communication), careful attention must be paid to security and governance.





### **4.1 Threats & Risk Surface**





- Unauthorized tool or data access (sensitive DB rows, files, external APIs)
- Arbitrary code execution (if tools allow script, code, or system-level commands)
- Agent-to-agent abuse: malicious agents sending harmful prompts/data, exfiltration, or denial-of-service via overloading other agents
- Privacy / data leakage when exposing internal data sources to agents
- Auditability and traceability: need ability to trace which agent/tool made what call, for compliance or debugging







### **4.2 Mitigations & Design Safeguards**





- **Authentication & Authorization** — clients/agents must authenticate (e.g. token-based, mTLS, JWT) before using MCP or A2A/ACP; each tool/resource must declare required scopes/permissions.
- **ACL / Capability-based access control** — restrict each agent/client to only the minimal set of tools/resources needed; explicit allow-lists.
- **Sandboxing / Isolation** — if supporting arbitrary tool execution (e.g. code execution), run in isolated environment (container, process sandbox, restricted privileges).
- **Rate-limiting and quotas** — prevent abuse (e.g. runaway loops, excessive resource consumption).
- **Logging & Auditing** — every inter-agent call, tool invocation, data access should be logged with metadata (agent id, timestamp, tool id, parameters, result or error). Optionally, keep immutable audit trail for compliance.
- **Input validation & sanitization** — validate all inputs to tools/resources to prevent injection attacks, malformed requests, exploit attempts.
- **Governance configuration** — allow operators to define global policy (which agents are trusted, which resources are accessible, network restrictions).







### **4.3 Research-aware Safety (Future-proofing)**





Given rising academic and industry focus on multi-agent security, credential leakage, and adversarial agents (e.g. “Byzantine agents”), consider integrating or providing optional support for frameworks such as BlockA2A — which describes a trust framework using decentralized identifiers (DIDs), immutable audit logs, and permission revocation for secure, verifiable agent-to-agent interoperability. 



This might be especially relevant if you anticipate open / multi-tenant deployments or community/sharing models where agents from different parties interact.



------





## **5. Integration with Prometheus Platform**





Given your existing Prometheus stack (Postgres + pglite sync, SurrealDB, IPFS, vector DB, RAG, agent runtime, etc.), here is how PMPO should integrate:



- Use PMPO server to expose internal data stores (Postgres/pglite, SurrealDB, vector DB) as MCP resources or tools — e.g. “query_postgres”, “vector_search”, “ipfs_get”, “ipfs_put”, “rag_query”, etc.
- When agents need to run workflows that involve database operations, vector retrieval, storage, or IPFS operations — they simply call the appropriate MCP tool via PMPO rather than bespoke integration.
- PMPO’s orchestration engine can manage complex workflows across tools — e.g.: agent receives a user prompt → PMPO routes tool calls to DB, performs RAG, calls LLM, stores result in IPFS, updates metadata in SurrealDB, returns combined result.
- Because Prometheus supports multi-environment deployment (cloud, local, device), PMPO Rust’s cross-platform compilation ensures the orchestrator works everywhere — with same semantics.
- For embedding in agents built using your Mastra TypeScript libraries: you could provide a WASM build or FFI bridge around PMPO core, allowing TypeScript agents to call into PMPO for tool access / orchestration.





------





## **6. Roadmap / Phased Implementation Plan**





Here’s a suggested phased roadmap for delivering PMPO Rust Edition v1:

| **Phase**                                                    | **Goals**                                                    | **Deliverables / Milestones**                                |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **Phase 0: Research & Design**                               | Finalize design spec; gather requirements; align with team   | This design doc; internal review; define protocol versions (MCP, A2A, ACP), security policy; decide on configuration format; target platforms (Linux, Mac, maybe WASM) |
| **Phase 1: Minimal MCP Server + Client Prototype**           | Proof-of-concept: server exposing trivial tools, client consuming them | Rust crate skeleton; minimal tools (e.g. echo, time, maybe simple DB query stub); tests; example client + server usage |
| **Phase 2: Orchestration Engine + Tool Registry**            | Add orchestration, request routing, tool registration, lifecycle | Agent registry, tool registry, request routing logic; support for concurrent requests, tool invocation scheduling, basic logging |
| **Phase 3: A2A / ACP Protocol Support (inter-agent communication)** | Enable agent-to-agent messaging & coordination               | Implement A2A / ACP modules; define message schema, authentication for agent identities; simple peer-to-peer agent communication example |
| **Phase 4: Security & Governance Layer**                     | Add ACL, auth, sandboxing as needed, logging, rate-limiting  | Token-based or other auth; scope-based ACL; audit logging; configuration-driven access policies |
| **Phase 5: Integration with Prometheus Backend**             | Connect to real storage / data layers • expose tools for Postgres, SurrealDB, IPFS, vector DB, RAG | Build adapters for each backend; example set-up showing an end-to-end agent workflow using real data; documentation & examples |
| **Phase 6: Standalone Daemon + Deployment Infrastructure**   | Provide deployable service; config-driven; packaging; docs   | pmpo-server binary; configuration file support; logging; metrics/telemetry; deployment scripts (Docker, Kubernetes, etc.) |
| **Phase 7: Optional UI / Monitoring Layer (AG-UI)**          | Build a minimal UI to monitor agents, tool calls, logs       | Web UI or TUI that connects to PMPO daemon; shows active agents, tool usage, logs, metrics; optionally controls/terminates agents or sessions |
| **Phase 8: Documentation, SDKs / Bindings, Release**         | Publish internal documentation; provide examples; maybe WASM / language bindings | Markdown documentation; example projects; (optional) WASM build or FFI binding for TS/JS; internal release version v1.0.0 |



------





## **7. Risks & Challenges — How to Mitigate Them**



| **Risk / Challenge**                                         | **Impact**                                       | **Mitigation / Strategy**                                    |
| ------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------ |
| Protocol Complexity (MCP + A2A + ACP)                        | Implementation burden, maintenance overhead      | Start with MCP-only; add A2A/ACP after baseline stable; modular architecture so features optional |
| Security vulnerabilities (tool misuse, data leakage, malicious agents) | Data breach, malicious behavior, reputation risk | Implement strong auth/ACL, sandboxing, logging; optionally adopt advanced trust frameworks (e.g. DID-based) |
| Performance overhead (many agents, concurrent calls, heavy data operations) | Slow response, resource exhaustion               | Use Rust’s performance strengths; asynchronous design; connection pooling; rate-limiting & quotas; monitoring & metrics |
| Integration complexity with existing Prometheus stack        | Bugs, version mismatch, brittle adapters         | Build adapters incrementally; write wrapper abstractions; maintain clear separation between PMPO core and backend-specific code |
| Adoption friction for users (developers embedding PMPO)      | Low usage, fragmented ecosystem                  | Provide clear documentation, simple examples, flexible APIs (client/server/hybrid), optional layers, language bindings |



------





## **8. Minimal Example: Sample Configuration & Use Case (Pseudo-YAML + Flow)**







### **8.1 Example** 

### **pmpo-config.yaml**



```
server:
  bind_address: "0.0.0.0:8080"
  transport: http   # options: http, websocket, sse
  auth:
    type: token
    token_secret_env: "PMPO_TOKEN_SECRET"
tools:
  - id: "postgre_db_query"
    type: "database_query"
    description: "Query Postgres database"
    backend: "postgres"  # adapter
    allowed_roles: ["analytics_agent", "reporting_agent"]
  - id: "ipfs_put"
    type: "storage"
    backend: "ipfs"
    allowed_roles: ["storage_agent"]
  - id: "ipfs_get"
    type: "storage"
    backend: "ipfs"
    allowed_roles: ["storage_agent", "retrieval_agent"]
agents:
  - id: "agent_A"
    role: "analytics_agent"
  - id: "agent_B"
    role: "storage_agent"
logging:
  level: info
  audit_log_path: "/var/log/pmpo/audit.log"
limits:
  max_concurrent_requests: 100
  per_agent_rate_limit: 50/minute
```



### **8.2 Workflow Example (Pseudocode)**





1. Agent Host starts; agent embedded with PMPO client obtains a token or identity.
2. Agent issues a request: “Retrieve customer 123’s purchase history.”
3. PMPO client discovers available tools; finds postgre_db_query.
4. Client calls MCP server → server checks auth / ACL → executes Postgres query → returns structured result.
5. Agent receives result, maybe does some processing, then decides to archive some data → calls ipfs_put via MCP.
6. PMPO server routes to IPFS adapter → data stored; returns hash / CID.
7. Agent sends final response back to user or other agent.





If multi-agent workflow: Agent A delegates storage to Agent B — using A2A/ACP: sends task to storage_agent with payload; Agent B receives message, performs storage, reports back result to Agent A.



------





## **9. Open Questions & Design Decisions for Discussion**





- Should PMPO mandate authentication (token, mTLS, DID, etc.), or allow optional “dev mode” without auth — for ease of local development?
- Which transport protocols to support initially (HTTP JSON-RPC, WebSocket, SSE)? How to provide flexibility for different environments (local agents, cloud services, browser / WASM)?
- What sandboxing / isolation model to use for tools that execute code or access file system? Containerization? Restricted process? Language sandbox?
- How to version tool/resource interfaces and manage backward compatibility if tools or agent schema evolve?
- Whether to support multi-tenant / multi-user orchestration out-of-the-box (with namespaces, RBAC) or leave that layer to higher-level platform logic.
- For A2A/ACP: what identity model for agents? How do we ensure secure, non-spoofable agent identities? Should we integrate DIDs / cryptographic identities now or defer to future?
- What language bindings beyond Rust should be supported (WASM, TypeScript/JS, Python, etc.) to maximize adoption across Prometheus and external integrators?





------





## **10. Summary & Recommendations**





- PMPO Rust Edition v1 should prioritize **MCP server + client + basic orchestration engine**, because that surface gives immediate value: standardized tool/data access, integration with Prometheus backend, reliability, and cross-environment consistency.
- Build the system in a **modular, extensible way**, such that A2A/ACP, GUI/UI, sandboxing, and advanced governance are optional modules — allowing gradual adoption.
- Emphasize **security, ACL, and auditability** from day one; do not treat them as afterthoughts.
- Use **Rust** for the core implementation: its performance, safety, concurrency, and cross-compilation advantages align well with Prometheus’s platform philosophy.
- Provide **clear documentation, configuration patterns, and example projects** to help internal developers embed PMPO in their agents or services quickly.
- Plan for **future expansion**: multi-agent collaboration, dynamic orchestration, real-time UI/monitoring, and multi-tenant governance — but begin with a stable, minimal core.



