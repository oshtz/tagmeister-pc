import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, readDir, exists, create as createFs } from '@tauri-apps/plugin-fs';
import { basename, extname, dirname, join, sep } from '@tauri-apps/api/path';
import { appDataDir } from '@tauri-apps/api/path';

// Define a type for our file entries
type FileInfo = {
  path: string;
  name: string;
};

interface Caption {
  [key: string]: string;
}

interface AppState {
  directorySelectionError: string | null;
  // Directory and image selection
  currentDirectory: string | null;
  selectedImage: string | null;
  lastSelectedImage: string | null;
  selectedImages: Set<string>;
  imageFiles: FileInfo[];
  
  // Captions
  captions: Caption;
  
  // Settings
  apiKey: string; // OpenAI API key
  apiKeyVisible: boolean;
  anthropicApiKey: string; // Anthropic API key
  anthropicApiKeyVisible: boolean;
  prefixText: string;
  suffixText: string;
  selectedModel: string;
  selectedPromptStyle: string;
  isDarkMode: boolean;
  fontSize: number;
  leftPanelWidth: number;
  rightPanelWidth: number;

  // LM Studio integration
  lmStudioBaseUrl: string;
  lmStudioAvailable: boolean;
  lmStudioModels: Array<{ id: string; name: string }>;

  // Ollama integration
  ollamaBaseUrl: string;
  ollamaAvailable: boolean;
  ollamaModels: Array<{ id: string; name: string }>;

  // Processing state
  isInitialized: boolean;
  isProcessing: boolean;
  processedCount: number;
  totalToProcess: number;
  shouldInterrupt: boolean;
  
  // Actions
  toggleApiKeyVisibility: () => void;
  toggleAnthropicApiKeyVisibility: () => void;
  setProcessingState: (isProcessing: boolean, total?: number) => void;
  incrementProcessedCount: () => void;
  setShouldInterrupt: (shouldInterrupt: boolean) => void;
  checkShouldInterrupt: (reset?: boolean) => boolean;
  initialize: () => Promise<void>;
  toggleImageSelection: (path: string) => void;
  clearImageSelection: () => void;
  setSelectedImage: (path: string) => void;
  setApiKey: (key: string) => void;
  setAnthropicApiKey: (key: string) => void;
  setCurrentDirectory: (path: string) => Promise<void>;
  toggleTheme: () => void;
  setModel: (model: string) => void;
  getProviderForModel: (model: string) => 'openai' | 'anthropic' | 'lmstudio' | 'ollama';
  setFontSize: (size: number) => void;
  adjustFontSize: (adjustment: number) => void;
  selectAll: () => void;
  handleImageClick: (path: string, options: { isCtrlPressed?: boolean, isShiftPressed?: boolean }) => void;
  setPromptStyle: (style: string) => void;
  updateCaption: (imagePath: string, caption: string) => void;
  saveCaption: (imagePath: string, caption: string) => Promise<void>;
  selectDirectory: () => Promise<void>;
  setPanelWidth: (panel: 'left' | 'right', width: number) => void;

  // LM Studio actions
  setLMStudioBaseUrl: (url: string) => void;
  checkLMStudioConnection: () => Promise<boolean>;
  fetchLMStudioModels: () => Promise<void>;

  // Ollama actions
  setOllamaBaseUrl: (url: string) => void;
  checkOllamaConnection: () => Promise<boolean>;
  fetchOllamaModels: () => Promise<void>;
  
  // Helper methods
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  loadImagesFromDirectory: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  directorySelectionError: null,
  currentDirectory: null,
  selectedImage: null,
  lastSelectedImage: null,
  selectedImages: new Set(),
  imageFiles: [],
  captions: {},
  apiKey: '',
  apiKeyVisible: false,
  anthropicApiKey: '',
  anthropicApiKeyVisible: false,
  prefixText: '',
  suffixText: '',
  selectedModel: 'gpt-4o-mini',
  selectedPromptStyle: 'FLUX (Natural Language)',
  isDarkMode: true,
  fontSize: 14.0,
  leftPanelWidth: 0.2,
  rightPanelWidth: 0.2,
  // LM Studio
  lmStudioBaseUrl: 'http://localhost:1234/v1',
  lmStudioAvailable: false,
  lmStudioModels: [],

  // Ollama
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaAvailable: false,
  ollamaModels: [],

  isInitialized: false,
  isProcessing: false,
  processedCount: 0,
  totalToProcess: 0,
  shouldInterrupt: false,
  
  // Actions
  toggleApiKeyVisibility: () => set(state => ({ apiKeyVisible: !state.apiKeyVisible })),
  toggleAnthropicApiKeyVisibility: () => set(state => ({ anthropicApiKeyVisible: !state.anthropicApiKeyVisible })),
  
