# Material Zones: Flutter Library

**Parent Document**: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)  
**Related Documents**: 
- [Chunk Implementations](./CHUNK_IMPLEMENTATIONS.md)
- [Artifact Viewers](./ARTIFACT_VIEWERS.md)
- [JavaScript Utility Library](./MATERIAL_ZONES_JS.md)

**Version**: 1.0.0

---

## Overview

The Material Zones Flutter Library (`material_zones`) provides equivalent functionality to the JavaScript library, ensuring consistent AI chat interfaces across web and mobile platforms.

**Key Principle**: Same API surface, native performance.

---

## Installation

### pubspec.yaml

```yaml
dependencies:
  material_zones: ^1.0.0
  
  # Required dependencies
  flutter_markdown: ^0.6.18
  webview_flutter: ^4.4.2
  url_launcher: ^6.2.1
  image_picker: ^1.0.4
  palette_generator: ^0.3.3+3
```

```bash
flutter pub get
```

---

## Getting Started

### Basic Setup

```dart
import 'package:flutter/material.dart';
import 'package:material_zones/material_zones.dart';

void main() {
  runApp(MaterialZonesApp());
}

class MaterialZonesApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: MaterialZonesTheme.light(primaryHue: 210),
      darkTheme: MaterialZonesTheme.dark(primaryHue: 210),
      home: ChatScreen(),
    );
  }
}
```

---

## Core Classes

### MaterialZones

Main entry point for the library.

```dart
import 'package:material_zones/material_zones.dart';

class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  late MaterialZones zones;
  final List<ChatMessage> messages = [];
  
  @override
  void initState() {
    super.initState();
    
    zones = MaterialZones(
      theme: MaterialZonesThemeData(
        primaryHue: 210,
        darkMode: false,
      ),
      onChunkRendered: (chunk) {
        print('Chunk rendered: ${chunk.id}');
      },
      onArtifactViewed: (artifact) {
        print('Artifact viewed: ${artifact.id}');
      },
    );
    
    // Subscribe to events
    zones.events.listen((event) {
      print('Event: ${event.type}');
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('AI Chat')),
      body: ChatView(zones: zones, messages: messages),
    );
  }
}
```

---

## API Reference

### Chunk Models

#### Chunk (Base Class)

```dart
abstract class Chunk {
  final String id;
  final String type;
  final DateTime timestamp;
  
  Chunk({
    required this.id,
    required this.type,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
  
  Widget build(BuildContext context);
}
```

#### TextChunk

```dart
class TextChunk extends Chunk {
  final String content;
  
  TextChunk({
    required String id,
    required this.content,
  }) : super(id: id, type: 'text');
  
  @override
  Widget build(BuildContext context) {
    return TextChunkWidget(chunk: this);
  }
}
```

#### ThinkingChunk

```dart
class ThinkingChunk extends Chunk {
  final String content;
  final bool expanded;
  final Map<String, dynamic> metadata;
  
  ThinkingChunk({
    required String id,
    required this.content,
    this.expanded = false,
    this.metadata = const {},
  }) : super(id: id, type: 'thinking');
  
  @override
  Widget build(BuildContext context) {
    return ThinkingChunkWidget(chunk: this);
  }
}
```

#### CitationChunk

```dart
class Citation {
  final int index;
  final String title;
  final String url;
  final String? snippet;
  final String? author;
  final String? date;
  final String? source;
  final String? favicon;
  
  Citation({
    required this.index,
    required this.title,
    required this.url,
    this.snippet,
    this.author,
    this.date,
    this.source,
    this.favicon,
  });
}

class CitationChunk extends Chunk {
  final List<Citation> citations;
  
  CitationChunk({
    required String id,
    required this.citations,
  }) : super(id: id, type: 'citation');
  
  @override
  Widget build(BuildContext context) {
    return CitationChunkWidget(chunk: this);
  }
}
```

#### ArtifactChunk

