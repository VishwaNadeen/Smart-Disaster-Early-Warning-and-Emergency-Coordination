import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/theme/app_theme.dart';
import '../../services/ground_report_service.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_text_field.dart';
import 'report_success_page.dart';

class SubmitReportPage extends StatefulWidget {
  const SubmitReportPage({super.key});

  @override
  State<SubmitReportPage> createState() => _SubmitReportPageState();
}

class _ReportAttachment {
  const _ReportAttachment({
    required this.file,
    required this.name,
    required this.extension,
  });

  final File file;
  final String name;
  final String extension;

  bool get isImage => const [
        'jpg',
        'jpeg',
        'png',
        'webp',
        'gif',
        'bmp',
        'heic',
        'heif',
        'avif',
      ].contains(extension);

  bool get isVideo => const [
        'mp4',
        'mov',
        'm4v',
        'avi',
        'mkv',
        'webm',
        '3gp',
      ].contains(extension);

  IconData get icon {
    if (isImage) return Icons.image_outlined;
    if (isVideo) return Icons.video_file_outlined;
    if (extension == 'pdf') return Icons.picture_as_pdf_outlined;
    return Icons.insert_drive_file_outlined;
  }
}

class _SubmitReportPageState extends State<SubmitReportPage> {
  final _formKey = GlobalKey<FormState>();
  final _description = TextEditingController();
  final _latitude = TextEditingController();
  final _longitude = TextEditingController();
  final _customType = TextEditingController();
  final _picker = ImagePicker();

  static const _types = [
    'Rising Water Level',
    'Flooding',
    'Blocked Road',
    'Landslide Crack',
    'Landslide',
    'Damaged Bridge',
    'Fallen Tree',
    'Fire',
    'Strong Winds',
    'Other',
  ];

  // Limits protect the app and server from excessively large submissions.
  static const int _maxAttachments = 10;
  static const int _maxFileBytes = 20 * 1024 * 1024;

  String? _hazardType;
  final List<_ReportAttachment> _attachments = [];

  bool _gettingLocation = false;
  bool _submitting = false;
  String? _error;
  String? _locationMessage;

  @override
  void dispose() {
    _description.dispose();
    _latitude.dispose();
    _longitude.dispose();
    _customType.dispose();
    super.dispose();
  }

  String? _required(String? value) =>
      value == null || value.trim().isEmpty
          ? 'This field is required'
          : null;

  String _extensionOf(String name) {
    final dot = name.lastIndexOf('.');
    if (dot < 0 || dot == name.length - 1) return '';
    return name.substring(dot + 1).toLowerCase();
  }

  Future<void> _addFiles(List<_ReportAttachment> files) async {
    if (!mounted || files.isEmpty) return;

    final accepted = <_ReportAttachment>[];
    final rejected = <String>[];

    for (final attachment in files) {
      if (!await attachment.file.exists()) {
        rejected.add('${attachment.name}: file unavailable');
        continue;
      }

      final size = await attachment.file.length();

      if (size > _maxFileBytes) {
        rejected.add('${attachment.name}: exceeds 20 MB');
        continue;
      }

      accepted.add(attachment);
    }

    final availableSlots = _maxAttachments - _attachments.length;
    final toAdd = accepted.take(availableSlots).toList();

    setState(() {
      _attachments.addAll(toAdd);
      _error = null;

      if (rejected.isNotEmpty) {
        _error = rejected.join('\n');
      } else if (accepted.length > availableSlots) {
        _error = 'You can attach up to $_maxAttachments files.';
      }
    });
  }

