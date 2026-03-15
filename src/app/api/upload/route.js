import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";

export async function POST(request) {
  try {
    const isAuthd = await isAdminAuthenticated();
    if (!isAuthd) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary configuration missing" }, { status: 500 });
    }

    const timestamp = Math.round(new Date().getTime() / 1000).toString();

    // 签名规则: 各参数按字母顺序列出拼接
    const paramsToSign = `folder=bowen_web&timestamp=${timestamp}${apiSecret}`;
    
    // Web Crypto API 可以在 Edge 上运行
    const encoder = new TextEncoder();
    const data = encoder.encode(paramsToSign);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("api_key", apiKey);
    uploadFormData.append("timestamp", timestamp);
    uploadFormData.append("signature", signature);
    uploadFormData.append("folder", "bowen_web");

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: uploadFormData,
      }
    );
    
    console.log("Cloudinary response status:", uploadRes.status);
    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      console.error("Cloudinary error details:", JSON.stringify(uploadData, null, 2));
      return NextResponse.json({ error: uploadData.error?.message || "Cloudinary upload failed" }, { status: 500 });
    }

    console.log("Cloudinary upload success. URL:", uploadData.secure_url);
    return NextResponse.json({ url: uploadData.secure_url });
  } catch (error) {
    console.error("Upload route error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
