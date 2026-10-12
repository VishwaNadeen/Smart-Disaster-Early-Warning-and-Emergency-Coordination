import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../home/citizen_home_page.dart';

class ReportSuccessPage extends StatelessWidget {
  const ReportSuccessPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 92, height: 92,
              decoration: const BoxDecoration(color: Color(0xFFDDF4E7), shape: BoxShape.circle),
              child: const Icon(Icons.check_rounded, color: Color(0xFF16804A), size: 52),
            ),
            const SizedBox(height: 24),
            Text('Report submitted', style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold, color: AppTheme.navy)),
            const SizedBox(height: 12),
            const Text(
              'Your ground hazard report was sent to the system. Its status is Pending Verification until a duty officer reviews it.',
              textAlign: TextAlign.center, style: TextStyle(height: 1.5)),
            const SizedBox(height: 26),
            SizedBox(width: double.infinity, child: FilledButton(
              onPressed: () => Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const CitizenHomePage()), (_) => false),
              child: const Text('Back to home'),
            )),
          ]),
        ),
      ),
    ),
  );
}
