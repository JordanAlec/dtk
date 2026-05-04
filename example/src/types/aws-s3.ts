export interface S3Config {
  region: string;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadFileResult {
  bucket: string;
  key: string;
  etag: string | null;
}

export interface DownloadFileResult {
  bucket: string;
  key: string;
  localPath: string;
  contentType: string | undefined;
}

export interface PresignedUrlResult {
  url: string;
  expiresIn: number;
  bucket: string;
  key: string;
}
