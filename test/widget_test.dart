// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:tagmeister_pc/main.dart';

void main() {
  testWidgets('TagMeister basic UI elements test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const TagMeisterApp());

    // Verify that the main UI elements are present
    expect(find.text('tagmeister'), findsOneWidget); // App title
    expect(find.text('API Key:'), findsOneWidget);
    expect(find.text('Model:'), findsOneWidget);
    expect(find.text('Auto-Captioner'), findsOneWidget);
    expect(find.text('Caption Modification'), findsOneWidget);

    // Verify that the image-related widgets are present
    expect(find.byType(ListView), findsOneWidget); // Image list
    expect(find.byType(Image), findsAtLeastNWidgets(1)); // Image viewer
  });
}
