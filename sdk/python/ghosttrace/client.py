"""
GhostTRACE Python SDK & Zero-Code Auto-Instrumentation
Official drop-in client for streaming multi-agent execution traces, reasoning trees, and counterfactual ghost branches.
Zero external dependencies required (uses standard library urllib, threading, json, time).
"""

import json
import time
import uuid
import threading
import urllib.request
import urllib.error
from typing import Optional, List, Dict, Any, Callable
from functools import wraps
from contextlib import contextmanager

# Global default client configuration
_DEFAULT_ENDPOINT = "http://localhost:3000"
_DEFAULT_API_KEY: Optional[str] = None
_DEFAULT_WORKSPACE_ID: Optional[str] = None
_GLOBAL_CLIENT: Optional["GhostTraceClient"] = None


def configure(
    endpoint: str = "http://localhost:3000",
    api_key: Optional[str] = None,
    workspace_id: Optional[str] = None
):
    """Sets the global GhostTRACE connection configuration."""
    global _DEFAULT_ENDPOINT, _DEFAULT_API_KEY, _DEFAULT_WORKSPACE_ID, _GLOBAL_CLIENT
    _DEFAULT_ENDPOINT = endpoint.rstrip("/")
    _DEFAULT_API_KEY = api_key
    _DEFAULT_WORKSPACE_ID = workspace_id
    _GLOBAL_CLIENT = GhostTraceClient(endpoint=endpoint, api_key=api_key, workspace_id=workspace_id)


def get_default_client() -> "GhostTraceClient":
    """Returns the globally configured GhostTraceClient instance."""
    global _GLOBAL_CLIENT
    if _GLOBAL_CLIENT is None:
        _GLOBAL_CLIENT = GhostTraceClient(
            endpoint=_DEFAULT_ENDPOINT,
            api_key=_DEFAULT_API_KEY,
            workspace_id=_DEFAULT_WORKSPACE_ID
        )
    return _GLOBAL_CLIENT


class GhostTraceNode:
    def __init__(self, trace_session: "TraceSession", node_id: str, step_index: int, label: str):
        self.session = trace_session
        self.node_id = node_id
        self.step_index = step_index
        self.label = label

    def add_ghost_branch(
        self,
        label: str,
        content: str,
        ghost_reason: str,
        tokens: int = 450,
        latency_ms: int = 350,
        confidence_score: float = 0.4
    ) -> "GhostTraceNode":
        """Adds a counterfactual alternative path that was pruned by a critic policy."""
        return self.session.add_ghost_branch(
            parent_node=self,
            label=label,
            content=content,
            ghost_reason=ghost_reason,
            tokens=tokens,
            latency_ms=latency_ms,
            confidence_score=confidence_score
        )

    def add_next_step(
        self,
        node_type: str,
        label: str,
        content: str,
        tokens: int = 500,
        latency_ms: int = 300,
        raw_input: Optional[Any] = None,
        raw_output: Optional[Any] = None
    ) -> "GhostTraceNode":
        """Adds the next chosen step connected to this node."""
        return self.session.add_step(
            parent_node=self,
            node_type=node_type,
            label=label,
            content=content,
            tokens=tokens,
            latency_ms=latency_ms,
            raw_input=raw_input,
            raw_output=raw_output
        )


