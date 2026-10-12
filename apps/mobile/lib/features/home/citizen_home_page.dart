import 'package:flutter/material.dart';

import '../../core/storage/token_storage.dart';
import '../../core/theme/app_theme.dart';
import '../../models/hazard_alert.dart';
import '../../services/alert_service.dart';
import '../../services/auth_service.dart';
import '../auth/login_page.dart';
import '../ground_reports/submit_report_page.dart';
import '../shelters/shelters_page.dart';
import '../../services/ground_report_service.dart';
import '../help_requests/help_request_page.dart';

import '../../core/config/api_config.dart';
import '../../services/help_request_service.dart';

class CitizenHomePage extends StatefulWidget {
  const CitizenHomePage({super.key});

  @override
  State<CitizenHomePage> createState() =>
      _CitizenHomePageState();
}

class _CitizenHomePageState extends State<CitizenHomePage> {
  int _selectedIndex = 0;

  final List<Widget> _pages = const [
    CitizenDashboardPage(),
    CitizenReportsPage(),
    SheltersPage(),
    CitizenProfilePage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: _pages,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment_rounded),
            label: 'Reports',
          ),
          NavigationDestination(
            icon: Icon(Icons.location_on_outlined),
            selectedIcon: Icon(Icons.location_on_rounded),
            label: 'Shelters',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

// ============================================================
// HOME PAGE
// ============================================================

class CitizenDashboardPage extends StatefulWidget {
  const CitizenDashboardPage({super.key});

  @override
  State<CitizenDashboardPage> createState() =>
      _CitizenDashboardPageState();
}

class _CitizenDashboardPageState
    extends State<CitizenDashboardPage> {
  late Future<List<HazardAlert>> _alerts;
  String _name = 'Citizen';

  @override
  void initState() {
    super.initState();

    _alerts = AlertService().getActiveAlerts();

    TokenStorage().readName().then((value) {
      if (mounted && value != null && value.isNotEmpty) {
        setState(() => _name = value);
      }
    });
  }

  Future<void> _refresh() async {
    setState(() {
      _alerts = AlertService().getActiveAlerts();
    });

    await _alerts;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Disaster Ready',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            onPressed: () async {
              await AuthService().logout();

              if (!context.mounted) return;

              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(
                  builder: (_) => const LoginPage(),
                ),
                (_) => false,
              );
            },
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
          children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(22),
                gradient: const LinearGradient(
                  colors: [AppTheme.navy, AppTheme.blue],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.shield_rounded,
                    color: Colors.white,
                    size: 32,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Hello, $_name',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 23,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Stay aware of risks around you and help keep your community safe.',
                    style: TextStyle(
                      color: Colors.white70,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppTheme.navy,
                    ),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) =>
                              const SubmitReportPage(),
                        ),
                      );
                    },
                    icon: const Icon(
                      Icons.add_location_alt_outlined,
                    ),
                    label: const Text('Report a hazard'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 26),
            Text(
              'Safety shortcuts',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _Shortcut(
                    icon: Icons.warning_amber_rounded,
                    title: 'Active alerts',
                    subtitle: 'Local warnings',
                    color: const Color(0xFFFFF0D5),
                    onTap: _refresh,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _Shortcut(
                    icon: Icons.assignment_outlined,
                    title: 'Ground report',
                    subtitle: 'Send evidence',
                    color: const Color(0xFFDDF4F0),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) =>
                              const SubmitReportPage(),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 26),
            Text(
              'Active hazard alerts',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            FutureBuilder<List<HazardAlert>>(
              future: _alerts,
              builder: (context, snapshot) {
                if (snapshot.connectionState ==
                    ConnectionState.waiting) {
                  return const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(
                      child: CircularProgressIndicator(),
                    ),
                  );
                }

                if (snapshot.hasError) {
                  return const _MessageCard(
                    icon: Icons.cloud_off_outlined,
                    text:
                        'Alerts could not be loaded. Pull down to try again.',
                  );
                }

                final alerts = snapshot.data ?? [];

                if (alerts.isEmpty) {
                  return const _MessageCard(
                    icon: Icons.verified_user_outlined,
                    text:
                        'No active alerts were returned by the server.',
                  );
                }

                return Column(
                  children: alerts
                      .map((a) => _AlertCard(alert: a))
                      .toList(),
                );
              },
            ),
            const SizedBox(height: 24),
            const _MessageCard(
              icon: Icons.info_outline_rounded,
              text:
                  'Citizen reports are reviewed by an authorized officer before they can affect official warnings.',
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
  heroTag: 'citizenHelpMeButton',
  onPressed: () {
    final tokenStorage = TokenStorage();

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => HelpRequestPage(
          service: HelpRequestService(
            apiBaseUrl: ApiConfig.baseUrl,
            readAccessToken: () => tokenStorage.readToken(),
          ),
          loadProfile: () async {
            // Replace this with your existing profile API call.
            return <String, dynamic>{};
          },
        ),
      ),
    );
  },
  icon: const Icon(Icons.sos_rounded),
  label: const Text('Help Me'),
  backgroundColor: Colors.red,
  foregroundColor: Colors.white,
),
      floatingActionButtonLocation:
          FloatingActionButtonLocation.endFloat,
    );
  }
}

