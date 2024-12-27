// /utils/importConfig.ts

export const IMPORT_CONFIG = {
    // Chunk settings
    CHUNK_SIZE: 500,
    MAX_CONCURRENT_CHUNKS: 3,
    
    // File limits
    MAX_SINGLE_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_TOTAL_SIZE: 1024 * 1024 * 1024, // 1GB
    
    // Processing settings
    BINARY_CHECK_SAMPLE_SIZE: 8192, // 8KB sample for binary detection
    
    // Performance optimization
    DEBOUNCE_DELAY: 100,
    
    // File type priorities (process these first)
    PRIORITY_FILES: [
      'package.json',
      'composer.json',
      'requirements.txt',
      'go.mod',
      'Cargo.toml'
    ]
  };