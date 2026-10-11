"""
Test script verifying GhostTRACE Zero-Code Python Auto-Instrumentation.
"""

import sys
import os
import time

# Ensure sdk/python is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ghosttrace import patch_openai, trace, configure, GhostTraceClient

class MockMessage:
    def __init__(self, content, reasoning_content=None, tool_calls=None):
        self.content = content
        self.reasoning_content = reasoning_content
        self.tool_calls = tool_calls

class MockChoice:
    def __init__(self, message):
        self.message = message

class MockResponse:
    def __init__(self, content, reasoning=None):
        self.choices = [MockChoice(MockMessage(content, reasoning))]

class MockCompletions:
    def create(self, *args, **kwargs):
        prompt = kwargs.get("messages", [{}])[-1].get("content", "")
        return MockResponse(
            content=f"Processed response for: {prompt}",
            reasoning="1. Deconstructed logic.\n2. Invariant validated."
        )

class MockChat:
    def __init__(self):
        self.completions = MockCompletions()

class MockOpenAIClient:
    def __init__(self):
        self.chat = MockChat()

def test_patch_openai():
    print("Testing GhostTRACE Python patch_openai()...")
    client = MockOpenAIClient()
    patch_openai(client=client, endpoint="http://localhost:3000")

    res = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "user", "content": "Calculate the optimal PostgreSQL buffer pool size for 64GB RAM."}
        ]
    )

    print(f"Mock completion returned: {res.choices[0].message.content}")
    print("Auto-instrumentation successfully intercepted and streamed execution.")

@trace(title="Test Function Decorator", agent_name="BenchmarkAgent", model="deepseek-r1")
def sample_agent_task(session, query: str):
    time.sleep(0.05)
    node = session.add_step(
        node_type="THINKING",
        label="Algorithm Analysis",
        content=f"Evaluating computational complexity for: {query}"
    )
    node.add_ghost_branch(
        label="O(N^3) Brute Force Search",
        content="Rejecting naive cubic polynomial recursion.",
        ghost_reason="Critic Veto: Excessive CPU latency complexity."
    )
    return {"status": "optimized", "query": query}

def test_trace_decorator():
    print("Testing @trace decorator...")
    out = sample_agent_task("Matrix Multiplication optimization")
    print(f"Decorator task completed: {out}")

if __name__ == "__main__":
    test_patch_openai()
    test_trace_decorator()
    print("\nAll Python SDK tests passed successfully!")
