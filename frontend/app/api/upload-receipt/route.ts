import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export async function POST(req: NextRequest) {
  try {
    // ── Validate Content-Type ──
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Invalid content type. Expected multipart/form-data." },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    // ── File existence checks ──
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 }
      );
    }

    // ── MIME type validation ──
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, WEBP, GIF, and PDF are allowed.",
        },
        { status: 400 }
      );
    }

    // ── File size validation ──
    if (file.size === 0) {
      return NextResponse.json(
        { error: "File is empty." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `File too large (${mb} MB). Maximum allowed size is 5 MB.` },
        { status: 400 }
      );
    }

    // ── Authenticate with Pinata ──
    const jwt = process.env.PINATA_JWT;
    if (!jwt || jwt.length < 10) {
      console.error("[upload-receipt] Missing or invalid PINATA_JWT");
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    // ── Forward to Pinata ──
    const pinataForm = new FormData();
    pinataForm.append("file", file);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000); // 30s timeout

    let pinataRes;
    try {
      pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        body: pinataForm,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!pinataRes.ok) {
      const errText = await pinataRes.text().catch(() => "Unknown Pinata error");
      console.error(`[upload-receipt] Pinata returned ${pinataRes.status}: ${errText}`);
      return NextResponse.json(
        { error: "Receipt upload service unavailable. Please try again later." },
        { status: 502 }
      );
    }

    const pinataData = await pinataRes.json();
    const ipfsHash: string = pinataData?.IpfsHash;

    if (!ipfsHash || typeof ipfsHash !== "string" || ipfsHash.length < 10) {
      console.error(`[upload-receipt] Invalid IPFS hash from Pinata: ${ipfsHash}`);
      return NextResponse.json(
        { error: "Upload failed. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ipfsHash }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[upload-receipt] Pinata upload timed out after 30s");
      return NextResponse.json(
        { error: "Upload timed out. Please try again or use a smaller file." },
        { status: 504 }
      );
    }

    console.error("[upload-receipt] Upload failed:", err);
    return NextResponse.json(
      { error: "Failed to upload receipt. Please try again." },
      { status: 502 }
    );
  }
}
