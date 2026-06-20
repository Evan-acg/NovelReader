export interface ParsedChapter {
  bookTitle: string;
  chapterTitle: string;
  documentTitle: string;
  contentHtml: string;
  contentText: string;
  indexUrl?: string;
  prevUrl?: string;
  nextUrl?: string;
  isVip?: boolean;
  isSection?: boolean;
}
