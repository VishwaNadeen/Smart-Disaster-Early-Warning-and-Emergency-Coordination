import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/login_page.dart';
import 'package:mobile/features/auth/register_page.dart';

void main() {
  group('LoginPage', () {
    Future<void> openLogin(WidgetTester tester) async {
      await tester.pumpWidget(const MaterialApp(home: LoginPage()));
      await tester.pumpAndSettle();
    }

    testWidgets('shows login controls', (tester) async {
      await openLogin(tester);
      expect(find.text('Disaster Ready'), findsOneWidget);
      expect(find.text('Email address'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Sign in'), findsOneWidget);
      expect(find.text('New here? Create an account'), findsOneWidget);
    });

    testWidgets('validates an invalid email', (tester) async {
      await openLogin(tester);
      await tester.enterText(find.byType(TextFormField).first, 'invalid-email');
      await tester.tap(find.text('Sign in'));
      await tester.pumpAndSettle();
      expect(find.text('Enter a valid email address'), findsOneWidget);
    });

    testWidgets('requires a password', (tester) async {
      await openLogin(tester);
      await tester.enterText(
        find.byType(TextFormField).first,
        'citizen@example.com',
      );
      await tester.tap(find.text('Sign in'));
      await tester.pumpAndSettle();
      expect(find.text('Enter your password'), findsOneWidget);
    });

    testWidgets('navigates to registration', (tester) async {
      await openLogin(tester);
      await tester.tap(find.text('New here? Create an account'));
      await tester.pumpAndSettle();
      expect(find.byType(RegisterPage), findsOneWidget);
      expect(find.text('Full name'), findsOneWidget);
    });
  });
}