```dart
class ArtifactChunk extends Chunk {
  final String artifactType; // 'html', 'react', 'code', etc.
  final String title;
  final String content;
  final String? language;
  final Map<String, dynamic>? metadata;
  
  ArtifactChunk({
    required String id,
    required this.artifactType,
    required this.title,
    required this.content,
    this.language,
    this.metadata,
  }) : super(id: id, type: 'artifact');
  
  @override
  Widget build(BuildContext context) {
    return ArtifactChunkWidget(chunk: this);
  }
}
```

---

### Message Model

```dart
class ChatMessage {
  final String id;
  final String role; // 'user' | 'assistant'
  final List<Chunk> chunks;
  final DateTime timestamp;
  
  ChatMessage({
    required this.id,
    required this.role,
    required this.chunks,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
  
  bool get isUser => role == 'user';
  bool get isAssistant => role == 'assistant';
}
```

---

### MaterialZones API

#### Render Methods

```dart
class MaterialZones {
  /// Render a text chunk
  Widget renderTextChunk(String content, {String? id}) {
    final chunk = TextChunk(
      id: id ?? _generateId(),
      content: content,
    );
    return chunk.build(context);
  }
  
  /// Render a thinking chunk
  Widget renderThinkingChunk(
    String content, {
    String? id,
    bool expanded = false,
    Map<String, dynamic>? metadata,
  }) {
    final chunk = ThinkingChunk(
      id: id ?? _generateId(),
      content: content,
      expanded: expanded,
      metadata: metadata ?? {},
    );
    return chunk.build(context);
  }
  
  /// Render citations
  Widget renderCitationChunk(
    List<Citation> citations, {
    String? id,
  }) {
    final chunk = CitationChunk(
      id: id ?? _generateId(),
      citations: citations,
    );
    return chunk.build(context);
  }
  
  /// Render artifact
  Widget renderArtifactChunk(
    String artifactType,
    String content, {
    String? id,
    String? title,
    String? language,
    Map<String, dynamic>? metadata,
  }) {
    final chunk = ArtifactChunk(
      id: id ?? _generateId(),
      artifactType: artifactType,
      title: title ?? 'Untitled',
      content: content,
      language: language,
      metadata: metadata,
    );
    return chunk.build(context);
  }
  
  /// Create a complete message
  ChatMessage createMessage({
    required String role,
    required List<Chunk> chunks,
    String? id,
  }) {
    return ChatMessage(
      id: id ?? _generateId(),
      role: role,
      chunks: chunks,
    );
  }
  
  String _generateId() {
    return 'mz-${DateTime.now().millisecondsSinceEpoch}-${_randomString(9)}';
  }
  
  String _randomString(int length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final random = Random();
    return String.fromCharCodes(
      Iterable.generate(
        length,
        (_) => chars.codeUnitAt(random.nextInt(chars.length)),
      ),
    );
  }
}
```

---

### Event System

```dart
enum AIEventType {
  chunkRendered,
  chunkCopied,
  thinkingExpanded,
  citationClicked,
  artifactViewed,
  artifactCopied,
  artifactDownloaded,
  codeExecuted,
}

class AIEvent {
  final AIEventType type;
  final String? chunkId;
  final String? artifactId;
  final Map<String, dynamic>? metadata;
  final DateTime timestamp;
  
  AIEvent({
    required this.type,
    this.chunkId,
    this.artifactId,
    this.metadata,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
}

class AIEventBus {
  static final _controller = StreamController<AIEvent>.broadcast();
  
  static Stream<AIEvent> get stream => _controller.stream;
  
  static void dispatch(
    AIEventType type, {
    String? chunkId,
    String? artifactId,
    Map<String, dynamic>? metadata,
  }) {
    _controller.add(AIEvent(
      type: type,
      chunkId: chunkId,
      artifactId: artifactId,
      metadata: metadata,
    ));
  }
  
  static void dispose() {
    _controller.close();
  }
}

// Usage
AIEventBus.stream.listen((event) {
  switch (event.type) {
    case AIEventType.chunkRendered:
      print('Chunk rendered: ${event.chunkId}');
      break;
    case AIEventType.artifactCopied:
      print('Artifact copied: ${event.artifactId}');
      break;
    // ... handle other events
  }
});
```

