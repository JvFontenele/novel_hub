export interface Chapter {
  id: string;
  sourceId: string;
  novelId: string;
  chapterNumber: number;
  title: string | null;
  url: string;
  contentHash: string;
  publishedAt: Date | null;
  createdAt: Date;
}
