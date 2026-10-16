# GhostTRACE Python SDK 👻🔍

[![PyPI version](https://img.shields.io/pypi/v/ghosttrace.svg)](https://pypi.org/project/ghosttrace/)
[![Python versions](https://img.shields.io/pypi/pyversions/ghosttrace.svg)](https://pypi.org/project/ghosttrace/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)

Official Python SDK and Zero-Code Auto-Instrumentation for **[GhostTRACE](https://github.com/debangshuuii/GhostTRACE)** — the autonomous AI agent execution & reasoning trace inspector.

Specializes in capturing multi-agent swarms, deep reasoning chains (DeepSeek-R1 `<think>` tags, Claude 3.7 extended thinking), tool calls, and **counterfactual "Ghost Branches"** (pruned speculative hypotheses, critic vetoes, hallucination rollbacks).

---

## 📦 Installation

```bash
pip install ghosttrace
```

> **Zero Dependencies**: Core SDK uses only standard library `urllib`, `threading`, and `json`. Zero bloat, zero version conflicts with your existing LLM libraries.

---

## ⚡ 1-Line Zero-Code Auto-Instrumentation

### OpenAI & DeepSeek
Automatically intercepts all prompts, reasoning `<think>` tags, tool calls, and exceptions without changing any agent application code:

```python
import ghosttrace
from openai import OpenAI

# 1-Line Monkeypatch
ghosttrace.patch_openai(endpoint="http://localhost:3000")

client = OpenAI()
response = client.chat.completions.create(
    model="deepseek-r1",
    messages=[{"role": "user", "content": "Prove that square root of 2 is irrational"}]
)
# Traces, CoT reasoning tokens, and tool calls are now streaming live to GhostTRACE!
```

### Anthropic Claude 3.7
Captures extended thinking blocks and tool use:

```python
import ghosttrace
import anthropic

ghosttrace.patch_anthropic(endpoint="http://localhost:3000")

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-3-7-sonnet",
    max_tokens=4000,
    thinking={"type": "enabled", "budget_tokens": 2048},
    messages=[{"role": "user", "content": "Analyze security vulnerabilities in auth.ts"}]
)
```

---

## 🌳 Explicit Multi-Agent Tracing & Ghost Branches

Record counterfactual branches where your agent or critic rejected a bad path:

```python
import ghosttrace

# Configure global endpoint
ghosttrace.configure(endpoint="http://localhost:3000")

# Start a trace session
session = ghosttrace.start_trace(
    title="Financial SQL Generator Agent",
    agent_name="PlannerCoordinator",
    model="deepseek-r1"
)

# Step 1: User prompt
prompt_node = session.add_step(
    node_type="USER_PROMPT",
    label="User Request",
    content="Generate report of Q3 user churn"
)

# Step 2: Hypothesis formulation
thinking_node = prompt_node.add_next_step(
    node_type="THINKING",
    label="Query Formulation",
    content="Formulating SQL join across users and subscriptions table..."
)

# Step 3: Record a PRUNED GHOST BRANCH (Dangerous / Hallucinated Path)
thinking_node.add_ghost_branch(
    label="DELETE FROM users WHERE churned = 1",
    content="Alternative speculative hypothesis: delete rows directly.",
    ghost_reason="VETOED by SafetyCritic: destructive command policy violation."
)

# Step 4: Chosen path
tool_node = thinking_node.add_next_step(
    node_type="TOOL_CALL",
    label="Tool: postgres_read",
    content="SELECT count(*) FROM users WHERE status = 'churned' AND quarter = 'Q3'"
)

# Finish trace
session.finish("COMPLETED")
```

---

## 🎯 Decorator API

```python
from ghosttrace import trace

@trace(title="Security Auditing Workflow", model="gpt-4o")
def audit_codebase(session, repo_path: str):
    session.add_step(
        node_type="TOOL_CALL",
        label="AST Scan",
        content=f"Scanning {repo_path} for secret leaks..."
    )
    return {"status": "clean"}
```

---

## 📄 License
MIT © [Debangshu Sinha](https://github.com/debangshuuii/GhostTRACE)