---

### Theme System

```dart
class MaterialZonesThemeData {
  final int primaryHue;
  final bool darkMode;
  
  // Surface colors (zone backgrounds)
  final Color surfaceContainerLowest;
  final Color surfaceContainerLow;
  final Color surfaceContainer;
  final Color surfaceContainerHigh;
  final Color surfaceContainerHighest;
  
  // Primary colors
  final Color primary;
  final Color primaryContainer;
  final Color onPrimary;
  final Color onPrimaryContainer;
  
  // Semantic colors
  final Color success;
  final Color warning;
  final Color error;
  
  // Text colors
  final Color onSurface;
  final Color onSurfaceVariant;
  final Color onSurfaceDisabled;
  
  MaterialZonesThemeData({
    required this.primaryHue,
    required this.darkMode,
  })  : // Generate all colors based on hue and mode
        surfaceContainerLowest = _generateSurfaceColor(primaryHue, darkMode, 0),
        surfaceContainerLow = _generateSurfaceColor(primaryHue, darkMode, 1),
        surfaceContainer = _generateSurfaceColor(primaryHue, darkMode, 2),
        surfaceContainerHigh = _generateSurfaceColor(primaryHue, darkMode, 3),
        surfaceContainerHighest = _generateSurfaceColor(primaryHue, darkMode, 4),
        primary = HSLColor.fromAHSL(1, primaryHue.toDouble(), 0.6, darkMode ? 0.7 : 0.5).toColor(),
        primaryContainer = HSLColor.fromAHSL(1, primaryHue.toDouble(), 0.6, darkMode ? 0.3 : 0.9).toColor(),
        onPrimary = HSLColor.fromAHSL(1, primaryHue.toDouble(), 0.2, darkMode ? 0.1 : 1.0).toColor(),
        onPrimaryContainer = HSLColor.fromAHSL(1, primaryHue.toDouble(), 0.6, darkMode ? 0.9 : 0.1).toColor(),
        success = HSLColor.fromAHSL(1, 142, 0.6, 0.45).toColor(),
        warning = HSLColor.fromAHSL(1, 38, 1.0, 0.5).toColor(),
        error = HSLColor.fromAHSL(1, 0, 0.65, 0.51).toColor(),
        onSurface = HSLColor.fromAHSL(1, primaryHue.toDouble(), 0.1, darkMode ? 0.95 : 0.1).toColor(),
        onSurfaceVariant = HSLColor.fromAHSL(1, primaryHue.toDouble(), 0.1, darkMode ? 0.7 : 0.4).toColor(),
        onSurfaceDisabled = HSLColor.fromAHSL(1, primaryHue.toDouble(), 0.1, darkMode ? 0.5 : 0.6).toColor();
  
  static Color _generateSurfaceColor(int hue, bool darkMode, int level) {
    final lightness = darkMode 
      ? 0.08 + (level * 0.02)  // 8%, 10%, 12%, 14%, 16%
      : 0.98 - (level * 0.02); // 98%, 96%, 94%, 92%, 90%
    
    return HSLColor.fromAHSL(1, hue.toDouble(), 0.2, lightness).toColor();
  }
  
  ThemeData toThemeData() {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme(
        brightness: darkMode ? Brightness.dark : Brightness.light,
        primary: primary,
        onPrimary: onPrimary,
        primaryContainer: primaryContainer,
        onPrimaryContainer: onPrimaryContainer,
        secondary: primary,
        onSecondary: onPrimary,
        error: error,
        onError: onPrimary,
        surface: surfaceContainer,
        onSurface: onSurface,
      ),
    );
  }
}

class MaterialZonesTheme extends InheritedWidget {
  final MaterialZonesThemeData data;
  
  const MaterialZonesTheme({
    Key? key,
    required this.data,
    required Widget child,
  }) : super(key: key, child: child);
  
  static MaterialZonesThemeData of(BuildContext context) {
    final theme = context.dependOnInheritedWidgetOfExactType<MaterialZonesTheme>();
    return theme?.data ?? MaterialZonesThemeData(primaryHue: 210, darkMode: false);
  }
  
  @override
  bool updateShouldNotify(MaterialZonesTheme oldWidget) {
    return data != oldWidget.data;
  }
  
  static ThemeData light({int primaryHue = 210}) {
    return MaterialZonesThemeData(primaryHue: primaryHue, darkMode: false).toThemeData();
  }
  
  static ThemeData dark({int primaryHue = 210}) {
    return MaterialZonesThemeData(primaryHue: primaryHue, darkMode: true).toThemeData();
  }
}
```

