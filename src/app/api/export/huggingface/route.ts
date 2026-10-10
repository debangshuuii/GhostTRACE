import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { hfToken, repoId, pairsJsonl, filename = "train.jsonl", isPrivate = false } = body;

    if (!hfToken || !hfToken.trim()) {
      return NextResponse.json({ error: "Hugging Face Write Token (hf_...) is required" }, { status: 400 });
    }
    if (!repoId || !repoId.trim()) {
      return NextResponse.json({ error: "Target repository ID (e.g. username/agent-dpo) is required" }, { status: 400 });
    }
    if (!pairsJsonl) {
      return NextResponse.json({ error: "Empty dataset content" }, { status: 400 });
    }

    const cleanToken = hfToken.trim();
    const cleanRepoId = repoId.trim();

    // 1. Ensure or create dataset repository on Hugging Face Hub
    try {
      const createRes = await fetch("https://huggingface.co/api/repos/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanRepoId.split("/").pop() || cleanRepoId,
          type: "dataset",
          private: Boolean(isPrivate),
        }),
      });
      // 409 means repo already exists, which is acceptable
      if (!createRes.ok && createRes.status !== 409) {
        const errorText = await createRes.text();
        console.warn("Hugging Face repo create note:", errorText);
      }
    } catch (e) {
      console.warn("Repo creation check:", e);
    }

    // 2. Upload file via Hugging Face Hub commit API
    // https://huggingface.co/api/datasets/{repoId}/commit/main
    const commitUrl = `https://huggingface.co/api/datasets/${cleanRepoId}/commit/main`;
    const formData = new FormData();
    const blob = new Blob([pairsJsonl], { type: "text/plain" });
    formData.append("file", blob, filename);

    const uploadRes = await fetch(
      `https://huggingface.co/api/datasets/${cleanRepoId}/upload/main/${filename}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleanToken}`,
        },
        body: blob,
      }
    );

    if (!uploadRes.ok) {
      const uploadError = await uploadRes.text();
      return NextResponse.json(
        { error: `Hugging Face upload failed: ${uploadError.slice(0, 180)}` },
        { status: uploadRes.status || 500 }
      );
    }

    const datasetUrl = `https://huggingface.co/datasets/${cleanRepoId}`;

    return NextResponse.json({
      success: true,
      datasetUrl,
      repoId: cleanRepoId,
      filename,
      message: `Dataset successfully published to Hugging Face Hub!`,
    });
  } catch (error: any) {
    console.error("HuggingFace export error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to publish to Hugging Face Hub" },
      { status: 500 }
    );
  }
}
