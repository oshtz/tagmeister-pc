import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class OpenAIService {
  final String apiKey;
  final String baseUrl = 'https://api.openai.com/v1/chat/completions';

  OpenAIService(this.apiKey);

  Future<String> generateImageCaption(String imagePath, String model, {String promptStyle = 'Natural Language Style'}) async {
    final imageFile = File(imagePath);
    if (!await imageFile.exists()) {
      throw Exception('Image file not found');
    }

    final bytes = await imageFile.readAsBytes();
    final base64Image = base64Encode(bytes);

    String promptText;
    
    if (promptStyle == 'Booru SDXL Style') {
      promptText = "Generate a list of tags for this image in the style of Booru image boards and SDXL prompts. Focus on describing the visual elements, subjects, objects, settings, colors, lighting, composition, artistic style, and other relevant attributes. Format the output as a comma-separated list of tags without numbering or bullet points. Be specific and detailed, but keep each tag concise (1-3 words typically). Include tags for the main subject, background elements, colors, lighting, composition, style, medium, and any notable features. Do not include explanatory text or categorization headers - just provide the raw comma-separated tag list.";
    } else {
      // Default to Natural Language Style
      promptText = "Describe this image in one concise paragraph, starting immediately with the primary subject (e.g., 'A watch,' 'A landscape,' 'A person'). Focus on key elements, their relationships, and notable details. Be specific and direct, avoiding any introductory phrases like 'The image shows' or 'I can see.' Prioritize the most important aspects and describe them factually. Identify the main subject quickly and accurately, noting its dominant characteristics such as size, color, shape, or position. For multiple elements, describe their spatial relationships. Include relevant details about composition, color schemes, lighting, and textures. Mention any actions, movements, functions, or unique features of objects, and appearances or behaviors of people or animals. Include any visible text, logos, or recognizable symbols. Describe what you see literally, without interpreting the image's style (e.g., don't use terms like 'stylized,' 'illustration,' or mention artistic techniques). Treat every subject as a real object or scene, not as a representation. Use varied and precise vocabulary to create a vivid description while maintaining a neutral tone. Avoid subjective interpretations unless crucial to understanding the image's content.";
    }

    final response = await http.post(
      Uri.parse(baseUrl),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $apiKey',
      },
      body: jsonEncode({
        'model': model,
        'messages': [
          {
            'role': 'user',
            'content': [
              {
                'type': 'text',
                'text': promptText
              },
              {
                'type': 'image_url',
                'image_url': {
                  'url': 'data:image/jpeg;base64,$base64Image'
                }
              }
            ]
          }
        ],
        'max_tokens': 300,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['choices'][0]['message']['content'];
    } else {
      throw Exception('Failed to generate caption: ${response.body}');
    }
  }

  String processCaption(String caption) {
    var processedCaption = caption.trim();

    // Replace periods with commas, except for the last one
    final components = processedCaption.split('.');
    processedCaption = components.asMap().entries.map((entry) {
      final trimmed = entry.value.trim();
      return entry.key == components.length - 1 ? trimmed : '$trimmed,';
    }).join(' ');

    return processedCaption.trim();
  }
}
