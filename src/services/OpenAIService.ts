import axios from 'axios';

export class OpenAIService {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Parse a line of SSE data to extract the JSON content
   * @param line Line of SSE data
   * @returns Parsed JSON object or null if not valid
   */
  private parseSSELine(line: string): any {
    // Check if the line starts with 'data: '
    if (line.startsWith('data: ')) {
      // Remove the 'data: ' prefix
      const jsonStr = line.substring(6);
      
      // Handle the [DONE] message
      if (jsonStr.trim() === '[DONE]') {
        return { done: true };
      }
      
      // Try to parse the JSON
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
   * Generate a caption for an image using OpenAI's API
   * @param imagePath Path to the image file
   * @param model OpenAI model to use
   * @param promptStyle Style of prompt to use: 'FLUX (Natural Language)' or 'SDXL (Booru Tags)'
   * @param onChunk Optional callback function to handle streaming chunks
   * @returns Generated caption
   */
  async generateImageCaption(
    imagePath: string,
    model: string,
    promptStyle: string = 'FLUX (Natural Language)',
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    try {
      // Read the image file as base64
      const imageBase64 = await this.getBase64FromImagePath(imagePath);
      
      // Determine the prompt text based on the style
      let promptText: string;
      
      if (promptStyle === 'SDXL (Booru Tags)') {
        promptText = "Generate a list of tags for this image in the style of Booru image boards and SDXL prompts. Focus on describing the visual elements, subjects, objects, settings, colors, lighting, composition, artistic style, and other relevant attributes. Format the output as a comma-separated list of tags without numbering or bullet points. Be specific and detailed, but keep each tag concise (1-3 words typically). Include tags for the main subject, background elements, colors, lighting, composition, style, medium, and any notable features. Do not include explanatory text or categorization headers - just provide the raw comma-separated tag list. Make sure to include mostly single-word tags, you can use some double-word tags if needed but mostly single word if possible.";
      } else {
        // Default to Natural Language Style
        promptText = "Describe this image in one concise paragraph, starting immediately with the primary subject (e.g., 'Watch,' 'Landscape,' 'Person'). Focus on key elements, their relationships, and notable details. Be specific and direct, avoiding any introductory phrases like 'The image shows' or 'I can see.' Prioritize the most important aspects and describe them factually. Identify the main subject quickly and accurately, noting its dominant characteristics such as size, color, shape, or position. For multiple elements, describe their spatial relationships. Include relevant details about composition, color schemes, lighting, and textures. Mention any actions, movements, functions, or unique features of objects, and appearances or behaviors of people or animals. Include any visible text, logos, or recognizable symbols. Describe what you see literally, without interpreting the image's style (e.g., don't use terms like 'stylized,' 'illustration,' or mention artistic techniques). Treat every subject as a real object or scene, not as a representation. Use varied and precise vocabulary to create a vivid description while maintaining a neutral tone. Avoid subjective interpretations unless crucial to understanding the image's content.";
      }

      // If streaming is requested (onChunk callback provided)
      if (onChunk) {
        // Create request payload
        const payload = {
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: promptText
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 300,
          stream: true, // Enable streaming
        };

        // Make streaming request
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload)
        });

        // Check if response is ok
        if (!response.ok) {
          const errorText = await response.text();
          // Check for specific error types
          if (response.status === 429) {
            throw new Error(`API rate limit exceeded: ${response.status} ${errorText}`);
          } else if (response.status === 401) {
            throw new Error(`API authentication failed: ${response.status} ${errorText}`);
          } else if (response.status === 400) {
            throw new Error(`API bad request: ${response.status} ${errorText}`);
          } else {
            throw new Error(`API request failed: ${response.status} ${errorText}`);
          }
        }

        // Get the response body as a ReadableStream
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get stream reader');
        }

        // Process the stream
        let fullContent = '';
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Decode the chunk and add it to our buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines in the buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
          
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
        // Non-streaming request (original implementation)
        try {
          const response = await axios.post(
            this.baseUrl,
            {
              model: model,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: promptText
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:image/jpeg;base64,${imageBase64}`
                      }
                    }
                  ]
                }
              ],
              max_tokens: 300,
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
              },
            }
          );

          return response.data.choices[0].message.content;
        } catch (error) {
          // Handle axios errors
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const errorData = error.response?.data;
            
            if (status === 429) {
              throw new Error(`API rate limit exceeded: ${status} ${JSON.stringify(errorData)}`);
            } else if (status === 401) {
              throw new Error(`API authentication failed: ${status} ${JSON.stringify(errorData)}`);
            } else if (status === 400) {
              throw new Error(`API bad request: ${status} ${JSON.stringify(errorData)}`);
            } else {
              throw new Error(`API request failed: ${status} ${JSON.stringify(errorData)}`);
            }
          }
          // Re-throw if not an axios error
          throw error;
        }
      }
    } catch (error) {
      console.error('Error generating caption:', error);
      // Pass through the error with its original message
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Failed to generate caption: ${error}`);
      }
    }
  }

  /**
   * Process the caption to replace periods with commas
   * @param caption Raw caption from OpenAI
   * @returns Processed caption
   */
  processCaption(caption: string): string {
    let processedCaption = caption.trim();

    // Replace periods with commas, except for the last one
    const components = processedCaption.split('.');
    processedCaption = components.map((component, index) => {
      const trimmed = component.trim();
      return index === components.length - 1 ? trimmed : `${trimmed},`;
    }).join(' ');

    return processedCaption.trim();
  }

  /**
   * Get base64 encoding of an image file
   * @param imagePath Path to the image file
   * @returns Base64 encoded image
   */
  private async getBase64FromImagePath(imagePath: string): Promise<string> {
    try {
      // Import the fs plugin from Tauri
      const fs = await import('@tauri-apps/plugin-fs');
      
      // Read the file as a Uint8Array
      const binaryData = await fs.readFile(imagePath);
      
      // Convert the binary data to base64
      return this.arrayBufferToBase64(binaryData);
    } catch (error) {
      console.error('Error reading image file:', error);
      throw new Error(`Failed to read image file: ${error}`);
    }
  }

  /**
   * Convert an ArrayBuffer to a base64 string
   * @param buffer ArrayBuffer to convert
   * @returns Base64 string
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
