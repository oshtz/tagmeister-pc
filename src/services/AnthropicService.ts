import axios from 'axios';
import { invoke } from '@tauri-apps/api/core';

export class AnthropicService {
  private apiKey: string;
  private baseUrl: string = 'https://api.anthropic.com/v1/messages';
  private anthropicVersion: string = '2023-06-01';
  private debug: boolean = false;

  constructor(apiKey: string, debug: boolean = false) {
    this.apiKey = apiKey;
    this.debug = debug;
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
   * Generate a caption for an image using Anthropic's Claude API
   * @param imagePath Path to the image file
   * @param model Claude model to use
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
      console.log(`[AnthropicService] Starting caption generation for ${imagePath}`);
      
      // Read the image file as base64 and detect media type
      const { base64Data, mediaType } = await this.getBase64FromImagePath(imagePath);
      
      console.log(`[AnthropicService] Using model: ${model}`);
      console.log(`[AnthropicService] Media type detected: ${mediaType}`);
      console.log(`[AnthropicService] Base64 data length: ${base64Data.length} characters`);
      
      // Determine the prompt text based on the style
      let promptText: string;
      
      if (promptStyle === 'SDXL (Booru Tags)') {
        promptText = "Generate a list of tags for this image in the style of Booru image boards and SDXL prompts. Focus on describing the visual elements, subjects, objects, settings, colors, lighting, composition, artistic style, and other relevant attributes. Format the output as a comma-separated list of tags without numbering or bullet points. Be specific and detailed, but keep each tag concise (1-3 words typically). Include tags for the main subject, background elements, colors, lighting, composition, style, medium, and any notable features. Do not include explanatory text or categorization headers - just provide the raw comma-separated tag list. Make sure to include mostly single-word tags, you can use some double-word tags if needed but mostly single word if possible.";
      } else {
        // Default to Natural Language Style
        promptText = "Describe this image in one concise paragraph, starting immediately with the primary subject (e.g., 'A watch,' 'A landscape,' 'A person'). Focus on key elements, their relationships, and notable details. Be specific and direct, avoiding any introductory phrases like 'The image shows' or 'I can see.' Prioritize the most important aspects and describe them factually. Identify the main subject quickly and accurately, noting its dominant characteristics such as size, color, shape, or position. For multiple elements, describe their spatial relationships. Include relevant details about composition, color schemes, lighting, and textures. Mention any actions, movements, functions, or unique features of objects, and appearances or behaviors of people or animals. Include any visible text, logos, or recognizable symbols. Describe what you see literally, without interpreting the image's style (e.g., don't use terms like 'stylized,' 'illustration,' or mention artistic techniques). Treat every subject as a real object or scene, not as a representation. Use varied and precise vocabulary to create a vivid description while maintaining a neutral tone. Avoid subjective interpretations unless crucial to understanding the image's content.";
      }

      // Create request payload for Claude
      const payload = {
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data
                }
              },
              {
                type: 'text',
                text: promptText
              }
            ]
          }
        ],
        max_tokens: 300,
        stream: false, // Disable streaming for now since we're using the proxy
      };
      
      // Log the request payload (excluding the actual image data for brevity)
      // Use a deep clone to avoid mutating the real payload
      const debugPayload = JSON.parse(JSON.stringify(payload));
      if (debugPayload.messages && debugPayload.messages[0]?.content) {
        const contentCopy = [...debugPayload.messages[0].content];
        for (let i = 0; i < contentCopy.length; i++) {
          const item = contentCopy[i];
          if (item && item.type === 'image' && item.source && item.source.data) {
            contentCopy[i] = {
              ...item,
              source: {
                type: 'base64',
                media_type: mediaType,
                data: `[base64 data of length ${base64Data.length}]`
              }
            };
          }
        }
        debugPayload.messages[0].content = contentCopy;
      }
      console.log('[AnthropicService] Request payload:', JSON.stringify(debugPayload, null, 2));

      console.log('[AnthropicService] Calling Rust proxy function');
      
      try {
        // Use Tauri's invoke to call the Rust function that proxies the request
        const responseText = await invoke<string>('proxy_anthropic_request', {
          apiKey: this.apiKey,
          requestData: JSON.stringify(payload)
        });
        
        console.log('[AnthropicService] Received response from Rust proxy');
        
        // Parse the response
        const responseData = JSON.parse(responseText);
        console.log('[AnthropicService] Parsed response data');
        
        // If streaming was requested, we'll just return the full response at once
        // since our proxy doesn't support streaming yet
        if (onChunk && responseData.content) {
          console.log('[AnthropicService] Processing response for streaming callback');
          
          // Find the text content
          let textContent = '';
          if (Array.isArray(responseData.content)) {
            for (const item of responseData.content) {
              if (item.type === 'text') {
                textContent = item.text;
                break;
              }
            }
          }
          
          if (textContent) {
            console.log('[AnthropicService] Calling onChunk with text content');
            onChunk(textContent);
          }
          
          return textContent;
        }
        
        // Extract text from Claude's response format
        if (responseData.content && Array.isArray(responseData.content)) {
          console.log('[AnthropicService] Extracting text from response content array');
          
          // Find the first text content
          for (const item of responseData.content) {
            if (item.type === 'text') {
              console.log('[AnthropicService] Found text content, returning');
              return item.text;
            }
          }
          
          console.error('[AnthropicService] No text content found in response');
          throw new Error('No text content found in Claude response');
        } else {
          console.error('[AnthropicService] Unexpected response format:', JSON.stringify(responseData));
          throw new Error(`Unexpected response format from Claude: ${JSON.stringify(responseData)}`);
        }
      } catch (invokeError) {
        console.error('[AnthropicService] Error invoking Rust function:', invokeError);
        throw new Error(`Error calling Anthropic API via Rust: ${invokeError}`);
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
   * @param caption Raw caption from Claude
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
   * Get base64 encoding of an image file and detect its media type
   * @param imagePath Path to the image file
   * @returns Object containing base64 data and media type
   */
  private async getBase64FromImagePath(imagePath: string): Promise<{ base64Data: string, mediaType: string }> {
    try {
      // Use the Rust function to get the base64 data and media type as a JSON string
      const result = await invoke<string>('read_image_as_base64_with_type', { path: imagePath });
      // Parse the JSON string returned from Rust
      let parsed: { base64Data: string; mediaType: string };
      try {
        parsed = JSON.parse(result);
      } catch (e) {
        throw new Error('Failed to parse base64/mediatype JSON from Rust');
      }
      // Clean the base64 data (remove whitespace, just in case)
      const cleanedBase64 = parsed.base64Data.replace(/[\r\n\t\f\v ]/g, '');
      return { base64Data: cleanedBase64, mediaType: parsed.mediaType };
    } catch (error) {
      console.error('Error reading image file:', error);
      throw new Error(`Failed to read image file: ${error}`);
    }
  }

  /**
   * Determine the media type based on file extension
   * @param path File path
   * @returns Media type string (e.g., 'image/jpeg', 'image/png')
   */
  private getMediaTypeFromPath(path: string): string {
    const extension = path.toLowerCase().split('.').pop() || '';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        // Default to JPEG if unknown
        console.warn(`[AnthropicService] Unknown file extension: ${extension}, defaulting to image/jpeg`);
        return 'image/jpeg';
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
