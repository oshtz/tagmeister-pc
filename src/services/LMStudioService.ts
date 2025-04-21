import axios from 'axios';

export class LMStudioService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:1234/v1') {
    this.baseUrl = baseUrl;
  }

  async fetchVisionModels(): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await axios.get(`${this.baseUrl}/models`);
      const models = response.data.data || [];

      // Return all models as {id, name}
      return models.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
      }));
    } catch (error) {
      console.error('Error fetching LM Studio models:', error);
      return [];
    }
  }

  /**
   * Generate a caption for an image using LM Studio's OpenAI-compatible API.
   * @param imagePath Path to the image file
   * @param model LM Studio model to use
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

    // Prepare the payload for OpenAI-compatible API
    const payload = {
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: promptText,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
      stream: !!onChunk,
    };

    if (onChunk) {
      // Streaming mode
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer lm-studio', // LM Studio ignores this, but OpenAI clients require it
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LM Studio API error: ${response.status} ${errorText}`);
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
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim() === '') continue;
          const parsed = this.parseSSELine(line);
          if (parsed && !parsed.done) {
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          }
        }
      }
      // Process any remaining data
      if (buffer.trim() !== '') {
        const parsed = this.parseSSELine(buffer);
        if (parsed && !parsed.done) {
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            onChunk(content);
          }
        }
      }
      return fullContent;
    } else {
      // Non-streaming mode
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer lm-studio',
          },
        }
      );
      return response.data.choices[0].message.content;
    }
  }

  /**
   * Parse a line of SSE data to extract the JSON content
   */
  private parseSSELine(line: string): any {
    if (line.startsWith('data: ')) {
      const jsonStr = line.substring(6);
      if (jsonStr.trim() === '[DONE]') {
        return { done: true };
      }
      try {
        return JSON.parse(jsonStr);
      } catch (error) {
        console.error('Error parsing SSE JSON:', error);
        return null;
      }
    }
    return null;
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
