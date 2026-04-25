/**
 * Client-side helper to upload receipt files to IPFS via Pinata.
 *
 * SECURITY NOTES:
 * - THE PINATA JWT NEVER LEAVES THE SERVER. The browser sends the file to our
 *   own /api/upload-receipt route, which forwards it to Pinata with the JWT.
 * - Validation is duplicated client-side (defence-in-depth). Server validates
 *   independently — never trust client input.
 * - File is NOT stored on our server at any point — it goes browser → Next.js
 *   API route → Pinata (streaming passthrough).
 */

// Must match server-side ALLOWED_MIME_TYPES in route.ts
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const uploadToIPFS = async (file: File): Promise<string> => {
  // ── Client-side validation (defence-in-depth) ──
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `Invalid file type "${file.type || "unknown"}". Only JPEG, PNG, WEBP, GIF, and PDF are allowed.`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`File too large (${mb} MB). Maximum allowed size is 5 MB.`);
  }

  if (file.size === 0) {
    throw new Error("File is empty. Please select a valid receipt.");
  }

  // ── Upload via our own secure API route ──
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload-receipt", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let errorMsg = "Failed to upload receipt.";
    try {
      const data = await res.json();
      if (data?.error) errorMsg = data.error;
    } catch {
      // ignore parse errors, use default message
    }
    throw new Error(errorMsg);
  }

  const data = await res.json();
  if (!data?.ipfsHash || typeof data.ipfsHash !== "string") {
    throw new Error("Invalid response from upload server.");
  }

  return data.ipfsHash; // IPFS CID — store this on blockchain
};