import 'package:flutter/material.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../core/theme/app_theme.dart';
import '../../services/help_request_service.dart';

/// Profile keys accepted by this page:
/// name, email, phone, district, city, address
typedef HelpRequestProfileLoader = Future<Map<String, dynamic>> Function();

class HelpRequestPage extends StatefulWidget {
  const HelpRequestPage({
    super.key,
    required this.service,
    required this.loadProfile,
  });

  final HelpRequestService service;
  final HelpRequestProfileLoader loadProfile;

  @override
  State<HelpRequestPage> createState() => _HelpRequestPageState();
}

class _HelpRequestPageState extends State<HelpRequestPage> {
  final Geocoding _geocoding = Geocoding();
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final _locationDescriptionController = TextEditingController();
  final _districtController = TextEditingController();
  final _cityController = TextEditingController();

  static const _defaultPosition = LatLng(7.8731, 80.7718); // Sri Lanka fallback
  LatLng? _selectedPosition;
  final MapController _mapController = MapController();
bool _mapReady = false;
  String _urgency = 'HIGH';
  bool _loadingLocation = false;
  bool _submitting = false;
  bool _loadingProfile = true;
  String? _locationError;
  Map<String, dynamic> _profile = {};

  @override
  void initState() {
    super.initState();
    _loadCitizenProfile();
    _detectCurrentLocation();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _locationDescriptionController.dispose();
    _districtController.dispose();
    _cityController.dispose();
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _loadCitizenProfile() async {
    try {
      final profile = await widget.loadProfile();
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _districtController.text = _stringValue(profile, ['district']);
        _cityController.text = _stringValue(profile, ['city', 'town']);
        _loadingProfile = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingProfile = false);
    }
  }

  String _stringValue(Map<String, dynamic> source, List<String> keys) {
    for (final key in keys) {
      final value = source[key];
      if (value != null && value.toString().trim().isNotEmpty) {
        return value.toString().trim();
      }
    }
    return '';
  }

