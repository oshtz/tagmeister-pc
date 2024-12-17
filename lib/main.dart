import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:path/path.dart' as p;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:io';
import 'dart:math' as math;
import 'services/openai_service.dart';
import 'package:flutter/services.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final appState = AppState();
  await appState.initialize();
  runApp(
    ChangeNotifierProvider(
      create: (context) => appState,
      child: const TagMeisterApp(),
    ),
  );
}

class AppState extends ChangeNotifier {
  String? currentDirectory;
  String? selectedImage;
  String? lastSelectedImage; // For shift selection
  final Set<String> selectedImages = {};
  final Map<String, String> captions = {};
  String apiKey = '';
  String prefixText = '';
  String suffixText = '';
  String selectedModel = 'gpt-4o-mini';
  bool isDarkMode = true;
  double fontSize = 14.0;
  bool _initialized = false;

  bool get isInitialized => _initialized;

  Future<void> initialize() async {
    await _loadSettings();
    if (currentDirectory != null) {
      await _loadImagesFromDirectory();
    }
    _initialized = true;
    notifyListeners();
  }

  void toggleImageSelection(String path) {
    if (selectedImages.contains(path)) {
      selectedImages.remove(path);
      if (selectedImages.isEmpty) {
        selectedImage = null;
      } else {
        selectedImage = selectedImages.last;
      }
    } else {
      selectedImages.add(path);
      selectedImage = path;
    }
    notifyListeners();
  }

  void clearImageSelection() {
    selectedImages.clear();
    selectedImage = null;
    notifyListeners();
  }

  void setSelectedImage(String path) {
    if (selectedImage == path) {
      toggleImageSelection(path);
    } else {
      selectedImage = path;
      selectedImages.clear();
      selectedImages.add(path);
      notifyListeners();
    }
  }

  void setApiKey(String key) {
    apiKey = key;
    _saveSettings();
    notifyListeners();
  }

  Future<void> setCurrentDirectory(String path) async {
    currentDirectory = path;
    print('Setting current directory: $path'); // Debug print
    await _loadImagesFromDirectory();
    notifyListeners();
  }

  void toggleTheme() {
    isDarkMode = !isDarkMode;
    _saveSettings();
    notifyListeners();
  }

  void setModel(String model) {
    selectedModel = model;
    _saveSettings();
    notifyListeners();
  }

  void setFontSize(double size) {
    fontSize = size;
    _saveSettings();
    notifyListeners();
  }

  void adjustFontSize(int adjustment) {
    fontSize += adjustment;
    if (fontSize < 8) fontSize = 8;
    if (fontSize > 32) fontSize = 32;
    _saveSettings();
    notifyListeners();
  }

  void selectAll() {
    if (currentDirectory == null) return;
    
    final dir = Directory(currentDirectory!);
    if (!dir.existsSync()) return;

    selectedImages.clear();
    final imageFiles = dir
        .listSync()
        .whereType<File>()
        .where((file) => ['.jpg', '.jpeg', '.png']
            .contains(p.extension(file.path).toLowerCase()))
        .toList();

    for (final file in imageFiles) {
      selectedImages.add(file.path);
    }
    
    if (imageFiles.isNotEmpty && selectedImage == null) {
      selectedImage = imageFiles.first.path;
    }
    
    notifyListeners();
  }

