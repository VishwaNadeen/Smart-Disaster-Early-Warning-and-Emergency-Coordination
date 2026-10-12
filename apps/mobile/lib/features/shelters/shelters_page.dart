import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../../models/shelter.dart';
import '../../services/shelter_service.dart';
import 'shelter_details_page.dart';

class SheltersPage extends StatefulWidget {
  const SheltersPage({super.key, this.service});

  final ShelterService? service;

  @override
  State<SheltersPage> createState() => _SheltersPageState();
}

class _SheltersPageState extends State<SheltersPage> {
  static const LatLng _defaultCenter = LatLng(7.8731, 80.7718);

  final MapController _mapController = MapController();
  final TextEditingController _searchController =
      TextEditingController();

  late final ShelterService _service;

  List<Shelter> _shelters = [];
  Shelter? _selectedShelter;
  LatLng? _currentLocation;

  bool _loading = true;
  bool _locating = false;
  String? _error;

  String _filter = 'All';
  String _search = '';

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? ShelterService();
    _loadShelters();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _loadShelters() async {
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final shelters = await _service.getShelters();

      if (!mounted) return;

      setState(() {
        _shelters = shelters.where(_hasValidCoordinates).toList();
        _loading = false;
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _error =
            'Could not load shelters. Check your connection and API configuration.';
        _loading = false;
      });

      debugPrint('Shelter API error: $error');
    }
  }

  bool _hasValidCoordinates(Shelter shelter) {
    return shelter.latitude >= -90 &&
        shelter.latitude <= 90 &&
        shelter.longitude >= -180 &&
        shelter.longitude <= 180;
  }

  List<Shelter> get _visibleShelters {
    final query = _search.trim().toLowerCase();

    return _shelters.where((shelter) {
      final matchesSearch = query.isEmpty ||
          shelter.name.toLowerCase().contains(query) ||
          shelter.address.toLowerCase().contains(query);

      final matchesFilter =
          _filter != 'Available' || shelter.isAvailable;

      return matchesSearch && matchesFilter;
    }).toList();
  }

  Future<void> _goToCurrentLocation() async {
    setState(() => _locating = true);

    try {
      final enabled =
          await Geolocator.isLocationServiceEnabled();

      if (!enabled) {
        _showMessage(
          'Turn on location services and try again.',
        );
        return;
      }

      var permission = await Geolocator.checkPermission();

      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied) {
        _showMessage(
          'Location permission was denied. You can still browse shelters.',
        );
        return;
      }

      if (permission == LocationPermission.deniedForever) {
        _showMessage(
          'Location permission is permanently denied. Enable it in app settings.',
        );
        await Geolocator.openAppSettings();
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );

      if (!mounted) return;

      final location = LatLng(
        position.latitude,
        position.longitude,
      );

      setState(() => _currentLocation = location);

      _mapController.move(location, 15);
    } catch (error) {
      _showMessage(
        'Unable to get your location. Please try again.',
      );
      debugPrint('Current location error: $error');
    } finally {
      if (mounted) {
        setState(() => _locating = false);
      }
    }
  }

  void _selectShelter(Shelter shelter) {
    setState(() => _selectedShelter = shelter);

    _mapController.move(
      LatLng(shelter.latitude, shelter.longitude),
      15,
    );
  }

  void _openDetails(Shelter shelter) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ShelterDetailsPage(shelter: shelter),
      ),
    );
  }

  void _showMessage(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visibleShelters;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Emergency Shelters',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh shelters',
            onPressed: _loading ? null : _loadShelters,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),

      // The map now fills the entire body.
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Full-screen map background.
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _defaultCenter,
              initialZoom: 7,
              onTap: (_, __) {
                setState(() => _selectedShelter = null);
              },
            ),
            children: [
              TileLayer(
                urlTemplate:
                    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.example.disaster_ready',
              ),

              MarkerLayer(
                markers: [
                  ...visible.map(
                    (shelter) => Marker(
                      point: LatLng(
                        shelter.latitude,
                        shelter.longitude,
                      ),
                      width: 46,
                      height: 52,
                      child: GestureDetector(
                        onTap: () => _selectShelter(shelter),
                        child: Icon(
                          Icons.location_on,
                          size: 42,
                          color: _selectedShelter?.id == shelter.id
                              ? Colors.orange.shade800
                              : shelter.isAvailable
                                  ? Colors.red.shade700
                                  : Colors.grey.shade700,
                        ),
                      ),
                    ),
                  ),

                  if (_currentLocation != null)
                    Marker(
                      point: _currentLocation!,
                      width: 32,
                      height: 32,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.blue,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.white,
                            width: 3,
                          ),
                          boxShadow: const [
                            BoxShadow(
                              color: Colors.black26,
                              blurRadius: 5,
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),

              RichAttributionWidget(
                attributions: [
                  TextSourceAttribution(
                    'OpenStreetMap contributors',
                    onTap: () {},
                  ),
                ],
              ),
            ],
          ),

          // Floating search and filter controls.
          Positioned(
            top: 12,
            left: 14,
            right: 14,
            child: Column(
              children: [
                Material(
                  elevation: 4,
                  shadowColor: Colors.black26,
                  borderRadius: BorderRadius.circular(16),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (value) {
                      setState(() => _search = value);
                    },
                    decoration: InputDecoration(
                      hintText: 'Search by shelter or area',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _search.isEmpty
                          ? null
                          : IconButton(
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _search = '');
                              },
                              icon: const Icon(Icons.clear),
                            ),
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(
                        vertical: 14,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 10),

                Row(
                  children: [
                    _filterChip('All'),
                    const SizedBox(width: 8),
                    _filterChip('Available'),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 9,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${visible.length} shelters',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Current location button floats above the map.
          Positioned(
            right: 16,
            bottom: 180,
            child: FloatingActionButton.small(
              heroTag: 'myLocationButton',
              tooltip: 'Use my current location',
              backgroundColor: Colors.white,
              foregroundColor: Colors.blue.shade900,
              onPressed:
                  _locating ? null : _goToCurrentLocation,
              child: _locating
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                      ),
                    )
                  : const Icon(Icons.my_location),
            ),
          ),

          // Draggable shelter list overlays the map.
          DraggableScrollableSheet(
            initialChildSize: 0.24,
            minChildSize: 0.10,
            maxChildSize: 0.78,
            snap: true,
            snapSizes: const [0.24, 0.50, 0.78],
            builder: (context, scrollController) {
              return Container(
                decoration: BoxDecoration(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(24),
                  ),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black26,
                      blurRadius: 12,
                      offset: Offset(0, -3),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // Drag handle.
                    Padding(
                      padding: const EdgeInsets.only(
                        top: 10,
                        bottom: 8,
                      ),
                      child: Container(
                        width: 42,
                        height: 5,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade400,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),

                    Padding(
                      padding: const EdgeInsets.fromLTRB(
                        18,
                        0,
                        18,
                        10,
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.health_and_safety_outlined,
                            size: 23,
                          ),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Text(
                              'Nearby Shelters',
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          if (_loading)
                            const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                              ),
                            )
                          else
                            Text(
                              '${visible.length}',
                              style: TextStyle(
                                color: Colors.grey.shade700,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                        ],
                      ),
                    ),

                    const Divider(height: 1),

                    Expanded(
                      child: _buildShelterList(
                        visible,
                        scrollController,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildShelterList(
    List<Shelter> visible,
    ScrollController scrollController,
  ) {
    if (_loading && _shelters.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.cloud_off_outlined,
                size: 34,
              ),
              const SizedBox(height: 8),
              Text(
                _error!,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _loading ? null : _loadShelters,
                icon: const Icon(Icons.refresh),
                label: const Text('Try again'),
              ),
            ],
          ),
        ),
      );
    }

    if (visible.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.location_searching,
                size: 34,
              ),
              const SizedBox(height: 8),
              Text(
                _shelters.isEmpty
                    ? 'No shelters available yet.'
                    : 'No shelters match your search.',
                textAlign: TextAlign.center,
              ),
              if (_shelters.isEmpty) ...[
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: _loading ? null : _loadShelters,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Refresh'),
                ),
              ],
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      controller: scrollController,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
      itemCount: visible.length,
      separatorBuilder: (_, __) => const SizedBox(height: 4),
      itemBuilder: (context, index) {
        final shelter = visible[index];
        final selected =
            _selectedShelter?.id == shelter.id;

        return Card(
          elevation: selected ? 2 : 0,
          color: selected
              ? Theme.of(context).colorScheme.secondaryContainer
              : null,
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: shelter.isAvailable
                  ? Colors.green.shade100
                  : Colors.grey.shade300,
              child: Icon(
                Icons.health_and_safety,
                color: shelter.isAvailable
                    ? Colors.green.shade800
                    : Colors.grey.shade800,
              ),
            ),
            title: Text(
              shelter.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  shelter.address,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  _capacityLabel(shelter),
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ],
            ),
            isThreeLine: true,
            onTap: () => _selectShelter(shelter),
            trailing: IconButton(
              tooltip: 'Shelter details',
              icon: const Icon(Icons.chevron_right),
              onPressed: () => _openDetails(shelter),
            ),
          ),
        );
      },
    );
  }

  Widget _filterChip(String value) {
    return ChoiceChip(
      label: Text(value),
      selected: _filter == value,
      onSelected: (_) {
        setState(() => _filter = value);
      },
    );
  }

  String _capacityLabel(Shelter shelter) {
    final spaces = shelter.availableSpaces;

    if (spaces != null) {
      return '$spaces spaces available';
    }

    return shelter.isAvailable
        ? 'Availability: ${shelter.status}'
        : 'Currently unavailable';
  }
}