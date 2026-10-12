import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/shelter.dart';

class ShelterDetailsPage extends StatelessWidget {
  const ShelterDetailsPage({super.key, required this.shelter});

  final Shelter shelter;

  Future<void> _openDirections(BuildContext context) async {
    final uri = Uri.parse(
      'https://www.openstreetmap.org/directions?to=${shelter.latitude}%2C${shelter.longitude}',
    );
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open directions.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final spaces = shelter.availableSpaces;
    return Scaffold(
      appBar: AppBar(title: const Text('Shelter details')),
      body: ListView(
        children: [
          SizedBox(
            height: 250,
            child: FlutterMap(
              options: MapOptions(
                initialCenter: LatLng(shelter.latitude, shelter.longitude),
                initialZoom: 15,
                interactionOptions: const InteractionOptions(flags: InteractiveFlag.all),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.example.disaster_ready',
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: LatLng(shelter.latitude, shelter.longitude),
                      width: 48,
                      height: 48,
                      child: const Icon(Icons.location_on, size: 44, color: Colors.red),
                    ),
                  ],
                ),
                RichAttributionWidget(
                  attributions: [TextSourceAttribution('OpenStreetMap contributors')],
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(shelter.name, style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                _detailRow(Icons.location_on_outlined, shelter.address),
                if (shelter.phone?.isNotEmpty == true) ...[
                  const SizedBox(height: 10),
                  _detailRow(Icons.phone_outlined, shelter.phone!),
                ],
                const SizedBox(height: 10),
                _detailRow(
                  Icons.people_outline,
                  spaces == null
                      ? 'Capacity information not provided by the server'
                      : '$spaces spaces available (${shelter.occupancy ?? 0}/${shelter.capacity} occupied)',
                ),
                const SizedBox(height: 10),
                _detailRow(Icons.info_outline, 'Status: ${shelter.status}'),
                if (shelter.description?.isNotEmpty == true) ...[
                  const SizedBox(height: 16),
                  Text(shelter.description!),
                ],
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => _openDirections(context),
                    icon: const Icon(Icons.directions),
                    label: const Text('Get directions'),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Confirm shelter availability with the responsible authority before travelling.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _detailRow(IconData icon, String text) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20),
          const SizedBox(width: 10),
          Expanded(child: Text(text)),
        ],
      );
}
