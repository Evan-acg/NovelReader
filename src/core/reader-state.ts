export interface ParsedChapter {
  url: string;
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
  autoLoadPaused: boolean;
}

export function createInitialState(): ReaderState {
  return {
    chapters: [],
    activeIndex: 0,
    sidebarVisible: true,
    quietMode: false,
    autoLoadPaused: false,
  };
}

export type LoadStatus = 'loaded' | 'skipped' | 'failed';

export interface LoadResult {
  status: LoadStatus;
  chapter: ParsedChapter | null;
  url: string;
  error?: string;
}