// ============================================================
// REPORTS PAGE
// ============================================================

class CitizenReportsPage extends StatefulWidget {
  const CitizenReportsPage({super.key});

  @override
  State<CitizenReportsPage> createState() =>
      _CitizenReportsPageState();
}

class _CitizenReportsPageState extends State<CitizenReportsPage> {
  final GroundReportService _service = GroundReportService();

  late Future<List<Map<String, dynamic>>> _reports;

  @override
  void initState() {
    super.initState();
    _reports = _service.getMyReports();
  }

  Future<void> _refresh() async {
    final future = _service.getMyReports();

    setState(() {
      _reports = future;
    });

    try {
      await future;
    } catch (_) {
      // The FutureBuilder displays the error.
    }
  }

  String _value(
    Map<String, dynamic> report,
    List<String> keys, {
    String fallback = '',
  }) {
    for (final key in keys) {
      final value = report[key];

      if (value != null && value.toString().trim().isNotEmpty) {
        return value.toString();
      }
    }

    return fallback;
  }

  String _formatDate(String value) {
    final date = DateTime.tryParse(value);

    if (date == null) return value;

    final local = date.toLocal();

    return '${local.day.toString().padLeft(2, '0')}/'
        '${local.month.toString().padLeft(2, '0')}/'
        '${local.year}  '
        '${local.hour.toString().padLeft(2, '0')}:'
        '${local.minute.toString().padLeft(2, '0')}';
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'verified':
      case 'approved':
        return Colors.green;

      case 'rejected':
      case 'declined':
        return Colors.red;

      case 'resolved':
        return Colors.blue;

      default:
        return Colors.orange.shade800;
    }
  }

  IconData _hazardIcon(String type) {
    final value = type.toLowerCase();

    if (value.contains('flood') || value.contains('water')) {
      return Icons.water;
    }

    if (value.contains('landslide')) {
      return Icons.terrain;
    }

    if (value.contains('fire')) {
      return Icons.local_fire_department;
    }

    if (value.contains('road') || value.contains('bridge')) {
      return Icons.route;
    }

    return Icons.warning_amber_rounded;
  }

  Future<void> _submitReport() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const SubmitReportPage(),
      ),
    );

    if (mounted) {
      await _refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'My Reports',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh reports',
            onPressed: _refresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _reports,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting &&
              !snapshot.hasData) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (snapshot.hasError) {
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(24),
                children: [
                  const SizedBox(height: 100),
                  const Icon(
                    Icons.cloud_off_outlined,
                    size: 58,
                    color: Colors.grey,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Could not load your reports',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${snapshot.error}',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  Center(
                    child: FilledButton.icon(
                      onPressed: _refresh,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Try again'),
                    ),
                  ),
                ],
              ),
            );
          }

          final reports = snapshot.data ?? [];

          if (reports.isEmpty) {
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(24),
                children: [
                  const SizedBox(height: 100),
                  const Icon(
                    Icons.assignment_outlined,
                    size: 64,
                    color: Colors.blue,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'No reports yet',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 21,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Your submitted ground hazard reports will '
                    'appear here.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  Center(
                    child: FilledButton.icon(
                      onPressed: _submitReport,
                      icon: const Icon(Icons.add_location_alt_outlined),
                      label: const Text('Submit a report'),
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                Text(
                  '${reports.length} submitted '
                  '${reports.length == 1 ? 'report' : 'reports'}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 12),

                ...reports.map((report) {
                  final type = _value(
                    report,
                    ['hazardType', 'type'],
                    fallback: 'Ground hazard',
                  );

                  final description = _value(
                    report,
                    ['description'],
                    fallback: 'No description provided',
                  );

                  final status = _value(
                    report,
                    [
                      'status',
                      'verificationStatus',
                      'reviewStatus',
                    ],
                    fallback: 'Pending',
                  );

                  final date = _value(
                    report,
                    ['createdAt', 'submittedAt', 'updatedAt'],
                  );

                  final latitude = _value(
                    report,
                    ['latitude', 'lat'],
                  );

                  final longitude = _value(
                    report,
                    ['longitude', 'lng', 'lon'],
                  );

                  final location = latitude.isNotEmpty &&
                          longitude.isNotEmpty
                      ? '$latitude, $longitude'
                      : 'Location not available';

                  final color = _statusColor(status);

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    clipBehavior: Clip.antiAlias,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              CircleAvatar(
                                backgroundColor: Colors.blue.shade50,
                                child: Icon(
                                  _hazardIcon(type),
                                  color: Colors.blue.shade800,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      type.replaceAll('_', ' '),
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    if (date.isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        _formatDate(date),
                                        style: TextStyle(
                                          color: Colors.grey.shade600,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: color.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  status.replaceAll('_', ' '),
                                  style: TextStyle(
                                    color: color,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Text(
                            description,
                            style: const TextStyle(height: 1.4),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(
                                Icons.location_on_outlined,
                                size: 19,
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(location),
                              ),
                            ],
                          ),
                          finalReportId(report),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _submitReport,
        icon: const Icon(Icons.add),
        label: const Text('New report'),
      ),
    );
  }

  Widget finalReportId(Map<String, dynamic> report) {
    final id = _value(report, ['id', '_id']);

    if (id.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Text(
        'Report ID: $id',
        style: TextStyle(
          fontSize: 11,
          color: Colors.grey.shade600,
        ),
      ),
    );
  }
}

// ============================================================
// SHELTERS PAGE
// ============================================================

class CitizenSheltersPage extends StatelessWidget {
  const CitizenSheltersPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Safe Shelters',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.location_on_outlined,
                size: 64,
                color: AppTheme.blue,
              ),
              const SizedBox(height: 16),
              Text(
                'Nearby Safe Shelters',
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Find designated shelters and emergency accommodation during disasters.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              const _MessageCard(
                icon: Icons.map_outlined,
                text:
                    'Shelter locations will appear here when connected to the shelters API.',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================
// PROFILE PAGE
// ============================================================

class CitizenProfilePage extends StatefulWidget {
  const CitizenProfilePage({super.key});

  @override
  State<CitizenProfilePage> createState() =>
      _CitizenProfilePageState();
}

class _CitizenProfilePageState
    extends State<CitizenProfilePage> {
  String _name = 'Citizen';

  @override
  void initState() {
    super.initState();

    TokenStorage().readName().then((value) {
      if (mounted && value != null && value.isNotEmpty) {
        setState(() => _name = value);
      }
    });
  }

  Future<void> _logout() async {
    await AuthService().logout();

    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => const LoginPage(),
      ),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'My Profile',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const SizedBox(height: 24),
          const CircleAvatar(
            radius: 48,
            backgroundColor: Color(0xFFDDF4F0),
            child: Icon(
              Icons.person_rounded,
              size: 52,
              color: AppTheme.navy,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _name,
            textAlign: TextAlign.center,
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          const Text(
            'Citizen account',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.black54),
          ),
          const SizedBox(height: 32),
          Card(
            child: ListTile(
              leading: const Icon(Icons.assignment_outlined),
              title: const Text('My Reports'),
              subtitle: const Text(
                'View your submitted ground reports',
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const CitizenReportsPage(),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.shield_outlined),
              title: const Text('Safety Information'),
              subtitle: const Text(
                'Stay informed about disaster safety',
              ),
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: _logout,
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sign out'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppTheme.danger,
              padding: const EdgeInsets.all(16),
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// REUSABLE WIDGETS
// ============================================================

class _Shortcut extends StatelessWidget {
  const _Shortcut({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                backgroundColor: color,
                child: Icon(icon, color: AppTheme.navy),
              ),
              const SizedBox(height: 14),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AlertCard extends StatelessWidget {
  const _AlertCard({required this.alert});

  final HazardAlert alert;

  @override
  Widget build(BuildContext context) {
    final level = alert.level.toLowerCase();

    final severe = level.contains('high') ||
        level.contains('red') ||
        level.contains('critical');

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.warning_amber_rounded,
              color: severe ? AppTheme.danger : AppTheme.blue,
              size: 28,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    alert.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (alert.area.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      alert.area,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                  if (alert.message.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(alert.message),
                  ],
                  const SizedBox(height: 8),
                  Text(
                    alert.level.toUpperCase(),
                    style: TextStyle(
                      color:
                          severe ? AppTheme.danger : AppTheme.teal,
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
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

class _MessageCard extends StatelessWidget {
  const _MessageCard({
    required this.icon,
    required this.text,
  });

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Icon(icon, color: AppTheme.blue, size: 26),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                text,
                style: const TextStyle(height: 1.4),
              ),
            ),
          ],
        ),
      ),
    );
  }
}