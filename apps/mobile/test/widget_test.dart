
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app.dart';

void main() {
  testWidgets('Citizen app starts successfully', (tester) async {
    await tester.pumpWidget(const CitizenApp());

    // Allow the asynchronous authentication check to complete.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Disaster Ready'), findsOneWidget);
  });
}