  void handleImageClick(String path, {bool isCtrlPressed = false, bool isShiftPressed = false}) {
    if (!isCtrlPressed && !isShiftPressed) {
      // Normal click - select only this image
      selectedImages.clear();
      selectedImages.add(path);
      selectedImage = path;
      lastSelectedImage = path;
    } else if (isCtrlPressed && !isShiftPressed) {
      // Ctrl+click - toggle selection
      if (selectedImages.contains(path)) {
        selectedImages.remove(path);
        selectedImage = selectedImages.isEmpty ? null : selectedImages.last;
      } else {
        selectedImages.add(path);
        selectedImage = path;
      }
      lastSelectedImage = path;
    } else if (isShiftPressed && lastSelectedImage != null) {
      // Shift+click - select range
      final allImages = Directory(currentDirectory!)
          .listSync()
          .whereType<File>()
          .where((file) => ['.jpg', '.jpeg', '.png']
              .contains(p.extension(file.path).toLowerCase()))
          .map((file) => file.path)
          .toList();

      final startIdx = allImages.indexOf(lastSelectedImage!);
      final endIdx = allImages.indexOf(path);
      if (startIdx != -1 && endIdx != -1) {
        final start = math.min(startIdx, endIdx);
        final end = math.max(startIdx, endIdx);
        
        if (!isCtrlPressed) selectedImages.clear();
        selectedImages.addAll(allImages.sublist(start, end + 1));
        selectedImage = path;
      }
    }
    notifyListeners();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    apiKey = prefs.getString('api_key') ?? '';
    isDarkMode = prefs.getBool('is_dark_mode') ?? true;
    fontSize = prefs.getDouble('font_size') ?? 14.0;
    selectedModel = prefs.getString('selected_model') ?? 'gpt-4o-mini';
  }

  Future<void> _saveSettings() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('api_key', apiKey);
    await prefs.setBool('is_dark_mode', isDarkMode);
    await prefs.setDouble('font_size', fontSize);
    await prefs.setString('selected_model', selectedModel);
  }

  Future<void> _loadImagesFromDirectory() async {
    if (currentDirectory == null) return;

    final dir = Directory(currentDirectory!);
    if (!dir.existsSync()) return;

    // Clear existing captions
    captions.clear();
    
    // Get all image files
    final imageFiles = dir
        .listSync()
        .whereType<File>()
        .where((file) => ['.jpg', '.jpeg', '.png']
            .contains(p.extension(file.path).toLowerCase()))
        .toList();

    // Load captions for all images
    for (final file in imageFiles) {
      final captionPath = file.path.replaceAll(RegExp(r'\.(png|jpg|jpeg|gif)$'), '.txt');
      final captionFile = File(captionPath);
      if (await captionFile.exists()) {
        try {
          final caption = await captionFile.readAsString();
          print('Loading caption for ${file.path}: $caption'); // Debug print
          captions[file.path] = caption.trim();
        } catch (e) {
          print('Error loading caption for ${file.path}: $e');
        }
      } else {
        print('Caption file not found: $captionPath'); // Debug print
      }
    }

    // Set initial selection
    if (imageFiles.isNotEmpty) {
      if (selectedImage == null || !imageFiles.any((f) => f.path == selectedImage)) {
        selectedImage = imageFiles.first.path;
        selectedImages.clear();
        selectedImages.add(selectedImage!);
      }
    } else {
      selectedImage = null;
      selectedImages.clear();
    }
    notifyListeners();
  }

  void updateCaption(String imagePath, String caption) {
    captions[imagePath] = caption;
    notifyListeners();
  }
}