---

### Personalization

```dart
import 'package:image_picker/image_picker.dart';
import 'package:palette_generator/palette_generator.dart';

class MaterialZonesPersonalization {
  /// Extract primary hue from an image
  static Future<int> extractHueFromImage(ImageProvider image) async {
    final paletteGenerator = await PaletteGenerator.fromImageProvider(image);
    
    final dominantColor = paletteGenerator.dominantColor?.color ?? Colors.blue;
    
    final hslColor = HSLColor.fromColor(dominantColor);
    return hslColor.hue.round();
  }
  
  /// Apply personalization from user image
  static Future<MaterialZonesThemeData> applyPersonalization(
    BuildContext context, {
    ImageSource source = ImageSource.gallery,
  }) async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: source);
    
    if (image == null) {
      throw Exception('No image selected');
    }
    
    final imageProvider = FileImage(File(image.path));
    final hue = await extractHueFromImage(imageProvider);
    
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return MaterialZonesThemeData(
      primaryHue: hue,
      darkMode: isDark,
    );
  }
}

// Usage
Future<void> applyUserTheme(BuildContext context) async {
  try {
    final theme = await MaterialZonesPersonalization.applyPersonalization(context);
    
    setState(() {
      zones.setTheme(theme);
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Theme updated!')),
    );
  } catch (e) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Failed to apply theme')),
    );
  }
}
```

---

## Widget Components

### ChatView

```dart
class ChatView extends StatelessWidget {
  final MaterialZones zones;
  final List<ChatMessage> messages;
  final ScrollController? scrollController;
  
  const ChatView({
    Key? key,
    required this.zones,
    required this.messages,
    this.scrollController,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      controller: scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        final message = messages[index];
        return MessageBubble(
          message: message,
          zones: zones,
        );
      },
    );
  }
}
```

### MessageBubble

```dart
class MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final MaterialZones zones;
  
  const MessageBubble({
    Key? key,
    required this.message,
    required this.zones,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    final zones = MaterialZonesTheme.of(context);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: message.isUser 
          ? CrossAxisAlignment.end 
          : CrossAxisAlignment.start,
        children: [
          // Render all chunks
          ...message.chunks.map((chunk) => chunk.build(context)),
          
          // Message tools
          const SizedBox(height: 8),
          MessageTools(message: message),
        ],
      ),
    );
  }
}
```

### MessageTools

