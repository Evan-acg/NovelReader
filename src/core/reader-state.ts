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

export interface ReaderState {
  chapters: ParsedChapter[];
  activeIndex: number;
  sidebarVisible: boolean;
  quietMode: boolean;
}

export function createInitialState(): ReaderState {
  return {
    chapters: [],
    activeIndex: 0,
    sidebarVisible: true,
    quietMode: false,
  };
}
