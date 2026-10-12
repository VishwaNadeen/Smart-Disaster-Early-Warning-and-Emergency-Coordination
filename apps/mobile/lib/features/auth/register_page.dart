
import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../services/auth_service.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_text_field.dart';
import '../home/citizen_home_page.dart';
import 'login_page.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _formKey = GlobalKey<FormState>();

  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _nic = TextEditingController();
  final _address = TextEditingController();

  String? _district;
  bool _loading = false;
  String? _error;

  static const List<String> districts = [
    'Ampara',
    'Anuradhapura',
    'Badulla',
    'Batticaloa',
    'Colombo',
    'Galle',
    'Gampaha',
    'Hambantota',
    'Jaffna',
    'Kalutara',
    'Kandy',
    'Kegalle',
    'Kilinochchi',
    'Kurunegala',
    'Mannar',
    'Matale',
    'Matara',
    'Monaragala',
    'Mullaitivu',
    'Nuwara Eliya',
    'Polonnaruwa',
    'Puttalam',
    'Ratnapura',
    'Trincomalee',
    'Vavuniya',
  ];

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _nic.dispose();
    _address.dispose();
    super.dispose();
  }

  String? _requiredText(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'This field is required';
    }
    return null;
  }

  String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';

    if (email.isEmpty || !email.contains('@') ||
        !email.substring(email.indexOf('@') + 1).contains('.')) {
      return 'Enter a valid email address';
    }

    return null;
  }

  String? _validatePassword(String? value) {
    if (value == null || value.length < 8) {
      return 'Use at least 8 characters';
    }

    return null;
  }

  Future<void> _register() async {
    if (_loading) return;

    FocusScope.of(context).unfocus();

    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await AuthService().register(
        name: _name.text.trim(),
        email: _email.text.trim(),
        password: _password.text,
        nationalId: _nic.text.trim(),
        address: _address.text.trim(),
        district: _district!,
      );

      // Check authentication after registration. Some APIs return a token,
      // while others require the citizen to sign in separately.
      final loggedIn = await AuthService().isLoggedIn();

      if (!mounted) return;

      if (loggedIn) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(
            builder: (_) => const CitizenHomePage(),
          ),
          (route) => false,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Account created successfully. Please sign in.',
            ),
          ),
        );

        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(
            builder: (_) => const LoginPage(),
          ),
          (route) => false,
        );
      }
    } on ApiException catch (e) {
      if (!mounted) return;

      setState(() {
        _error = e.message;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create account'),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(22),
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppTheme.blue.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Icon(
                      Icons.person_add_alt_1_rounded,
                      color: AppTheme.blue,
                      size: 32,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Join your community safety network',
                    style: Theme.of(context)
                        .textTheme
                        .headlineSmall
                        ?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppTheme.navy,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Create an account to receive relevant hazard alerts '
                    'and submit ground reports.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          height: 1.5,
                        ),
                  ),
                  const SizedBox(height: 26),

                  // Full name
                  AppTextField(
                    controller: _name,
                    label: 'Full name',
                    prefixIcon: Icons.person_outline,
                    validator: _requiredText,
                  ),
                  const SizedBox(height: 14),

                  // Email
                  AppTextField(
                    controller: _email,
                    label: 'Email address',
                    keyboardType: TextInputType.emailAddress,
                    prefixIcon: Icons.email_outlined,
                    validator: _validateEmail,
                  ),
                  const SizedBox(height: 14),

                  // Password
                  AppTextField(
                    controller: _password,
                    label: 'Password',
                    obscureText: true,
                    prefixIcon: Icons.lock_outline,
                    validator: _validatePassword,
                  ),
                  const SizedBox(height: 14),

                  // National identity number
                  AppTextField(
                    controller: _nic,
                    label: 'National identity number',
                    prefixIcon: Icons.badge_outlined,
                    validator: _requiredText,
                  ),
                  const SizedBox(height: 14),

                  // Home address
                  AppTextField(
                    controller: _address,
                    label: 'Home address',
                    prefixIcon: Icons.home_outlined,
                    maxLines: 2,
                    validator: _requiredText,
                  ),
                  const SizedBox(height: 14),

                  // District
                  DropdownButtonFormField<String>(
                    initialValue: _district,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      labelText: 'District',
                      prefixIcon: Icon(Icons.location_city_outlined),
                    ),
                    items: districts.map((district) {
                      return DropdownMenuItem<String>(
                        value: district,
                        child: Text(district),
                      );
                    }).toList(),
                    onChanged: _loading
                        ? null
                        : (value) {
                            setState(() {
                              _district = value;
                              _error = null;
                            });
                          },
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Select your district';
                      }
                      return null;
                    },
                  ),

                  // API or registration errors
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.danger.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.error_outline,
                            color: AppTheme.danger,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _error!,
                              style: const TextStyle(
                                color: AppTheme.danger,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),

                  AppButton(
                    label: 'Create account',
                    icon: Icons.person_add_alt_1_rounded,
                    onPressed: _loading ? null : _register,
                    loading: _loading,
                  ),

                  const SizedBox(height: 12),

                  Center(
                    child: TextButton(
                      onPressed: _loading
                          ? null
                          : () {
                              Navigator.of(context).pushReplacement(
                                MaterialPageRoute(
                                  builder: (_) => const LoginPage(),
                                ),
                              );
                            },
                      child: const Text(
                        'Already have an account? Sign in',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
