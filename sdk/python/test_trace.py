"""
Test script verifying GhostTRACE Python SDK live streaming
"""

import sys
import os

# Ensure local ghosttrace module is in path
sys.path.insert(0, os.path.dirname(__file__))

from ghosttrace import GhostTraceClient

def run_test():
    print("🚀 Initializing GhostTraceClient...")
    client = GhostTraceClient(endpoint="http://localhost:3000")

    print("📡 Starting trace session...")
    trace = client.start_trace(
        title="Python Agent: Database Optimization & Indexing",
        agent_name="DB-Optimizer-Swarm",
        model="deepseek-r1-distill",
        tags=["python", "database", "postgres", "ghost-pruning"]
    )
    print(f"✓ Session established with ID: {trace.trace_id}")

    # 1. User Prompt
    p1 = trace.add_step(
        node_type="USER_PROMPT",
        label="User Query",
        content="Our users table query is taking 4.2 seconds on 2M rows. Recommend and execute an index optimization.",
        tokens=42,
        latency_ms=15
    )

    # 2. CoT Planning
    p2 = trace.add_step(
        parent_node=p1,
        node_type="THINKING",
        label="EXPLAIN ANALYZE Review",
        content="Query is performing a Seq Scan over users on `created_at` and `status`. Need to evaluate composite index vs partial index.",
        tokens=780,
        latency_ms=920
    )

    # 3. Speculative Ghost Branch (Critic Rejection)
    g1 = trace.add_ghost_branch(
        parent_node=p2,
        label="Full Table Re-clustering & Lock",
        content="Propose running `VACUUM FULL users; CLUSTER users USING users_status_idx;`",
        ghost_reason="Critic Policy Violation: Exclusive table lock blocks production writes for 15+ minutes. Blast radius unacceptable.",
        tokens=650,
        latency_ms=480,
        confidence_score=0.35
    )
    print("✓ Recorded counterfactual Ghost Branch (pruned speculative path)")

    # 4. Chosen Tool Call
    p3 = trace.add_step(
        parent_node=p2,
        node_type="TOOL_CALL",
        label="tool: execute_migration_concurrently",
        content="CREATE INDEX CONCURRENTLY idx_users_status_created ON users(status, created_at DESC) WHERE status = 'ACTIVE';",
        tokens=410,
        latency_ms=1240,
        raw_input={"sql": "CREATE INDEX CONCURRENTLY idx_users_status_created ON users(status, created_at DESC) WHERE status = 'ACTIVE';"},
        raw_output={"status": "INDEX_CREATED", "duration_seconds": 1.2}
    )

    # 5. Final LLM Response
    trace.add_step(
        parent_node=p3,
        node_type="LLM_RESPONSE",
        label="Execution Summary & Verified Benchmark",
        content="Applied non-blocking concurrent partial index. EXPLAIN ANALYZE latency dropped from 4,200ms to 3.8ms (1,100x speedup) with zero downtime.",
        tokens=520,
        latency_ms=840
    )

    # Finish trace
    trace.finish("COMPLETED")
    print(f"🎉 Trace streamed successfully! View at: http://localhost:3000")

if __name__ == "__main__":
    run_test()