```dart
class MessageTools extends StatelessWidget {
  final ChatMessage message;
  
  const MessageTools({
    Key? key,
    required this.message,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          icon: const Icon(Icons.copy, size: 18),
          onPressed: () => _copyMessage(context),
          tooltip: 'Copy',
        ),
        if (message.isAssistant)
          IconButton(
            icon: const Icon(Icons.refresh, size: 18),
            onPressed: () => _regenerate(context),
            tooltip: 'Regenerate',
          ),
        IconButton(
          icon: const Icon(Icons.share, size: 18),
          onPressed: () => _share(context),
          tooltip: 'Share',
        ),
      ],
    );
  }
  
  void _copyMessage(BuildContext context) {
    final text = message.chunks
      .where((chunk) => chunk is TextChunk)
      .map((chunk) => (chunk as TextChunk).content)
      .join('\n\n');
    
    Clipboard.setData(ClipboardData(text: text));
    AIEventBus.dispatch(AIEventType.chunkCopied, metadata: {'messageId': message.id});
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Message copied')),
    );
  }
  
  void _regenerate(BuildContext context) {
    // Implement regeneration logic
  }
  
  void _share(BuildContext context) {
    // Implement share logic
  }
}
```

### ChatInput

```dart
class ChatInput extends StatefulWidget {
  final Function(String) onSend;
  
  const ChatInput({
    Key? key,
    required this.onSend,
  }) : super(key: key);
  
  @override
  State<ChatInput> createState() => _ChatInputState();
}

class _ChatInputState extends State<ChatInput> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  
  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }
  
  void _send() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    
    widget.onSend(text);
    _controller.clear();
  }
  
  @override
  Widget build(BuildContext context) {
    final zones = MaterialZonesTheme.of(context);
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: zones.surfaceContainer,
        border: Border(
          top: BorderSide(
            color: zones.surfaceContainerHigh,
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              focusNode: _focusNode,
              decoration: InputDecoration(
                hintText: 'Type your message...',
                filled: true,
                fillColor: zones.surfaceContainerHigh,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
              ),
              maxLines: null,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _send(),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.send),
            onPressed: _send,
            style: IconButton.styleFrom(
              backgroundColor: zones.primary,
              foregroundColor: zones.onPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
```

---

## Complete Example

```dart
import 'package:flutter/material.dart';
import 'package:material_zones/material_zones.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Material Zones Chat',
      theme: MaterialZonesTheme.light(primaryHue: 210),
      darkTheme: MaterialZonesTheme.dark(primaryHue: 210),
      home: ChatScreen(),
    );
  }
}

class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  late MaterialZones zones;
  final List<ChatMessage> messages = [];
  final ScrollController _scrollController = ScrollController();
  
  @override
  void initState() {
    super.initState();
    
    zones = MaterialZones(
      theme: MaterialZonesThemeData(
        primaryHue: 210,
        darkMode: Theme.of(context).brightness == Brightness.dark,
      ),
    );
    
    // Listen for events
    AIEventBus.stream.listen(_handleEvent);
    
    // Add welcome message
    _addWelcomeMessage();
  }
  
  void _addWelcomeMessage() {
    final message = zones.createMessage(
      role: 'assistant',
      chunks: [
        TextChunk(
          id: zones.generateId(),
          content: 'Hello! How can I help you today?',
        ),
      ],
    );
    
    setState(() {
      messages.add(message);
    });
  }
  
  void _handleEvent(AIEvent event) {
    print('Event: ${event.type}');
  }
  
  void _sendMessage(String text) {
    // Add user message
    final userMessage = zones.createMessage(
      role: 'user',
      chunks: [
        TextChunk(
          id: zones.generateId(),
          content: text,
        ),
      ],
    );
    
    setState(() {
      messages.add(userMessage);
    });
    
    // Simulate AI response
    Future.delayed(const Duration(milliseconds: 500), () {
      _addAIResponse(text);
    });
    
    // Scroll to bottom
    Future.delayed(const Duration(milliseconds: 100), () {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    });
  }
  
  void _addAIResponse(String userText) {
    final chunks = <Chunk>[];
    
    // Add thinking chunk
    chunks.add(ThinkingChunk(
      id: zones.generateId(),
      content: 'Analyzing your request...',
      expanded: false,
      metadata: {'duration': 800},
    ));
    
    // Add text response
    chunks.add(TextChunk(
      id: zones.generateId(),
      content: 'I received your message: "$userText"',
    ));
    
    // Add artifact if code is mentioned
    if (userText.toLowerCase().contains('code')) {
      chunks.add(ArtifactChunk(
        id: zones.generateId(),
        artifactType: 'code',
        title: 'Example Code',
        content: '''
function greet(name) {
  return `Hello, \${name}!`;
}

console.log(greet('World'));
        ''',
        language: 'javascript',
      ));
    }
    
    final message = zones.createMessage(
      role: 'assistant',
      chunks: chunks,
    );
    
    setState(() {
      messages.add(message);
    });
    
    // Scroll to bottom
    Future.delayed(const Duration(milliseconds: 100), () {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    });
  }
  
  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Chat'),
        actions: [
          IconButton(
            icon: const Icon(Icons.palette),
            onPressed: _showThemeOptions,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ChatView(
              zones: zones,
              messages: messages,
              scrollController: _scrollController,
            ),
          ),
          ChatInput(onSend: _sendMessage),
        ],
      ),
    );
  }
  
  void _showThemeOptions() async {
    try {
      final theme = await MaterialZonesPersonalization.applyPersonalization(context);
      
      setState(() {
        zones.setTheme(theme);
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Theme updated!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }
}
```