  setProcessingState: (isProcessing, total = 0) => set({
    isProcessing,
    totalToProcess: total,
    processedCount: 0
  }),
  
  incrementProcessedCount: () => set(state => ({ 
    processedCount: state.processedCount + 1 
  })),
  
  setShouldInterrupt: (shouldInterrupt) => set({ shouldInterrupt }),
  
  checkShouldInterrupt: (reset = false) => {
    const shouldInterrupt = get().shouldInterrupt;
    if (reset && shouldInterrupt) {
      set({ shouldInterrupt: false });
    }
    return shouldInterrupt;
  },
  
  initialize: async () => {
    await get().loadSettings();
    if (get().currentDirectory) {
      await get().loadImagesFromDirectory();
    }
    set({ isInitialized: true });
  },
  
  toggleImageSelection: (path) => {
    const { selectedImages, selectedImage } = get();
    const newSelectedImages = new Set(selectedImages);
    
    if (newSelectedImages.has(path)) {
      newSelectedImages.delete(path);
      const newSelectedImage = newSelectedImages.size > 0 
        ? Array.from(newSelectedImages).pop() || null
        : null;
      set({ selectedImages: newSelectedImages, selectedImage: newSelectedImage });
    } else {
      newSelectedImages.add(path);
      set({ selectedImages: newSelectedImages, selectedImage: path });
    }
  },
  
  clearImageSelection: () => set({ 
    selectedImages: new Set(), 
    selectedImage: null 
  }),
  
  setSelectedImage: (path) => {
    const { selectedImage } = get();
    if (selectedImage === path) {
      get().toggleImageSelection(path);
    } else {
      set({ 
        selectedImage: path, 
        selectedImages: new Set([path]) 
      });
    }
  },
  
  setApiKey: (key) => {
    set({ apiKey: key });
    get().saveSettings();
  },
  
  setAnthropicApiKey: (key) => {
    set({ anthropicApiKey: key });
    get().saveSettings();
  },
  
  setCurrentDirectory: async (path) => {
    set({ currentDirectory: path });
    console.log('Setting current directory:', path);
    await get().loadImagesFromDirectory();
    get().saveSettings();
  },
  
  toggleTheme: () => {
    set(state => ({ isDarkMode: !state.isDarkMode }));
    get().saveSettings();
  },
  
  setModel: (model) => {
    set({ selectedModel: model });
    get().saveSettings();
  },

  getProviderForModel: (model: string) => {
    // Determine the provider based on the model name
    if (model.startsWith('claude')) {
      return 'anthropic';
    } else if (model.startsWith('lmstudio:')) {
      return 'lmstudio';
    } else if (model.startsWith('ollama:')) {
      return 'ollama';
    } else {
      return 'openai';
    }
  },
  
  setFontSize: (size) => {
    set({ fontSize: size });
    get().saveSettings();
  },
  
  adjustFontSize: (adjustment) => {
    set(state => {
      let newSize = state.fontSize + adjustment;
      if (newSize < 8) newSize = 8;
      if (newSize > 32) newSize = 32;
      return { fontSize: newSize };
    });
    get().saveSettings();
  },
  
  selectAll: async () => {
    const { currentDirectory, imageFiles } = get();
    if (!currentDirectory) return;
    
    try {
      // Use the existing imageFiles from state
      const imagePaths = imageFiles.map(file => file.path);
      const newSelectedImages = new Set<string>(imagePaths);
      
      set({ 
        selectedImages: newSelectedImages,
        selectedImage: imagePaths.length > 0 ? imagePaths[0] : null
      });
      
      console.log(`Selected all ${imagePaths.length} images`);
    } catch (error) {
      console.error('Error selecting all images:', error);
    }
  },
  
  handleImageClick: (path, { isCtrlPressed = false, isShiftPressed = false }) => {
    const { selectedImages, selectedImage, lastSelectedImage, imageFiles } = get();
    
    if (!isCtrlPressed && !isShiftPressed) {
      // Normal click - select only this image
      set({ 
        selectedImages: new Set([path]), 
        selectedImage: path,
        lastSelectedImage: path
      });
    } else if (isCtrlPressed && !isShiftPressed) {
      // Ctrl+click - toggle selection
      const newSelectedImages = new Set(selectedImages);
      
      if (newSelectedImages.has(path)) {
        newSelectedImages.delete(path);
        const newSelectedImage = newSelectedImages.size > 0 
          ? Array.from(newSelectedImages).pop() || null
          : null;
        set({ 
          selectedImages: newSelectedImages, 
          selectedImage: newSelectedImage,
          lastSelectedImage: path
        });
      } else {
        newSelectedImages.add(path);
        set({ 
          selectedImages: newSelectedImages, 
          selectedImage: path,
          lastSelectedImage: path
        });
      }
    } else if (isShiftPressed && lastSelectedImage) {
      // Shift+click - select range
      const allImagePaths = imageFiles.map(file => file.path);
      const startIdx = allImagePaths.indexOf(lastSelectedImage);
      const endIdx = allImagePaths.indexOf(path);
      
      if (startIdx !== -1 && endIdx !== -1) {
        const start = Math.min(startIdx, endIdx);
        const end = Math.max(startIdx, endIdx);
        
        const newSelectedImages = new Set(isCtrlPressed ? selectedImages : []);
        
        // Add all images in the range
        for (let i = start; i <= end; i++) {
          newSelectedImages.add(allImagePaths[i]);
        }
        
        set({ 
          selectedImages: newSelectedImages, 
          selectedImage: path
        });
      }
    }
  },
  
