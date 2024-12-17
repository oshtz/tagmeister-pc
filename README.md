# tagmeister

A Windows desktop application for efficient image captioning using OpenAI's API.
tagmeister helps you organize and caption your datasets with ease.

## Features

- Browse and view images from any directory
- Generate AI-powered image captions using GPT models
- Edit captions manually, save captions automatically
- Keyboard shortcuts for efficient navigation
- Batch processing support
- Resizable panels for customizable layout

## Requirements

- Windows 10 or later
- OpenAI API key

## Installation

1. Download the latest release (tagmeister-portable.exe)
2. Run the executable
3. Enter your OpenAI API key in the settings
4. Start captioning your images!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/tagmeister.git

# Navigate to the project directory
cd tagmeister

# Install dependencies
flutter pub get

# Run the app in debug mode
flutter run -d windows
```

## Building

To build a release version:

```bash
# Create a release build
flutter build windows --release
```

## Usage

1. Click the folder icon to select an image directory
2. Select images from the left panel
3. Click "Generate" to create AI captions
4. Edit captions as needed
5. Captions are automatically saved as .txt files alongside your images

## Privacy & Security

- API keys are stored locally in app preferences
- No data is sent to external servers except OpenAI's API
- All processing is done locally except for AI caption generation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
