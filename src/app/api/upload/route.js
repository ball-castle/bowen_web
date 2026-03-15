import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { uploadCloudinaryImage } from "@/lib/cloudinary";

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

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Invalid file payload" }, { status: 400 });
    }

    const upload = await uploadCloudinaryImage({
      file,
      fileName: typeof file.name === "string" ? file.name : undefined,
    });

    return NextResponse.json({ url: upload.url, publicId: upload.publicId });
  } catch (error) {
    console.error("Upload route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
