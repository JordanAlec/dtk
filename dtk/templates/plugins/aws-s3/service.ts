import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { readFile, writeFile } from "fs/promises";
import type { S3Config, UploadOptions, UploadFileResult, DownloadFileResult, PresignedUrlResult } from "./types.js";

export function createS3Service(config?: S3Config) {
  const client = new S3Client({ region: config!.region });

  return {
    uploadFile: async (bucket: string, key: string, filePath: string, options: UploadOptions = {}): Promise<UploadFileResult> => {
      const body = await readFile(filePath);
      const response = await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ...(options.contentType && { ContentType: options.contentType }),
          ...(options.metadata && { Metadata: options.metadata }),
        })
      );
      return { bucket, key, etag: response.ETag! };
    },

    downloadFile: async (bucket: string, key: string, localPath: string): Promise<DownloadFileResult> => {
      const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const body = await response.Body!.transformToByteArray();
      await writeFile(localPath, body);
      return { bucket, key, localPath, contentType: response.ContentType };
    },

    getPresignedUrl: async (bucket: string, key: string, expiresIn: number = 3600): Promise<PresignedUrlResult> => {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const url = await getSignedUrl(client, command, { expiresIn });
      return { url, expiresIn, bucket, key };
    },
  };
}