  Future<void> _pickCameraPhoto() async {
    try {
      final picked = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
        maxWidth: 2000,
        maxHeight: 2000,
      );

      if (picked == null) return;

      final name = picked.name;

      await _addFiles([
        _ReportAttachment(
          file: File(picked.path),
          name: name,
          extension: _extensionOf(name),
        ),
      ]);
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Could not capture the photo: $e');
      }
    }
  }

  Future<void> _pickGalleryPhotos() async {
    try {
      final picked = await _picker.pickMultiImage(
        imageQuality: 85,
        maxWidth: 2000,
        maxHeight: 2000,
      );

      await _addFiles(
        picked.map((item) {
          return _ReportAttachment(
            file: File(item.path),
            name: item.name,
            extension: _extensionOf(item.name),
          );
        }).toList(),
      );
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Could not select photos: $e');
      }
    }
  }

  Future<void> _pickFiles() async {
    try {
      final files = await FilePicker.pickFiles(
        type: FileType.any,
      );

      if (files.isEmpty) return;

      final selected = <_ReportAttachment>[];

      for (final item in files) {
        final path = item.path;

        if (path == null) continue;

        selected.add(
          _ReportAttachment(
            file: File(path),
            name: item.name,
            extension: _extensionOf(item.name),
          ),
        );
      }

      await _addFiles(selected);
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Could not select files: $e');
      }
    }
  }

  void _removeAttachment(int index) {
    setState(() {
      _attachments.removeAt(index);
      _error = null;
    });
  }

  Future<void> _getLocation() async {
    setState(() {
      _gettingLocation = true;
      _error = null;
      _locationMessage = null;
    });

    try {
      final enabled = await Geolocator.isLocationServiceEnabled();

      if (!enabled) {
        throw Exception(
          'Enable location services or enter coordinates manually.',
        );
      }

      var permission = await Geolocator.checkPermission();

      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw Exception(
          'Location permission was denied. Enter coordinates manually.',
        );
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      ).timeout(const Duration(seconds: 20));

      _latitude.text = position.latitude.toStringAsFixed(6);
      _longitude.text = position.longitude.toStringAsFixed(6);

      setState(() {
        _locationMessage =
            'Current location captured. Confirm it is correct.';
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _gettingLocation = false);
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final lat = double.tryParse(_latitude.text.trim());
    final lon = double.tryParse(_longitude.text.trim());

    if (lat == null ||
        lon == null ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180) {
      setState(() {
        _error =
            'Enter valid latitude and longitude, or capture your location.';
      });
      return;
    }

    final type = _hazardType == 'Other'
        ? _customType.text.trim()
        : (_hazardType ?? '');

    if (type.isEmpty) {
      setState(() => _error = 'Enter the hazard type.');
      return;
    }

    if (_attachments.isEmpty && _description.text.trim().isEmpty) {
      setState(() {
        _error = 'Add a photo, video, file, or description.';
      });
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      // GroundReportService must support the attachments parameter.
      await GroundReportService().submit(
        hazardType: type,
        description: _description.text.trim(),
        latitude: lat,
        longitude: lon,
        attachments: _attachments.map((item) => item.file).toList(),
      );

      if (!mounted) return;

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => const ReportSuccessPage(),
        ),
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Widget _attachmentTile(int index) {
    final attachment = _attachments[index];

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: attachment.isImage
            ? ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Image.file(
                  attachment.file,
                  width: 52,
                  height: 52,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Icon(attachment.icon),
                ),
              )
            : Icon(attachment.icon, color: AppTheme.blue, size: 32),
        title: Text(
          attachment.name,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          attachment.isImage
              ? 'Image'
              : attachment.isVideo
                  ? 'Video'
                  : 'File',
        ),
        trailing: IconButton(
          tooltip: 'Remove attachment',
          onPressed: _submitting ? null : () => _removeAttachment(index),
          icon: const Icon(Icons.delete_outline),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Report a hazard')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFE7F1FB),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline, color: AppTheme.blue),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Share what you observed. Your report will be reviewed '
                      'by a duty officer before it affects official warnings.',
                      style: TextStyle(height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
            Text(
              'What did you observe?',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _hazardType,
              decoration: const InputDecoration(
                labelText: 'Hazard type',
                prefixIcon: Icon(Icons.warning_amber_rounded),
              ),
              items: _types
                  .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                  .toList(),
              onChanged: _submitting
                  ? null
                  : (v) => setState(() {
                        _hazardType = v;
                        _error = null;
                      }),
              validator: (v) => v == null ? 'Select a hazard type' : null,
            ),
            if (_hazardType == 'Other') ...[
              const SizedBox(height: 14),
              AppTextField(
                controller: _customType,
                label: 'Describe the hazard type',
                validator: _required,
              ),
            ],
            const SizedBox(height: 14),
            AppTextField(
              controller: _description,
              label: 'Description',
              hint: 'What happened? Is anyone in immediate danger?',
              maxLines: 4,
            ),
            const SizedBox(height: 22),
            Text(
              'Evidence and attachments',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Text(
              'Attach up to $_maxAttachments photos, videos, or files. '
              'Maximum 20 MB per file.',
              style: const TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 10),
            if (_attachments.isNotEmpty)
              ...List.generate(
                _attachments.length,
                _attachmentTile,
              )
            else
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: const Color(0xFFD9E2EC)),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Column(
                  children: [
                    Icon(
                      Icons.attach_file,
                      size: 34,
                      color: AppTheme.blue,
                    ),
                    SizedBox(height: 8),
                    Text('Add evidence for the emergency report'),
                    Text(
                      'Photos, videos, and documents are supported',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.black54),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _submitting ? null : _pickCameraPhoto,
                    icon: const Icon(Icons.camera_alt_outlined),
                    label: const Text('Camera'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _submitting ? null : _pickGalleryPhotos,
                    icon: const Icon(Icons.photo_library_outlined),
                    label: const Text('Photos'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _submitting ? null : _pickFiles,
                icon: const Icon(Icons.attach_file),
                label: const Text('Choose videos and files'),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Location',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Capture your GPS position or enter coordinates confirmed '
              'from a map.',
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed:
                  _gettingLocation || _submitting ? null : _getLocation,
              icon: _gettingLocation
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.my_location_rounded),
              label: Text(
                _gettingLocation ? 'Getting location…' : 'Use current location',
              ),
            ),
            if (_locationMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                _locationMessage!,
                style: const TextStyle(color: AppTheme.teal),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: AppTextField(
                    controller: _latitude,
                    label: 'Latitude',
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                      signed: true,
                    ),
                    validator: _required,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: AppTextField(
                    controller: _longitude,
                    label: 'Longitude',
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                      signed: true,
                    ),
                    validator: _required,
                  ),
                ),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(
                _error!,
                style: const TextStyle(color: AppTheme.danger),
              ),
            ],
            const SizedBox(height: 24),
            AppButton(
              label: 'Submit ground report',
              icon: Icons.send_rounded,
              onPressed: _submit,
              loading: _submitting,
            ),
            const SizedBox(height: 12),
            const Text(
              'Please report only what you have observed. Do not put '
              'yourself in danger to collect evidence.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.black54, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}