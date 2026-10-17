import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getRegressionCases,
  runAllRegressionTests,
  createTestCaseFromGhostNode,
  exportAsPytest,
  exportAsJest,
  RegressionTestCase,
} from "@/lib/regression-suite";

export async function GET() {
  try {
    let dbCases = await prisma.regressionTestCase.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Seed defaults into database if table is empty
    if (dbCases.length === 0) {
      const defaults = getRegressionCases();
      for (const c of defaults) {
        try {
          await prisma.regressionTestCase.create({
            data: {
              name: c.name,
              category: c.category,
              originTraceId: c.originTraceId,
              originNodeId: c.originNodeId,
              inputPrompt: c.inputPrompt,
              expectedBehavior: c.expectedBehavior,
              forbiddenPattern: c.forbiddenPattern,
              maxTokensAllowed: c.maxTokensAllowed,
              status: c.status,
              lastRunAt: c.lastRunAt ? new Date(c.lastRunAt) : new Date(),
              failureReason: c.failureReason,
            },
          });
        } catch {
          // Ignore unique constraints or duplicate seeds
        }
      }
      dbCases = await prisma.regressionTestCase.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    const cases: RegressionTestCase[] = (dbCases.length > 0 ? dbCases : getRegressionCases()).map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category as any,
      originTraceId: c.originTraceId,
      originNodeId: c.originNodeId,
      inputPrompt: c.inputPrompt,
      expectedBehavior: c.expectedBehavior,
      forbiddenPattern: c.forbiddenPattern,
      maxTokensAllowed: c.maxTokensAllowed,
      status: c.status as any,
      lastRunAt: c.lastRunAt ? (typeof c.lastRunAt === "string" ? c.lastRunAt : (c.lastRunAt as Date).toISOString()) : undefined,
      failureReason: c.failureReason || undefined,
    }));

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
    console.warn("Falling back to in-memory regression suite:", error);
    const cases = getRegressionCases();
    const passed = cases.filter((c) => c.status === "PASS").length;
    return NextResponse.json({
      cases,
      metrics: {
        total: cases.length,
        passed,
        failed: cases.length - passed,
        passRate: Math.round((passed / Math.max(1, cases.length)) * 100),
      },
    });
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

      try {
        await prisma.regressionTestCase.create({
          data: {
            name: newCase.name,
            category: newCase.category,
            originTraceId: newCase.originTraceId,
            originNodeId: newCase.originNodeId,
            inputPrompt: newCase.inputPrompt,
            expectedBehavior: newCase.expectedBehavior,
            forbiddenPattern: newCase.forbiddenPattern,
            maxTokensAllowed: newCase.maxTokensAllowed,
            status: newCase.status,
            lastRunAt: new Date(),
          },
        });
      } catch (dbErr) {
        console.warn("Could not persist regression case to database, kept in memory:", dbErr);
      }

      return NextResponse.json({ success: true, testCase: newCase });
    }

    if (action === "export") {
      let cases = getRegressionCases();
      try {
        const dbCases = await prisma.regressionTestCase.findMany();
        if (dbCases.length > 0) {
          cases = dbCases.map((c) => ({
            id: c.id,
            name: c.name,
            category: c.category as any,
            originTraceId: c.originTraceId,
            originNodeId: c.originNodeId,
            inputPrompt: c.inputPrompt,
            expectedBehavior: c.expectedBehavior,
            forbiddenPattern: c.forbiddenPattern,
            maxTokensAllowed: c.maxTokensAllowed,
            status: c.status as any,
            lastRunAt: c.lastRunAt ? (typeof c.lastRunAt === "string" ? c.lastRunAt : (c.lastRunAt as Date).toISOString()) : undefined,
            failureReason: c.failureReason || undefined,
          }));
        }
      } catch {}

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

