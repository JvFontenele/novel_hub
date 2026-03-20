export interface ParsedChapter {
  chapterNumber: number;
  title: string | null;
  url: string;
  publishedAt: Date | null;
}

export interface ParsedNovelData {
  title: string | null;
  coverUrl: string | null;
  synopsis: string | null;
  author: string | null;
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'DROPPED' | 'UNKNOWN';
  chapters: ParsedChapter[];
}

export interface Connector {
  key: string;
  canHandle(url: string): boolean;
  fetchNovelData(url: string): Promise<ParsedNovelData>;
}