  setPromptStyle: (style) => {
    set({ selectedPromptStyle: style });
    get().saveSettings();
  },
  
  updateCaption: (imagePath, caption) => {
    set(state => ({
      captions: {
        ...state.captions,
        [imagePath]: caption
      }
    }));
  },
  
  saveCaption: async (imagePath, caption) => {
    try {
      // Update the caption in the state first
      get().updateCaption(imagePath, caption);
      
      // Use the Rust function to save the caption
      const result = await invoke<number>('save_captions', { 
        captions: { [imagePath]: caption } 
      });
      
      console.log(`Caption saved: ${result} files updated`);
    } catch (error) {
      console.error('Error saving caption:', error);
      
      // Fallback to the JavaScript implementation if the Rust function fails
      try {
        const captionPath = imagePath.replace(/\.(png|jpg|jpeg|gif)$/i, '.txt');
        await writeTextFile(captionPath, caption);
        console.log('Caption saved (fallback):', captionPath);
      } catch (fallbackError) {
        console.error('Fallback caption save also failed:', fallbackError);
      }
    }
  },
  
  selectDirectory: async () => {
    try {
      console.log('Opening directory selection dialog...');
      
      // Open directory selection dialog
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Image Directory'
      });
      
      console.log('Dialog result:', selected);
      