class TagMeisterApp extends StatelessWidget {
  const TagMeisterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, child) {
        return MaterialApp(
          title: 'tagmeister',
          theme: appState.isDarkMode 
            ? ThemeData.dark(useMaterial3: true).copyWith(
                primaryColor: Colors.teal,
                colorScheme: ColorScheme.dark(
                  primary: Colors.teal,
                  secondary: Colors.tealAccent,
                  surface: const Color(0xFF1E1E1E),
                ),
              )
            : ThemeData.light(useMaterial3: true).copyWith(
                primaryColor: Colors.teal,
                colorScheme: ColorScheme.light(
                  primary: Colors.teal,
                  secondary: Colors.tealAccent,
                  surface: Colors.grey[50]!,
                ),
              ),
          home: appState.isInitialized
              ? const MainScreen()
              : const Scaffold(
                  body: Center(
                    child: CircularProgressIndicator(),
                  ),
                ),
        );
      },
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  double leftPanelWidth = 0.2;
  double rightPanelWidth = 0.2;
  
  Widget _buildDragHandle() {
    return MouseRegion(
      cursor: SystemMouseCursors.resizeColumn,
      child: Container(
        width: 8,
        height: double.infinity,
        color: Colors.transparent,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Consumer<AppState>(
        builder: (context, appState, child) => Stack(
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 8.0, top: 8.0, bottom: 8.0, right: 4.0),
              child: Row(
                children: [
                  // Left sidebar
                  SizedBox(
                    width: MediaQuery.of(context).size.width * leftPanelWidth - 8,
                    child: Card(
                      margin: EdgeInsets.zero,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    appState.currentDirectory != null 
                                        ? p.basename(appState.currentDirectory!)
                                        : 'Select Directory',
                                    style: const TextStyle(fontSize: 18),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Row(
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.folder_open),
                                      onPressed: () async {
                                        String? selectedDirectory = await FilePicker.platform.getDirectoryPath();
                                        if (selectedDirectory != null) {
                                          appState.setCurrentDirectory(selectedDirectory);
                                        }
                                      },
                                      tooltip: 'Open Directory',
                                    ),
                                    IconButton(
                                      icon: Icon(appState.isDarkMode ? Icons.light_mode : Icons.dark_mode),
                                      onPressed: () => appState.toggleTheme(),
                                      tooltip: appState.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const Expanded(child: ImageList()),
                          if (appState.currentDirectory != null)
                            Padding(
                              padding: const EdgeInsets.all(8.0),
                              child: SizedBox(
                                width: double.infinity,
                                child: TextButton(
                                  onPressed: () => appState.selectAll(),
                                  style: TextButton.styleFrom(
                                    foregroundColor: Theme.of(context).colorScheme.primary,
                                  ),
                                  child: const Text('Select All'),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  
                  // Left drag handle
                  GestureDetector(
                    onHorizontalDragUpdate: (details) {
                      setState(() {
                        leftPanelWidth += details.delta.dx / MediaQuery.of(context).size.width;
                        // Constrain the width between 15% and 40%
                        leftPanelWidth = leftPanelWidth.clamp(0.15, 0.4);
                      });
                    },
                    child: _buildDragHandle(),
                  ),
                  
                  // Main content area
                  SizedBox(
                    width: MediaQuery.of(context).size.width * (1 - leftPanelWidth - rightPanelWidth) - 16,
                    child: Card(
                      margin: EdgeInsets.zero,
                      child: Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            child: Image.asset(
                              appState.isDarkMode ? 'assets/logo_white.png' : 'assets/logo_black.png',
                              height: 20,
                            ),
                          ),
                          Expanded(
                            child: appState.selectedImage != null
                                ? const ImageViewer()
                                : const Center(child: Text('Select a directory first! Use the folder button, top left.', textAlign: TextAlign.center,)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  // Right drag handle
                  GestureDetector(
                    onHorizontalDragUpdate: (details) {
                      setState(() {
                        rightPanelWidth -= details.delta.dx / MediaQuery.of(context).size.width;
                        // Constrain the width between 15% and 40%
                        rightPanelWidth = rightPanelWidth.clamp(0.15, 0.4);
                      });
                    },
                    child: _buildDragHandle(),
                  ),
                  
                  // Right sidebar
                  SizedBox(
                    width: MediaQuery.of(context).size.width * rightPanelWidth - 8,
                    child: Card(
                      margin: EdgeInsets.zero,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // API Key input
                          Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('API Key'),
                                TextField(
                                  obscureText: true,
                                  decoration: const InputDecoration(
                                    border: OutlineInputBorder(),
                                    isDense: true,
                                  ),
                                  controller: TextEditingController(text: appState.apiKey),
                                  onChanged: (value) => appState.setApiKey(value),
                                ),
                              ],
                            ),
                          ),

                          // Model selection
                          Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Model'),
                                DropdownButton<String>(
                                  isExpanded: true,
                                  value: appState.selectedModel,
                                  items: const [
                                    DropdownMenuItem(value: 'gpt-4o-mini', child: Text('gpt-4o-mini')),
                                    DropdownMenuItem(value: 'gpt-4o', child: Text('gpt-4o')),
                                  ],
                                  onChanged: (String? value) {
                                    if (value != null) {
                                      appState.setModel(value);
                                    }
                                  },
                                ),
                              ],
                            ),
                          ),

                          // Auto-Captioner section
                          const Expanded(child: CaptionEditor()),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ImageList extends StatelessWidget {
  const ImageList({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, child) {
        if (appState.currentDirectory == null) {
          return const Center(child: Text('Select a directory'));
        }

        final dir = Directory(appState.currentDirectory!);
        if (!dir.existsSync()) {
          return const Center(child: Text('Directory not found'));
        }

        final files = dir
            .listSync()
            .whereType<File>()
            .where((file) => ['.jpg', '.jpeg', '.png']
                .contains(p.extension(file.path).toLowerCase()))
            .toList();

        if (files.isEmpty) {
          return const Center(child: Text('No images found'));
        }

        return Focus(
          autofocus: true,
          onKey: (FocusNode node, RawKeyEvent event) {
            if (event is RawKeyDownEvent) {
              if (event.logicalKey == LogicalKeyboardKey.keyA && 
                  event.isControlPressed) {
                appState.selectAll();
                return KeyEventResult.handled;
              }
            }
            return KeyEventResult.ignored;
          },
          child: ListView.builder(
            itemCount: files.length,
            itemBuilder: (context, index) {
              final file = files[index];
              final fileName = p.basename(file.path);

              return Consumer<AppState>(
                builder: (context, state, _) => Card(
                  color: state.selectedImages.contains(file.path)
                      ? Theme.of(context).colorScheme.primaryContainer
                      : (state.isDarkMode 
                          ? Theme.of(context).colorScheme.surface
                          : Theme.of(context).cardColor),
                  child: InkWell(
                    onTap: () {
                      final isCtrlPressed = 
                          HardwareKeyboard.instance.isControlPressed;
                      final isShiftPressed = 
                          HardwareKeyboard.instance.isShiftPressed;
                      state.handleImageClick(
                        file.path,
                        isCtrlPressed: isCtrlPressed,
                        isShiftPressed: isShiftPressed,
                      );
                    },
                    onLongPress: () => state.toggleImageSelection(file.path),
                    child: Stack(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: Image.file(
                                  File(file.path),
                                  width: 60,
                                  height: 60,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Consumer<AppState>(
                                  builder: (context, state, _) {
                                    final isDark = state.isDarkMode;
                                    final textColor = isDark ? Colors.white : Colors.black;
                                    final captionColor = isDark ? Colors.white70 : Colors.black87;

                                    return Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          fileName,
                                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                            color: textColor,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        if (state.captions[file.path] != null)
                                          Text(
                                            state.captions[file.path]!,
                                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                              color: captionColor,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                            maxLines: 2,
                                          ),
                                      ],
                                    );
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (state.selectedImages.contains(file.path))
                          Positioned(
                            top: 4,
                            right: 4,
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.primary,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.check,
                                size: 16,
                                color: Theme.of(context).colorScheme.onPrimary,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class ImageViewer extends StatelessWidget {
  const ImageViewer({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, child) {
        if (appState.selectedImage == null) {
          return const Center(child: Text('No image selected'));
        }

        return Center(
          child: InteractiveViewer(
            minScale: 0.5,
            maxScale: 4.0,
            child: Image.file(
              File(appState.selectedImage!),
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return const Center(child: Text('Error loading image'));
              },
            ),
          ),
        );
      },
    );
  }
}

class CaptionEditor extends StatefulWidget {
  const CaptionEditor({super.key});

  @override
  State<CaptionEditor> createState() => _CaptionEditorState();
}

class _CaptionEditorState extends State<CaptionEditor> {
  final TextEditingController _captionController = TextEditingController();
  bool _isGenerating = false;
  double _progress = 0.0;
  List<String> _imagePaths = [];
  int _currentIndex = 0;
  String? _lastSelectedImage;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _updateCaptionFromState();
    });
  }

  @override
  void dispose() {
    _captionController.dispose();
    super.dispose();
  }

  void _updateCaptionFromState() {
    final appState = Provider.of<AppState>(context, listen: false);
    if (appState.selectedImage != null) {
      final caption = appState.captions[appState.selectedImage];
      print('Updating caption for ${appState.selectedImage}'); // Debug print
      print('Caption from state: $caption'); // Debug print
      setState(() {
        _captionController.text = caption ?? '';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, child) {
        if (appState.selectedImage == null) {
          return const Center(child: Text('Select an image'));
        }

        // Update caption when selection changes
        if (_lastSelectedImage != appState.selectedImage) {
          _lastSelectedImage = appState.selectedImage;
          print('Selected image changed to: ${appState.selectedImage}'); // Debug print
          final caption = appState.captions[appState.selectedImage];
          print('Caption from state: $caption'); // Debug print
          _captionController.text = caption ?? '';
        }

        return Padding(
          padding: const EdgeInsets.all(8.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Auto-Captioner', style: TextStyle(fontSize: 16)),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove),
                        onPressed: () => appState.adjustFontSize(-1),
                        tooltip: 'Decrease font size',
                      ),
                      IconButton(
                        icon: const Icon(Icons.add),
                        onPressed: () => appState.adjustFontSize(1),
                        tooltip: 'Increase font size',
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              
              if (_isGenerating)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                  child: LinearProgressIndicator(value: _progress),
                ),
              
              // Caption display/edit area
              Expanded(
                child: TextField(
                  controller: _captionController,
                  maxLines: null,
                  style: TextStyle(fontSize: appState.fontSize),
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    hintText: 'Generated caption will appear here...',
                  ),
                  onChanged: (value) {
                    if (appState.selectedImage != null) {
                      appState.updateCaption(appState.selectedImage!, value);
                    }
                  },
                ),
              ),
              const SizedBox(height: 8),

              // Caption modification controls
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).brightness == Brightness.dark 
                          ? Theme.of(context).colorScheme.secondary
                          : Theme.of(context).colorScheme.primary,
                      foregroundColor: Theme.of(context).brightness == Brightness.dark
                          ? Theme.of(context).colorScheme.primary
                          : Theme.of(context).colorScheme.secondary,
                    ),
                    onPressed: _isGenerating 
                        ? null 
                        : () => _handleGenerateCaption(context, appState),
                    icon: _isGenerating 
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Icon(Icons.auto_awesome, color: Theme.of(context).brightness == Brightness.dark 
                            ? Theme.of(context).colorScheme.primary
                            : Theme.of(context).colorScheme.secondary),
                    label: Text(_isGenerating 
                        ? 'Generating ${_currentIndex + 1}/${_imagePaths.length}' 
                        : 'Generate'),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Prefix/Suffix text fields
              const Text('Caption Modification'),
              const SizedBox(height: 8),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Prepend Text',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                controller: TextEditingController(text: appState.prefixText),
                onChanged: (value) => appState.prefixText = value,
              ),
              const SizedBox(height: 8),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Append Text',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                controller: TextEditingController(text: appState.suffixText),
                onChanged: (value) => appState.suffixText = value,
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _handleGenerateCaption(BuildContext context, AppState appState) async {
    final selectedImages = appState.selectedImages.toList();
    if (selectedImages.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one image')),
      );
      return;
    }

    if (selectedImages.length == 1) {
      // For single image, generate caption immediately
      await _startBatchProcessing(context, [selectedImages.first]);
    } else {
      // For multiple images, show confirmation dialog
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (BuildContext context) {
          return AlertDialog(
            title: const Text('Generate Captions'),
            content: Text('Generate captions for ${selectedImages.length} selected images?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Generate'),
              ),
            ],
          );
        },
      );

      if (confirmed == true) {
        await _startBatchProcessing(context, selectedImages);
      }
    }
  }

  Future<void> _startBatchProcessing(BuildContext context, List<String> imagePaths) async {
    if (!mounted) return;

    setState(() {
      _isGenerating = true;
      _progress = 0.0;
      _imagePaths = imagePaths;
      _currentIndex = 0;
    });

    final appState = Provider.of<AppState>(context, listen: false);
    final openAiService = OpenAIService(appState.apiKey);

    try {
      for (int i = 0; i < _imagePaths.length; i++) {
        if (!mounted) break;

        setState(() {
          _currentIndex = i;
          _progress = i / _imagePaths.length;
        });

        final imageFile = File(_imagePaths[i]);
        if (await imageFile.exists()) {
          final caption = await openAiService.generateImageCaption(_imagePaths[i], appState.selectedModel);
          var processedCaption = openAiService.processCaption(caption).trim();
          
          // Remove trailing comma from the processed caption if present
          if (processedCaption.endsWith(',')) {
            processedCaption = processedCaption.substring(0, processedCaption.length - 1).trim();
          }
          
          // Build final caption with prefix and suffix
          var finalCaption = '';
          
          // Handle prefix
          var prefix = appState.prefixText.trim();
          if (prefix.isNotEmpty) {
            // Remove trailing comma and space if present
            if (prefix.endsWith(', ') || prefix.endsWith(' ,')) {
              prefix = prefix.substring(0, prefix.length - 2).trim();
            } else if (prefix.endsWith(',')) {
              prefix = prefix.substring(0, prefix.length - 1).trim();
            }
            finalCaption = prefix + ', ' + processedCaption;
          } else {
            finalCaption = processedCaption;
          }
          
          // Handle suffix
          var suffix = appState.suffixText.trim();
          if (suffix.isNotEmpty) {
            // Remove leading comma and space if present
            if (suffix.startsWith(', ') || suffix.startsWith(' ,')) {
              suffix = suffix.substring(2).trim();
            } else if (suffix.startsWith(',')) {
              suffix = suffix.substring(1).trim();
            }
            finalCaption = finalCaption + ', ' + suffix;
          }
          
          setState(() {
            if (_imagePaths[i] == appState.selectedImage) {
              _captionController.text = finalCaption;
            }
            _progress = (i + 1) / _imagePaths.length;
          });

          // Save caption
          final captionPath = _imagePaths[i].replaceAll(RegExp(r'\.(png|jpg|jpeg|gif)$'), '.txt');
          await File(captionPath).writeAsString(finalCaption);
          appState.updateCaption(_imagePaths[i], finalCaption);
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error generating captions: $e')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isGenerating = false;
          _progress = 1.0;
        });
      }
    }
  }
}

class SettingsDialog extends StatefulWidget {
  const SettingsDialog({super.key});

  @override
  State<SettingsDialog> createState() => _SettingsDialogState();
}

class _SettingsDialogState extends State<SettingsDialog> {
  final _apiKeyController = TextEditingController();
  final _prefixController = TextEditingController();
  final _suffixController = TextEditingController();
  bool _isDarkMode = true;

  @override
  void initState() {
    super.initState();
    final appState = context.read<AppState>();
    _apiKeyController.text = appState.apiKey;
    _prefixController.text = appState.prefixText;
    _suffixController.text = appState.suffixText;
    _isDarkMode = appState.isDarkMode;
  }

  @override
  void dispose() {
    _apiKeyController.dispose();
    _prefixController.dispose();
    _suffixController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    return AlertDialog(
      title: const Text('Settings'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _apiKeyController,
              decoration: const InputDecoration(
                labelText: 'OpenAI API Key',
                hintText: 'Enter your API key',
              ),
              obscureText: true,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _prefixController,
              decoration: const InputDecoration(
                labelText: 'Prefix Text',
                hintText: 'Text to add before caption',
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _suffixController,
              decoration: const InputDecoration(
                labelText: 'Suffix Text',
                hintText: 'Text to add after caption',
              ),
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              title: const Text('Dark Mode'),
              value: _isDarkMode,
              onChanged: (value) {
                setState(() {
                  _isDarkMode = value;
                });
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () {
            Navigator.of(context).pop();
          },
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            final appState = context.read<AppState>();
            appState.setApiKey(_apiKeyController.text);
            appState.prefixText = _prefixController.text;
            appState.suffixText = _suffixController.text;
            appState.toggleTheme();
            Navigator.of(context).pop();
          },
          child: const Text('Save'),
        ),
      ],
    );
  }
}
