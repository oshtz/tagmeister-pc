import axios from 'axios';
import { invoke } from '@tauri-apps/api/core';

function isTauri() {
  // Tauri injects window.__TAURI__ in the WebView
  return !!(window as any).__TAURI__;
}

export class OllamaService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://127.0.0.1:11434') {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch all available models from Ollama.
   * No filtering is applied; all models are returned.
   */
  async fetchModels(): Promise<Array<{ id: string; name: string }>> {
    try {
      if (isTauri()) {
        // Use Rust proxy in Tauri build
        const result = await invoke<string>('proxy_ollama_request', {
          endpoint: 'tags',
          request_data: '',
        });
        const data = JSON.parse(result);
        const models = data.models || [];
        return models.map((model: any) => ({
          id: model.name,
          name: model.name,
        }));
      } else {
        // Dev mode: direct HTTP
        const response = await axios.get(`${this.baseUrl}/api/tags`);
        const models = response.data.models || [];
        return models.map((model: any) => ({
          id: model.name,
          name: model.name,
        }));
      }
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      return [];
    }
  }

  /**
   * Generate a caption for an image using Ollama's API.
   * @param imagePath Path to the image file
   * @param model Ollama model to use (e.g., "llava")
   * @param promptText Prompt to use
   * @param onChunk Optional callback for streaming chunks
   */
  async generateImageCaption(
    imagePath: string,
    model: string,
    promptText: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    // Read the image file as base64
    const imageBase64 = await this.getBase64FromImagePath(imagePath);

    // Prepare the payload for Ollama API
    const payload = {
      model,
      prompt: promptText,
      stream: !!onChunk,
      images: [imageBase64],
    };

    if (onChunk) {
      // Streaming mode: not supported via proxy, fallback to direct fetch in dev
      if (isTauri()) {
        throw new Error('Streaming mode is not supported in Tauri build for Ollama');
      }
      // Dev mode: direct fetch
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get stream reader');

      let fullContent = '';
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim() === '') continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              fullContent += parsed.response;
              onChunk(parsed.response);
            }
            if (parsed.done) {
              return fullContent;
            }
          } catch (e) {
            // Ignore parse errors for incomplete lines
          }
        }
      }
      // Process any remaining data
      if (buffer.trim() !== '') {
        try {
          const parsed = JSON.parse(buffer);
          if (parsed.response) {
            fullContent += parsed.response;
            onChunk(parsed.response);
          }
        } catch (e) {
          // Ignore
        }
      }
      return fullContent;
    } else {
      // Non-streaming mode
      if (isTauri()) {
        // Use Rust proxy in Tauri build
        const result = await invoke<string>('proxy_ollama_request', {
          endpoint: 'generate',
          request_data: JSON.stringify(payload),
        });
        const data = JSON.parse(result);
        // The response is a single object with a 'response' field
        return data.response;
      } else {
        // Dev mode: direct HTTP
        const response = await axios.post(
          `${this.baseUrl}/api/generate`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        // The response is a single object with a 'response' field
        return response.data.response;
      }
    }
  }

  /**
   * Get base64 encoding of an image file
   */
  private async getBase64FromImagePath(imagePath: string): Promise<string> {
    try {
      const fs = await import('@tauri-apps/plugin-fs');
      const binaryData = await fs.readFile(imagePath);
      return this.arrayBufferToBase64(binaryData);
    } catch (error) {
      console.error('Error reading image file:', error);
      throw new Error(`Failed to read image file: ${error}`);
    }
  }

  /**
   * Convert an ArrayBuffer to a base64 string
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