      if (selected && !Array.isArray(selected)) {
        console.log('Setting current directory to:', selected);
        await get().setCurrentDirectory(selected);
      } else {
        console.log('No directory selected or invalid selection');
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      // Since both the dialog plugin and the fallback failed, show an error message
      console.error('Directory selection failed. Please try again.');
      set({ directorySelectionError: 'Failed to open directory selection dialog. Please try again.' });
    }
  },
  
  // Add panel width setter
  setPanelWidth: (panel, width) => {
    if (panel === 'left') {
      set({ leftPanelWidth: width });
    } else {
      set({ rightPanelWidth: width });
    }
    get().saveSettings();
  },
  
  // LM Studio actions
  setLMStudioBaseUrl: (url: string) => {
    set({ lmStudioBaseUrl: url });
    get().saveSettings();
  },

  checkLMStudioConnection: async () => {
    const { lmStudioBaseUrl } = get();
    try {
      const response = await fetch(`${lmStudioBaseUrl}/models`);
      if (response.ok) {
        set({ lmStudioAvailable: true });
        return true;
      }
    } catch (error) {
      // ignore
    }
    set({ lmStudioAvailable: false, lmStudioModels: [] });
    return false;
  },

  fetchLMStudioModels: async () => {
    const { lmStudioBaseUrl } = get();
    try {
      const { LMStudioService } = await import('../services/LMStudioService');
      const service = new LMStudioService(lmStudioBaseUrl);
      const models = await service.fetchVisionModels();
      set({ lmStudioModels: models, lmStudioAvailable: models.length > 0 });
    } catch (error) {
      set({ lmStudioModels: [], lmStudioAvailable: false });
    }
  },

  // Ollama actions
  setOllamaBaseUrl: (url: string) => {
    set({ ollamaBaseUrl: url });
    get().saveSettings();
  },

  checkOllamaConnection: async () => {
    const { ollamaBaseUrl } = get();
    try {
      const response = await fetch(`${ollamaBaseUrl}/api/tags`);
      if (response.ok) {
        set({ ollamaAvailable: true });
        return true;
      }
    } catch (error) {
      // ignore
    }
    set({ ollamaAvailable: false, ollamaModels: [] });
    return false;
  },

  fetchOllamaModels: async () => {
    const { ollamaBaseUrl } = get();
    try {
      const { OllamaService } = await import('../services/OllamaService');
      const service = new OllamaService(ollamaBaseUrl);
      const models = await service.fetchModels();
      console.log('Fetched Ollama models:', models);
      // ollamaAvailable should be true if the server is up, even if no models
      set({ ollamaModels: models, ollamaAvailable: true });
    } catch (error) {
      set({ ollamaModels: [], ollamaAvailable: false });
    }
  },

  // Helper methods
  loadSettings: async () => {
    try {
      // Set default settings
      set({
        apiKey: '',
        anthropicApiKey: '',
        isDarkMode: true,
        fontSize: 14.0,
        selectedModel: 'gpt-4o-mini',
        selectedPromptStyle: 'FLUX (Natural Language)',
        currentDirectory: null,
        prefixText: '',
        suffixText: '',
        leftPanelWidth: 0.2,
        rightPanelWidth: 0.2,
        lmStudioBaseUrl: 'http://localhost:1234/v1',
        lmStudioAvailable: false,
        lmStudioModels: [],
      });
      
      // Try to load settings from localStorage
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const savedSettings = localStorage.getItem('tagmeister-settings');
          if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            console.log('Loaded settings from localStorage:', settings);
            
            set({
              apiKey: settings.apiKey || '',
              anthropicApiKey: settings.anthropicApiKey || '',
              isDarkMode: settings.isDarkMode !== false,
              fontSize: settings.fontSize || 14.0,
              selectedModel: settings.selectedModel || 'gpt-4o-mini',
              selectedPromptStyle: settings.selectedPromptStyle || 'FLUX (Natural Language)',
              currentDirectory: settings.currentDirectory || null,
              prefixText: settings.prefixText || '',
              suffixText: settings.suffixText || '',
              leftPanelWidth: settings.leftPanelWidth || 0.2,
              rightPanelWidth: settings.rightPanelWidth || 0.2,
              lmStudioBaseUrl: settings.lmStudioBaseUrl || 'http://localhost:1234/v1',
              lmStudioAvailable: false,
              lmStudioModels: [],
            });
          }
        }
      } catch (localStorageError) {
        console.error('Error loading settings from localStorage:', localStorageError);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  },
  
  saveSettings: async () => {
    try {
      const { 
        apiKey,
        anthropicApiKey,
        isDarkMode, 
        fontSize, 
        selectedModel, 
        selectedPromptStyle,
        prefixText,
        suffixText,
        leftPanelWidth,
        rightPanelWidth,
        lmStudioBaseUrl
      } = get();
      
      // Create settings object
      const settings = {
        apiKey,
        anthropicApiKey,
        isDarkMode,
        fontSize,
        selectedModel,
        selectedPromptStyle,
        prefixText,
        suffixText,
        leftPanelWidth,
        rightPanelWidth,
        lmStudioBaseUrl
      };
      
      // Try to save settings to localStorage
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('tagmeister-settings', JSON.stringify(settings));
          console.log('Saved settings to localStorage');
        }
      } catch (localStorageError) {
        console.error('Error saving settings to localStorage:', localStorageError);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },
  
  loadImagesFromDirectory: async () => {
    const { currentDirectory } = get();
    if (!currentDirectory) return;
    
    try {
      // Clear existing captions
      set({ captions: {} });
      
      // Use the Rust function to get directory contents
      const result = await invoke<{
        files: Array<{
          path: string;
          name: string;
          is_dir: boolean;
          size: number;
        }>;
        image_count: number;
      }>('get_directory_contents', { path: currentDirectory });
      
      console.log('Directory contents:', result);
      
      // Filter for image files
      const imageFiles: FileInfo[] = result.files
        .filter(file => !file.is_dir)
        .filter(file => {
          const ext = file.name.split('.').pop()?.toLowerCase();
          return ext === 'jpg' || ext === 'jpeg' || ext === 'png';
        })
        .map(file => ({
          path: file.path,
          name: file.name
        }));
      
      // Load captions for all images
      const newCaptions: Caption = {};
      
      for (const file of imageFiles) {
        const captionPath = file.path.replace(/\.(png|jpg|jpeg|gif)$/i, '.txt');
        try {
          const caption = await readTextFile(captionPath);
          console.log('Loading caption for', file.path, ':', caption);
          newCaptions[file.path] = caption.trim();
        } catch (error) {
          console.log('Caption file not found:', captionPath);
        }
      }
      
      // Set image files and captions in state
      set({ 
        imageFiles,
        captions: newCaptions 
      });
      
      // Set initial selection if needed
      if (imageFiles.length > 0) {
        const { selectedImage } = get();
        if (!selectedImage || !imageFiles.some(f => f.path === selectedImage)) {
          set({
            selectedImage: imageFiles[0].path,
            selectedImages: new Set([imageFiles[0].path])
          });
        }
      } else {
        set({
          selectedImage: null,
          selectedImages: new Set()
        });
      }
    } catch (error) {
      console.error('Error loading images from directory:', error);
    }
  }
}));
