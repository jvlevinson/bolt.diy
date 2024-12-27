// types/import.ts
export interface ImportProgress {
  stage: 'scanning' | 'filtering' | 'processing' | 'creating';
  processed: number;
  total: number;
  details: string;
}

export interface ProcessedFile {
  path: string;
  content: string;
  size: number;
  priority: number;
}