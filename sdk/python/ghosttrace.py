"""
GhostTRACE Python SDK
Official drop-in client for streaming multi-agent execution traces and counterfactual ghost branches.
Zero external dependencies required (uses standard library urllib).
"""

import json
import time
import uuid
import urllib.request
import urllib.error
from typing import Optional, List, Dict, Any, Callable
from functools import wraps

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
        self.client._send(payload)
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
        self.client._send(payload)
        return GhostTraceNode(self, node_id, self.step_counter, label)

    def finish(self, status: str = "COMPLETED"):
        """Closes the trace session."""
        self.client._send({
            "event": "TRACE_END",
            "traceId": self.trace_id,
            "data": { "status": status }
        })


class GhostTraceClient:
    def __init__(self, endpoint: str = "http://localhost:3000"):
        self.endpoint = endpoint.rstrip("/")
        self.stream_url = f"{self.endpoint}/api/traces/stream"

    def _send(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.stream_url,
            data=data_bytes,
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.URLError as e:
            print(f"[GhostTRACE Warning] Failed to stream event: {e}")
            return {}

    def start_trace(
        self,
        title: str,
        agent_name: str = "Autonomous Agent",
        model: str = "claude-3-7-sonnet",
        tags: Optional[List[str]] = None,
        description: str = ""
    ) -> TraceSession:
        """Starts a new trace session on GhostTRACE."""
        res = self._send({
            "event": "TRACE_START",
            "data": {
                "title": title,
                "agentName": agent_name,
                "model": model,
                "tags": tags or ["python-sdk", "live-stream"],
                "description": description or f"Ingested via GhostTRACE Python SDK"
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