class TraceSession:
    def __init__(self, client: "GhostTraceClient", trace_id: str, title: str):
        self.client = client
        self.trace_id = trace_id
        self.title = title
        self.step_counter = 0

    def add_step(
        self,
        node_type: str,
        label: str,
        content: str,
        parent_node: Optional[GhostTraceNode] = None,
        tokens: int = 400,
        latency_ms: int = 250,
        raw_input: Optional[Any] = None,
        raw_output: Optional[Any] = None
    ) -> GhostTraceNode:
        """Appends a standard or chosen reasoning step."""
        self.step_counter += 1
        node_id = f"node-{uuid.uuid4().hex[:8]}"

        payload = {
            "event": "NODE_ADDED",
            "traceId": self.trace_id,
            "data": {
                "nodeId": node_id,
                "stepIndex": self.step_counter,
                "type": node_type,
                "label": label,
                "role": "assistant" if self.step_counter > 1 else "user",
                "content": content,
                "tokens": tokens,
                "latencyMs": latency_ms,
                "isGhost": False,
                "parentNodeId": parent_node.node_id if parent_node else None,
                "rawInput": raw_input,
                "rawOutput": raw_output
            }
        }
        self.client._send_async(payload)
        return GhostTraceNode(self, node_id, self.step_counter, label)

    def add_ghost_branch(
        self,
        parent_node: GhostTraceNode,
        label: str,
        content: str,
        ghost_reason: str,
        tokens: int = 450,
        latency_ms: int = 350,
        confidence_score: float = 0.4
    ) -> GhostTraceNode:
        """Records a critic-rejected speculative reasoning path (Ghost Branch)."""
        self.step_counter += 1
        node_id = f"ghost-{uuid.uuid4().hex[:8]}"

        payload = {
            "event": "NODE_ADDED",
            "traceId": self.trace_id,
            "data": {
                "nodeId": node_id,
                "stepIndex": self.step_counter,
                "type": "GHOST_REJECTED",
                "label": f"Ghost: {label}",
                "role": "assistant",
                "content": content,
                "tokens": tokens,
                "latencyMs": latency_ms,
                "isGhost": True,
                "ghostReason": ghost_reason,
                "confidenceScore": confidence_score,
                "parentNodeId": parent_node.node_id
            }
        }
        self.client._send_async(payload)
        return GhostTraceNode(self, node_id, self.step_counter, label)

    @contextmanager
    def span(self, label: str, node_type: str = "THINKING", parent_node: Optional[GhostTraceNode] = None):
        """Context manager to trace a block of execution with automatic duration tracking."""
        start = time.time()
        node = self.add_step(
            node_type=node_type,
            label=label,
            content=f"Executing {label}...",
            parent_node=parent_node
        )
        try:
            yield node
        finally:
            elapsed_ms = int((time.time() - start) * 1000)
            # Send latency update if needed

    def finish(self, status: str = "COMPLETED"):
        """Closes the trace session."""
        self.client._send_async({
            "event": "TRACE_END",
            "traceId": self.trace_id,
            "data": { "status": status }
        })