---

## AI Assistant Integration

### Prompt Template

```
When generating Flutter code for AI chat interfaces, use the Material Zones library:

```dart
import 'package:material_zones/material_zones.dart';

final zones = MaterialZones();

// For text responses
final textChunk = TextChunk(
  id: zones.generateId(),
  content: content,
);

// For thinking/reasoning
final thinkingChunk = ThinkingChunk(
  id: zones.generateId(),
  content: thinking,
  expanded: false,
);

// For citations
final citationChunk = CitationChunk(
  id: zones.generateId(),
  citations: citations,
);

// For artifacts
final artifactChunk = ArtifactChunk(
  id: zones.generateId(),
  artifactType: 'code',
  title: 'Example',
  content: code,
  language: 'dart',
);

// Create message
final message = zones.createMessage(
  role: 'assistant',
  chunks: [textChunk, thinkingChunk, artifactChunk],
);
```

This provides identical functionality to the JavaScript library.
```

---

## Platform-Specific Features

### iOS Specific

```dart
import 'dart:io';

if (Platform.isIOS) {
  // iOS-specific behavior
}
```

### Android Specific

```dart
if (Platform.isAndroid) {
  // Android-specific behavior
}
```

---

## Performance Optimization

### Lazy Loading

```dart
class LazyArtifactViewer extends StatelessWidget {
  final ArtifactChunk chunk;
  
  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _loadArtifact(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return CircularProgressIndicator();
        }
        return ArtifactChunkWidget(chunk: chunk);
      },
    );
  }
  
  Future<void> _loadArtifact() async {
    // Load heavy resources
    await Future.delayed(Duration(milliseconds: 100));
  }
}
```

---

## Testing

```dart
void main() {
  group('MaterialZones', () {
    test('generates unique IDs', () {
      final zones = MaterialZones();
      final id1 = zones.generateId();
      final id2 = zones.generateId();
      expect(id1, isNot(equals(id2)));
    });
    
    test('creates text chunk', () {
      final zones = MaterialZones();
      final chunk = TextChunk(
        id: zones.generateId(),
        content: 'Test content',
      );
      expect(chunk.type, equals('text'));
      expect(chunk.content, equals('Test content'));
    });
  });
}
```

---

## Building & Publishing

```yaml
# pubspec.yaml
name: material_zones
description: Material Zones Flutter library for AI chat interfaces
version: 1.0.0
homepage: https://github.com/material-zones/material-zones-flutter

environment:
  sdk: ">=3.0.0 <4.0.0"
  flutter: ">=3.10.0"
```

```bash
flutter pub publish --dry-run
flutter pub publish
```

---

This Flutter library provides complete feature parity with the JavaScript library, ensuring consistent AI chat experiences across all platforms.
