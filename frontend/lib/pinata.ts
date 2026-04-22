export const uploadToIPFS = async (file: File): Promise<string> => {
  // File type validation (client-side defence-in-depth)
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Only images and PDF are allowed.");
  }

  // File size validation: max 5MB
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File too large. Maximum size is 5MB.");
  }

  const formData = new FormData();
  formData.append("file", file);

  // Call our own secure server-side API route — JWT never touches the browser
  const res = await fetch("/api/upload-receipt", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to upload receipt.");
  }

  const data = await res.json();
  return data.ipfsHash; // IPFS CID — store this on blockchain
};