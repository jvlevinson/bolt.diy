// utils/importProcessor.ts
import { logStore } from '~/lib/stores/logs';
import { IMPORT_CONFIG } from './importConfig';
import type { ImportProgress, ProcessedFile } from '~/types/import';
import { isBinaryFile, shouldIncludeFile } from './fileUtils';

export class ImportProcessor {
  private processedFiles: ProcessedFile[] = [];
  private totalSize: number = 0;
  private onProgress: (progress: ImportProgress) => void;

  constructor(progressCallback: (progress: ImportProgress) => void) {
    this.onProgress = progressCallback;
  }

  private updateProgress(stage: ImportProgress['stage'], processed: number, total: number, details: string) {
    this.onProgress({
      stage,
      processed,
      total,
      details
    });
  }

  private getPriorityScore(filePath: string): number {
    const fileName = filePath.split('/').pop()?.toLowerCase() || '';
    const priorityIndex = IMPORT_CONFIG.PRIORITY_FILES.indexOf(fileName);
    return priorityIndex === -1 ? 0 : IMPORT_CONFIG.PRIORITY_FILES.length - priorityIndex;
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      reader.readAsText(file); // This is the correct way to read the file
    });
  }

  private async processFileChunk(files: File[], startIndex: number, chunkSize: number): Promise<ProcessedFile[]> {
    const chunk = files.slice(startIndex, startIndex + chunkSize);
    const processedChunk: ProcessedFile[] = [];

    for (const file of chunk) {
      try {
        // Skip files that are too large
        if (file.size > IMPORT_CONFIG.MAX_SINGLE_FILE_SIZE) {
          logStore.logWarning(`Skipping large file: ${file.name}`, { size: file.size });
          continue;
        }

        // Check if file should be included based on path
        const relativePath = file.webkitRelativePath.split('/').slice(1).join('/');
        if (!shouldIncludeFile(relativePath)) {
          continue;
        }

        // Check if file is binary
        if (await isBinaryFile(file)) {
          continue;
        }

        // Read file content using our safe method
        const content = await this.readFileContent(file);

        processedChunk.push({
          path: relativePath,
          content,
          size: file.size,
          priority: this.getPriorityScore(relativePath)
        });

        this.totalSize += file.size;
        if (this.totalSize > IMPORT_CONFIG.MAX_TOTAL_SIZE) {
          throw new Error(`Total size limit of ${IMPORT_CONFIG.MAX_TOTAL_SIZE / (1024 * 1024)} MB exceeded`);
        }

      } catch (error) {
        logStore.logError(`Error processing file: ${file.name}`, error);
      }
    }

    return processedChunk;
  }

  public async processFiles(files: File[]): Promise<ProcessedFile[]> {
    const startTime = Date.now();
    this.processedFiles = [];
    this.totalSize = 0;

    try {
      // Initial scan
      this.updateProgress('scanning', 0, files.length, 'Scanning repository...');
      
      // Sort files by priority
      const sortedFiles = [...files].sort((a, b) => 
        this.getPriorityScore(b.webkitRelativePath) - this.getPriorityScore(a.webkitRelativePath)
      );

      // Process files in chunks
      for (let i = 0; i < sortedFiles.length; i += IMPORT_CONFIG.CHUNK_SIZE) {
        const chunk = await this.processFileChunk(
          sortedFiles,
          i,
          IMPORT_CONFIG.CHUNK_SIZE
        );
        
        this.processedFiles.push(...chunk);

        this.updateProgress(
          'processing',
          Math.min(i + IMPORT_CONFIG.CHUNK_SIZE, sortedFiles.length),
          sortedFiles.length,
          `Processed ${this.processedFiles.length} files...`
        );

        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const duration = (Date.now() - startTime) / 1000;
      logStore.logSystem('Import completed', {
        fileCount: this.processedFiles.length,
        totalSize: this.totalSize,
        duration
      });

      return this.processedFiles;

    } catch (error) {
      logStore.logError('Import failed', error);
      throw error;
    }
  }
}