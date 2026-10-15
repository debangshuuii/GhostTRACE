import { NextResponse } from "next/server";
import {
  getRegressionCases,
  runAllRegressionTests,
  createTestCaseFromGhostNode,
  exportAsPytest,
  exportAsJest,
} from "@/lib/regression-suite";

export async function GET() {
  try {
    const cases = getRegressionCases();
    const passed = cases.filter((c) => c.status === "PASS").length;
    const passRate = Math.round((passed / Math.max(1, cases.length)) * 100);

    return NextResponse.json({
      cases,
      metrics: {
        total: cases.length,
        passed,
        failed: cases.length - passed,
        passRate,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load regression cases" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, trace, node, format } = body;

    if (action === "run") {
      const results = runAllRegressionTests();
      return NextResponse.json({ success: true, ...results });
    }

    if (action === "add_from_node") {
      if (!node) {
        return NextResponse.json({ error: "Node is required" }, { status: 400 });
      }
      const newCase = createTestCaseFromGhostNode(trace || null, node);
      return NextResponse.json({ success: true, testCase: newCase });
    }

    if (action === "export") {
      const cases = getRegressionCases();
      if (format === "pytest") {
        return NextResponse.json({ code: exportAsPytest(cases), filename: "test_ghost_regressions.py" });
      } else if (format === "jest" || format === "vitest") {
        return NextResponse.json({ code: exportAsJest(cases), filename: "agent-regressions.test.ts" });
      } else {
        return NextResponse.json({ code: JSON.stringify(cases, null, 2), filename: "golden_regression_suite.json" });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process regression action" },
      { status: 500 }
    );
  }
}