class GhostTraceClient:
    def __init__(
        self,
        endpoint: str = "http://localhost:3000",
        api_key: Optional[str] = None,
        workspace_id: Optional[str] = None
    ):
        self.endpoint = endpoint.rstrip("/")
        self.api_key = api_key
        self.workspace_id = workspace_id
        self.stream_url = f"{self.endpoint}/api/traces/stream"

    def _send(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data_bytes = json.dumps(payload).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        if self.workspace_id:
            headers["x-workspace-id"] = self.workspace_id

        req = urllib.request.Request(self.stream_url, data=data_bytes, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            # Gracefully fail without interrupting user's main agent execution
            return {}

    def _send_async(self, payload: Dict[str, Any]):
        """Dispatches event in background daemon thread to eliminate latency."""
        t = threading.Thread(target=self._send, args=(payload,), daemon=True)
        t.start()

    def start_trace(
        self,
        title: str,
        agent_name: str = "Autonomous Agent",
        model: str = "claude-3-7-sonnet",
        tags: Optional[List[str]] = None,
        description: str = "",
        session_id: Optional[str] = None,
        turn_index: Optional[int] = None,
        parent_trace_id: Optional[str] = None
    ) -> TraceSession:
        """Starts a new trace session on GhostTRACE."""
        res = self._send({
            "event": "TRACE_START",
            "data": {
                "title": title,
                "agentName": agent_name,
                "model": model,
                "tags": tags or ["python-sdk", "live-stream"],
                "description": description or "Ingested via GhostTRACE Python SDK",
                "workspaceId": self.workspace_id,
                "sessionId": session_id,
                "turnIndex": turn_index,
                "parentTraceId": parent_trace_id
            }
        })
        trace_id = res.get("traceId", f"trace-{uuid.uuid4().hex[:12]}")
        return TraceSession(self, trace_id, title)

    def observe(self, title: Optional[str] = None, agent_name: str = "Python Agent", model: str = "gpt-4o"):
        """Decorator to wrap and trace an autonomous agent function automatically."""
        def decorator(fn: Callable):
            @wraps(fn)
            def wrapper(*args, **kwargs):
                t_title = title or f"Agent Execution: {fn.__name__}"
                session = self.start_trace(title=t_title, agent_name=agent_name, model=model)
                root_step = session.add_step(
                    node_type="USER_PROMPT",
                    label="Function Invocation",
                    content=f"Arguments: {args}, Kwargs: {kwargs}",
                    tokens=35,
                    latency_ms=10
                )
                start_time = time.time()
                try:
                    result = fn(session, *args, **kwargs)
                    session.finish("COMPLETED")
                    return result
                except Exception as ex:
                    session.add_step(
                        node_type="ERROR",
                        label="Unhandled Exception",
                        content=str(ex),
                        parent_node=root_step,
                        tokens=100
                    )
                    session.finish("FAILED")
                    raise
            return wrapper
        return decorator


# Module-level convenience decorator
def trace(title: Optional[str] = None, agent_name: str = "Python Agent", model: str = "gpt-4o"):
    """Global decorator to trace any Python function with GhostTRACE."""
    client = get_default_client()
    return client.observe(title=title, agent_name=agent_name, model=model)


# ----------------------------------------------------------------------
# ZERO-CODE MONKEYPATCHING (OpenAI & Anthropic)
# ----------------------------------------------------------------------

def patch_openai(
    client: Optional[Any] = None,
    endpoint: str = "http://localhost:3000",
    agent_name: str = "OpenAI-AutoTracer"
):
    """
    Zero-Code Auto-Instrumentation for OpenAI Python SDK.
    Patches client.chat.completions.create to automatically capture reasoning CoT,
    prompts, tool calls, and counterfactual ghost errors without touching user code.
    """
    gt_client = GhostTraceClient(endpoint=endpoint)

    def _wrap_create(orig_create_fn):
        @wraps(orig_create_fn)
        def wrapped_create(*args, **kwargs):
            messages = kwargs.get("messages", [])
            model = kwargs.get("model", "gpt-4o")
            tools = kwargs.get("tools", [])

            user_msg = "OpenAI Query"
            for m in reversed(messages):
                if isinstance(m, dict) and m.get("role") == "user":
                    user_msg = str(m.get("content", ""))[:80]
                    break

            # 1. Start Trace
            session = gt_client.start_trace(
                title=f"OpenAI: {user_msg}",
                agent_name=agent_name,
                model=model,
                tags=["openai", "zero-code-patch"]
            )

            # 2. Record User Prompt Node
            prompt_node = session.add_step(
                node_type="USER_PROMPT",
                label="User Directive",
                content=json.dumps(messages, indent=2) if len(messages) > 1 else user_msg,
                tokens=sum(len(str(m)) for m in messages) // 4 + 10,
                latency_ms=15
            )

            start_t = time.time()
            try:
                response = orig_create_fn(*args, **kwargs)
                elapsed_ms = int((time.time() - start_t) * 1000)

                # Extract response text, reasoning, tool_calls
                choice = response.choices[0] if getattr(response, "choices", None) else None
                message = getattr(choice, "message", None) if choice else None

                content = getattr(message, "content", "") or ""
                reasoning = (
                    getattr(message, "reasoning_content", None) or
                    getattr(message, "reasoning", None) or
                    None
                )

                # Check for <think> tags in DeepSeek
                if not reasoning and "<think>" in content:
                    import re
                    m = re.search(r"<think>(.*?)</think>", content, re.DOTALL)
                    if m:
                        reasoning = m.group(1).strip()
                        content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()

                parent = prompt_node

                # 3. Add Thinking Node if present
                if reasoning:
                    parent = parent.add_next_step(
                        node_type="THINKING",
                        label="Chain-of-Thought Reasoning",
                        content=reasoning,
                        tokens=len(reasoning) // 4,
                        latency_ms=int(elapsed_ms * 0.4)
                    )

                # 4. Add Tool Calls if present
                tool_calls = getattr(message, "tool_calls", None)
                if tool_calls:
                    for tc in tool_calls:
                        fn = getattr(tc, "function", None)
                        fn_name = getattr(fn, "name", "tool") if fn else "tool"
                        fn_args = getattr(fn, "arguments", "{}") if fn else "{}"
                        parent = parent.add_next_step(
                            node_type="TOOL_CALL",
                            label=f"Tool: {fn_name}",
                            content=fn_args,
                            tokens=len(fn_args) // 4 + 20,
                            latency_ms=int(elapsed_ms * 0.3)
                        )

                # 5. Add Final Response Node
                if content:
                    parent.add_next_step(
                        node_type="LLM_RESPONSE",
                        label="LLM Synthesis",
                        content=content,
                        tokens=len(content) // 4 + 10,
                        latency_ms=int(elapsed_ms * 0.5)
                    )

                session.finish("COMPLETED")
                return response
            except Exception as e:
                # Record error node and finish as FAILED
                session.add_step(
                    node_type="ERROR",
                    label="Execution Error",
                    content=str(e),
                    parent_node=prompt_node
                )
                session.finish("FAILED")
                raise

        return wrapped_create

    # If specific client passed, patch that instance
    if client is not None:
        if hasattr(client, "chat") and hasattr(client.chat, "completions"):
            client.chat.completions.create = _wrap_create(client.chat.completions.create)
            print("[GhostTRACE] Auto-instrumented client.chat.completions.create")
            return client

    # Otherwise, try monkeypatching the OpenAI module class
    try:
        import openai
        if hasattr(openai, "resources") and hasattr(openai.resources, "chat"):
            orig = openai.resources.chat.completions.Completions.create
            openai.resources.chat.completions.Completions.create = _wrap_create(orig)
            print("[GhostTRACE] Zero-code patch applied to openai.resources.chat.completions.Completions.create")
        elif hasattr(openai, "ChatCompletion"):
            orig = openai.ChatCompletion.create
            openai.ChatCompletion.create = _wrap_create(orig)
            print("[GhostTRACE] Zero-code patch applied to openai.ChatCompletion.create")
    except ImportError:
        pass


def patch_anthropic(
    client: Optional[Any] = None,
    endpoint: str = "http://localhost:3000",
    agent_name: str = "Claude-AutoTracer"
):
    """
    Zero-Code Auto-Instrumentation for Anthropic Python SDK.
    Captures Claude 3.7 extended thinking blocks, tool uses, and responses.
    """
    gt_client = GhostTraceClient(endpoint=endpoint)

    def _wrap_create(orig_create_fn):
        @wraps(orig_create_fn)
        def wrapped_create(*args, **kwargs):
            messages = kwargs.get("messages", [])
            model = kwargs.get("model", "claude-3-7-sonnet")
            user_msg = str(messages[-1].get("content", "Claude Query"))[:80] if messages else "Claude Query"

            session = gt_client.start_trace(
                title=f"Anthropic: {user_msg}",
                agent_name=agent_name,
                model=model,
                tags=["anthropic", "claude", "zero-code-patch"]
            )

            prompt_node = session.add_step(
                node_type="USER_PROMPT",
                label="User Directive",
                content=json.dumps(messages, indent=2) if len(messages) > 1 else user_msg,
                tokens=35,
                latency_ms=15
            )

            start_t = time.time()
            try:
                response = orig_create_fn(*args, **kwargs)
                elapsed_ms = int((time.time() - start_t) * 1000)

                parent = prompt_node
                content_blocks = getattr(response, "content", [])

                for block in content_blocks:
                    b_type = getattr(block, "type", "")
                    if b_type == "thinking":
                        thinking_text = getattr(block, "thinking", "")
                        parent = parent.add_next_step(
                            node_type="THINKING",
                            label="Claude Thinking Block",
                            content=thinking_text,
                            tokens=len(thinking_text) // 4,
                            latency_ms=int(elapsed_ms * 0.4)
                        )
                    elif b_type == "tool_use":
                        tool_name = getattr(block, "name", "tool")
                        tool_input = json.dumps(getattr(block, "input", {}), indent=2)
                        parent = parent.add_next_step(
                            node_type="TOOL_CALL",
                            label=f"Tool: {tool_name}",
                            content=tool_input,
                            tokens=len(tool_input) // 4,
                            latency_ms=int(elapsed_ms * 0.3)
                        )
                    elif b_type == "text":
                        text_val = getattr(block, "text", "")
                        parent.add_next_step(
                            node_type="LLM_RESPONSE",
                            label="Claude Response",
                            content=text_val,
                            tokens=len(text_val) // 4,
                            latency_ms=int(elapsed_ms * 0.5)
                        )

                session.finish("COMPLETED")
                return response
            except Exception as e:
                session.add_step(
                    node_type="ERROR",
                    label="Anthropic Error",
                    content=str(e),
                    parent_node=prompt_node
                )
                session.finish("FAILED")
                raise

        return wrapped_create

    if client is not None:
        if hasattr(client, "messages"):
            client.messages.create = _wrap_create(client.messages.create)
            print("[GhostTRACE] Auto-instrumented client.messages.create")
            return client

    try:
        import anthropic
        if hasattr(anthropic, "resources") and hasattr(anthropic.resources, "messages"):
            orig = anthropic.resources.messages.Messages.create
            anthropic.resources.messages.Messages.create = _wrap_create(orig)
            print("[GhostTRACE] Zero-code patch applied to anthropic.resources.messages.Messages.create")
    except ImportError:
        pass


def start_trace(
    title: str,
    agent_name: str = "Autonomous Agent",
    model: str = "claude-3-7-sonnet",
    tags: Optional[List[str]] = None,
    description: str = "",
    session_id: Optional[str] = None,
    turn_index: Optional[int] = None,
    parent_trace_id: Optional[str] = None
) -> TraceSession:
    """Convenience shortcut to start a new trace with the default GhostTRACE client."""
    return get_default_client().start_trace(
        title=title,
        agent_name=agent_name,
        model=model,
        tags=tags,
        description=description,
        session_id=session_id,
        turn_index=turn_index,
        parent_trace_id=parent_trace_id
    )


def step(label: str, content: str, node_type: str = "THINKING"):
    """Adds a step to the currently active global trace context."""
    pass


def ghost_branch(label: str, content: str, ghost_reason: str):
    """Records a pruned counterfactual ghost branch in the active trace context."""
    pass

