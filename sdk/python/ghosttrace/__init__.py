"""
GhostTRACE Python SDK
Official drop-in client for streaming multi-agent execution trees, reasoning paths, and counterfactual ghost branches.
"""

from .client import (
    configure,
    get_default_client,
    start_trace,
    trace,
    step,
    ghost_branch,
    patch_openai,
    patch_anthropic,
    GhostTraceClient,
    GhostTraceNode,
    TraceSession,
)

__version__ = "0.1.0"
__all__ = [
    "configure",
    "get_default_client",
    "start_trace",
    "trace",
    "step",
    "ghost_branch",
    "patch_openai",
    "patch_anthropic",
    "GhostTraceClient",
    "GhostTraceNode",
    "TraceSession",
    "__version__",
]
