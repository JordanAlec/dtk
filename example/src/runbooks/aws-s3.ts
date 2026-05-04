import "../load-env.js";
import { suite } from "../suite.js";

await suite()
  .s3({
    region: process.env.AWS_REGION!,
  })
  .step("upload-file", async (ctx) => {
    const result = await ctx.services.s3.uploadFile(
      process.env.S3_BUCKET_NAME!,
      "uploads/example.txt",
      "./example.txt",
      {
        contentType: "text/plain",
        metadata: { source: "dtk-example" },
      }
    );
    console.log("Uploaded:", result);
    return result;
  })
  .step("get-presigned-url", async (ctx) => {
    const result = await ctx.services.s3.getPresignedUrl(
      process.env.S3_BUCKET_NAME!,
      "uploads/example.txt",
      300
    );
    console.log("Presigned URL:", result.url);
    console.log("Expires in:", result.expiresIn, "seconds");
    return result;
  })
  .step("download-file", async (ctx) => {
    const result = await ctx.services.s3.downloadFile(
      process.env.S3_BUCKET_NAME!,
      "uploads/example.txt",
      "./downloaded-example.txt"
    );
    console.log("Downloaded to:", result.localPath);
    console.log("Content type:", result.contentType);
    return result;
  })
  .run("throwOnError");
