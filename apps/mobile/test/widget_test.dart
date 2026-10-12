
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';

void main() {
  testWidgets('basic Flutter widget test', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Text('Disaster Ready'),
        ),
      ),
    );

    expect(find.text('Disaster Ready'), findsOneWidget);
  });
}
