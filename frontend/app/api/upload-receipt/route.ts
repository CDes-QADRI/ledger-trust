import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg","image/png","image/webp","image/gif","application/pdf"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WEBP, GIF, and PDF are allowed." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large. Maximum allowed size is 5MB." }, { status: 400 });
    }

    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const pinataForm = new FormData();
    pinataForm.append("file", file);

    const pinataRes = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      pinataForm,
      { headers: { Authorization: `Bearer ${jwt}` } }
    );

    const ipfsHash: string = pinataRes.data.IpfsHash;
    return NextResponse.json({ ipfsHash }, { status: 200 });
  } catch (err: unknown) {
    console.error("[upload-receipt] Pinata upload failed:", err);
    return NextResponse.json({ error: "Failed to upload receipt. Please try again." }, { status: 502 });
  }
}