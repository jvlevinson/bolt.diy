import React, { useState } from 'react';
import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { ImportProcessor } from '~/utils/importProcessor';
import { createChatFromFolder } from '~/utils/folderImport';
import { logStore } from '~/lib/stores/logs';
import type { ImportProgress } from '~/types/import';

interface ImportFolderButtonProps {
  className?: string;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
}

export const ImportFolderButton: React.FC<ImportFolderButtonProps> = ({ className, importChat }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const folderName = files[0]?.webkitRelativePath.split('/')[0] || 'Unknown Folder';

    if (files.length === 0) {
      toast.error('No files selected');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading(`Analyzing ${folderName}...`);

    try {
      // Create a new processor instance with progress callback
      const processor = new ImportProcessor((progress) => {
        setProgress(progress);
      });

      // Process the files
      const processedFiles = await processor.processFiles(files);
      
      // Create chat messages from processed files
      const messages = await createChatFromFolder(
        processedFiles.map(f => ({ content: f.content, path: f.path })),
        [], // binary files are already filtered out
        folderName
      );

      if (importChat) {
        await importChat(folderName, messages);
      }

      logStore.logSystem('Folder imported successfully', {
        folderName,
        fileCount: processedFiles.length,
      });

      toast.success(`Imported ${processedFiles.length} files successfully`);
    } catch (error) {
      logStore.logError('Failed to import folder', error, { folderName });
      console.error('Failed to import folder:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import folder');
    } finally {
      setIsLoading(false);
      setProgress(null);
      toast.dismiss(loadingToast);
      e.target.value = '';
    }
  };

  const getProgressText = (progress: ImportProgress) => {
    const percent = Math.round((progress.processed / progress.total) * 100);
    return `${progress.stage} ${percent}%: ${progress.details}`;
  };

  return (
    <>
      <input
        type="file"
        id="folder-import"
        className="hidden"
        webkitdirectory=""
        directory=""
        onChange={handleFileChange}
        {...({} as any)}
      />
      <button
        onClick={() => document.getElementById('folder-import')?.click()}
        className={className}
        disabled={isLoading}
      >
        <div className="i-ph:upload-simple" />
        {isLoading && progress ? getProgressText(progress) : 'Import Folder'}
      </button>
    </>
  );
};