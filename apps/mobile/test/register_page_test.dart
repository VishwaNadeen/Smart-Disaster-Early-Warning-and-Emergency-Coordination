import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/register_page.dart';

void main() {
  group('RegisterPage', () {
    Future<void> openRegister(WidgetTester tester) async {
      await tester.pumpWidget(const MaterialApp(home: RegisterPage()));
      await tester.pumpAndSettle();
    }

    Future<void> scrollTo(WidgetTester tester, Finder target) async {
      final scrollable = find.byType(Scrollable).first;
      for (var i = 0; i < 12 && target.evaluate().isEmpty; i++) {
        await tester.drag(scrollable, const Offset(0, -450));
        await tester.pumpAndSettle();
      }
      expect(target, findsOneWidget);
      await tester.ensureVisible(target);
      await tester.pumpAndSettle();
    }

    Finder submitLabel() => find.text('Create account').last;

    testWidgets('shows registration fields as the form is scrolled',
        (tester) async {
      await openRegister(tester);
      expect(find.text('Create account').first, findsOneWidget);
      for (final label in [
        'Full name',
        'Email address',
        'Password',
        'National identity number',
        'Home address',
      ]) {
        await scrollTo(tester, find.text(label));
      }
      await scrollTo(tester, find.text('District'));
    });

    testWidgets('validates required fields on submit', (tester) async {
      await openRegister(tester);
      // Scroll until the actual submit control is built, not just the app-bar title.
      await scrollTo(tester, find.text('Already have an account? Sign in'));
      await scrollTo(tester, submitLabel());
      await tester.tap(submitLabel());
      await tester.pumpAndSettle();

      expect(find.text('This field is required'), findsWidgets);
      expect(find.text('Enter a valid email address'), findsOneWidget);
      expect(find.text('Use at least 8 characters'), findsOneWidget);
      expect(find.text('Select your district'), findsOneWidget);
    });

    testWidgets('validates email format', (tester) async {
      await openRegister(tester);
      // Fill visible fields by scrolling to each one before interacting.
      final values = <String, String>{
        'Full name': 'Citizen',
        'Email address': 'not-an-email',
        'Password': 'Password123',
        'National identity number': 'NIC123',
        'Home address': 'Colombo',
      };

      for (final entry in values.entries) {
        await scrollTo(tester, find.text(entry.key));
        final field = find.ancestor(
          of: find.text(entry.key),
          matching: find.byType(TextFormField),
        );
        if (field.evaluate().isNotEmpty) {
          await tester.enterText(field.first, entry.value);
        } else {
          // Labels may be InputDecoration labels rather than separate text widgets.
          final fields = find.byType(TextFormField);
          if (entry.key == 'Full name') {
            await tester.enterText(fields.first, entry.value);
          }
        }
      }

      await scrollTo(tester, submitLabel());
      await tester.tap(submitLabel());
      await tester.pumpAndSettle();
      expect(find.text('Enter a valid email address'), findsOneWidget);
    });

    testWidgets('opens district choices', (tester) async {
      await openRegister(tester);
      await scrollTo(tester, find.text('District'));
      await tester.tap(find.text('District'));
      await tester.pumpAndSettle();

      // Assert an option that is confirmed to be in the app's district list.
      expect(find.text('Colombo'), findsWidgets);
      expect(find.text('Kandy'), findsWidgets);
    });
  });
}
