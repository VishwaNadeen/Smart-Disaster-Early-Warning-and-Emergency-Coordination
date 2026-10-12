import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/ground_reports/submit_report_page.dart';

void main() {
  group('SubmitReportPage', () {
    Future<void> openPage(WidgetTester tester) async {
      await tester.pumpWidget(const MaterialApp(home: SubmitReportPage()));
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

    testWidgets('shows the hazard report form', (tester) async {
      await openPage(tester);
      expect(find.text('Report a hazard'), findsOneWidget);
      await scrollTo(tester, find.text('Hazard type'));
      await scrollTo(tester, find.text('Description'));
      await scrollTo(tester, find.text('Evidence and attachments'));
      await scrollTo(tester, find.text('Location'));
      await scrollTo(tester, find.text('Submit ground report'));
    });

    testWidgets('validates when submitted without a hazard', (tester) async {
      await openPage(tester);
      await scrollTo(tester, find.text('Submit ground report'));
      await tester.tap(find.text('Submit ground report'));
      await tester.pumpAndSettle();

      expect(find.text('Select a hazard type'), findsOneWidget);
    });

    testWidgets('shows a custom hazard field when Other is selected',
        (tester) async {
      await openPage(tester);
      await scrollTo(tester, find.text('Hazard type'));
      await tester.tap(find.text('Hazard type'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Other').last);
      await tester.pumpAndSettle();

      expect(find.text('Describe the hazard type'), findsOneWidget);
    });

    testWidgets('supports manual coordinate entry', (tester) async {
      await openPage(tester);
      await scrollTo(tester, find.text('Latitude'));
      await scrollTo(tester, find.text('Longitude'));
      await scrollTo(tester, find.text('Use current location'));
    });
  });
}