  Future<void> _detectCurrentLocation() async {
    setState(() {
      _loadingLocation = true;
      _locationError = null;
    });

    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        throw Exception('Enable Location Services on your phone and try again.');
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied) {
        throw Exception('Location permission was denied.');
      }
      if (permission == LocationPermission.deniedForever) {
        throw Exception(
          'Location permission is permanently denied. Enable it in app settings.',
        );
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 20),
        ),
      );
      final point = LatLng(position.latitude, position.longitude);
      if (!mounted) return;
      setState(() => _selectedPosition = point);
      if (_mapReady) {
        _mapController.move(point, 16);
      }
      await _reverseGeocode(point);
    } catch (error) {
      if (!mounted) return;
      setState(() => _locationError = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loadingLocation = false);
    }
  }

  Future<void> _onMapTap(LatLng point) async {
    setState(() {
      _selectedPosition = point;
      _locationError = null;
    });
    await _reverseGeocode(point);
  }

  Future<void> _reverseGeocode(LatLng point) async {
    try {
          final placemarks = await _geocoding.placemarkFromCoordinates(
      point.latitude,
      point.longitude,
    );
      if (placemarks.isEmpty || !mounted) return;
      final place = placemarks.first;
      final description = [
        place.name,
        place.street,
        place.subLocality,
        place.locality,
        place.administrativeArea,
      ].whereType<String>().map((s) => s.trim()).where((s) => s.isNotEmpty).toSet().join(', ');

      setState(() {
        if (description.isNotEmpty) {
          _locationDescriptionController.text = description;
        }
        // Only prefill blank fields; citizens can still edit these values.
        if (_cityController.text.trim().isEmpty) {
          _cityController.text = (place.locality ?? place.subAdministrativeArea ?? '').trim();
        }
        if (_districtController.text.trim().isEmpty) {
          _districtController.text = (place.administrativeArea ?? '').trim();
        }
      });
    } catch (_) {
      // Coordinates are still valid if reverse geocoding is unavailable.
    }
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!_formKey.currentState!.validate()) return;

    final position = _selectedPosition;
    if (position == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select your incident location on the map first.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final result = await widget.service.createHelpRequest(
        description: _descriptionController.text.trim(),
        urgency: _urgency,
        latitude: position.latitude,
        longitude: position.longitude,
        locationDescription: _locationDescriptionController.text.trim(),
        district: _districtController.text.trim(),
        city: _cityController.text.trim(),
      );

      if (!mounted) return;
      final requestNumber = result['requestNumber']?.toString();
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) => AlertDialog(
          icon: const Icon(Icons.check_circle, color: Colors.green, size: 42),
          title: const Text('Help request submitted'),
          content: Text(
            requestNumber == null || requestNumber.isEmpty
                ? 'Your request was sent to the Disaster Management Centre.'
                : 'Your request number is $requestNumber.',
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Done'),
            ),
          ],
        ),
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not submit help request: ${error.toString()}'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final markerPosition = _selectedPosition;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Request Emergency Help'),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.danger.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.danger.withValues(alpha: 0.25)),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.sos_rounded, color: AppTheme.danger, size: 30),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Use this form to request assistance during an emergency. '
                        'Your signed-in account details are associated with the request.',
                        style: TextStyle(height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              Text('Your details', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: _loadingProfile
                      ? const LinearProgressIndicator()
                      : Column(
                          children: [
                            _profileRow(Icons.person_outline, 'Name', _stringValue(_profile, ['name', 'fullName'],).isEmpty ? 'From your signed-in account' : _stringValue(_profile, ['name', 'fullName'])),
                            _profileRow(Icons.phone_outlined, 'Phone', _stringValue(_profile, ['phone', 'phoneNumber']).isEmpty ? 'From your account profile' : _stringValue(_profile, ['phone', 'phoneNumber'])),
                            _profileRow(Icons.email_outlined, 'Email', _stringValue(_profile, ['email']).isEmpty ? 'From your account profile' : _stringValue(_profile, ['email'])),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 18),
              Text('Incident details', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 10),
              TextFormField(
                controller: _descriptionController,
                minLines: 3,
                maxLines: 5,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'What help do you need?',
                  hintText: 'Describe the emergency and how many people need help.',
                  alignLabelWithHint: true,
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().length < 10) {
                    return 'Please describe the emergency (at least 10 characters).';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                value: _urgency,
                decoration: const InputDecoration(
                  labelText: 'Urgency',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.priority_high_rounded),
                ),
                items: const [
                  DropdownMenuItem(value: 'LOW', child: Text('Low')),
                  DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                  DropdownMenuItem(value: 'HIGH', child: Text('High')),
                  DropdownMenuItem(value: 'CRITICAL', child: Text('Critical — immediate danger')),
                ],
                onChanged: (value) {
                  if (value != null) setState(() => _urgency = value);
                },
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  Expanded(
                    child: Text('Incident location', style: Theme.of(context).textTheme.titleMedium),
                  ),
                  OutlinedButton.icon(
                    onPressed: _loadingLocation ? null : _detectCurrentLocation,
                    icon: _loadingLocation
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.my_location),
                    label: const Text('Use current'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: SizedBox(
                  height: 250,
                  child: 
                  FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: markerPosition ?? _defaultPosition,
                      initialZoom: markerPosition == null ? 6 : 15,
                      onMapReady: () {
                        _mapReady = true;

                        final position = _selectedPosition;
                        if (position != null) {
                          _mapController.move(position, 15);
                        }
                      },
                      onTap: (_, point) => _onMapTap(point),
                    ),
                    children: [
                      TileLayer(
                        urlTemplate:
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.example.mobile',
                      ),
                      if (markerPosition != null)
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: markerPosition,
                              width: 44,
                              height: 44,
                              child: const Icon(
                                Icons.location_on,
                                color: Colors.red,
                                size: 42,
                              ),
                            ),
                          ],
                        ),
                      RichAttributionWidget(
                        attributions: [
                          TextSourceAttribution('OpenStreetMap contributors'),
                        ],
                      ),
                    ],
                  )
                ),
              ),
              if (_locationError != null) ...[
                const SizedBox(height: 8),
                Text(_locationError!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              if (markerPosition != null) ...[
                const SizedBox(height: 8),
                Text(
                  'GPS: ${markerPosition.latitude.toStringAsFixed(6)}, ${markerPosition.longitude.toStringAsFixed(6)}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
              const SizedBox(height: 8),
              const Text('Tap the map to adjust the pin, or use your current location.'),
              const SizedBox(height: 14),
              TextFormField(
                controller: _locationDescriptionController,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Location description',
                  hintText: 'Address, landmark, village, or nearby road',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.place_outlined),
                ),
                validator: (value) => value == null || value.trim().isEmpty
                    ? 'Add a location description.'
                    : null,
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _districtController,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(
                        labelText: 'District',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) => value == null || value.trim().isEmpty
                          ? 'Enter a district.'
                          : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _cityController,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(
                        labelText: 'City / town',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) => value == null || value.trim().isEmpty
                          ? 'Enter a city or town.'
                          : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: _submitting ? null : _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: AppTheme.danger,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                icon: _submitting
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.sos_rounded),
                label: Text(_submitting ? 'Sending request…' : 'Send Help Request'),
              ),
              const SizedBox(height: 10),
              Text(
                'Your location is sent only when you submit this request. Check the pin and contact details before sending.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _profileRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 20),
          const SizedBox(width: 10),
          SizedBox(width: 62, child: Text(label)),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}
