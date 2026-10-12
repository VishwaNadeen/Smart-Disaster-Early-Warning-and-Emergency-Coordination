import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../services/auth_service.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_text_field.dart';
import '../home/citizen_home_page.dart';
import 'register_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      await AuthService().login(email: _email.text, password: _password.text);
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const CitizenHomePage()),
        (_) => false,
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 64, height: 64,
                      decoration: BoxDecoration(
                        color: AppTheme.blue.withValues(alpha: .1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Icon(Icons.health_and_safety_rounded,
                          size: 36, color: AppTheme.blue),
                    ),
                    const SizedBox(height: 28),
                    Text('Disaster Ready',
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w800, color: AppTheme.navy)),
                    const SizedBox(height: 8),
                    Text('Stay informed. Stay safe. Help your community.',
                        style: Theme.of(context).textTheme.bodyLarge),
                    const SizedBox(height: 30),
                    AppTextField(
                      controller: _email, label: 'Email address',
                      keyboardType: TextInputType.emailAddress,
                      prefixIcon: Icons.email_outlined,
                      validator: (v) => v == null || !v.contains('@')
                          ? 'Enter a valid email address' : null,
                    ),
                    const SizedBox(height: 16),
                    AppTextField(
                      controller: _password, label: 'Password',
                      obscureText: true, prefixIcon: Icons.lock_outline,
                      validator: (v) => v == null || v.isEmpty
                          ? 'Enter your password' : null,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(_error!, style: const TextStyle(color: AppTheme.danger)),
                    ],
                    const SizedBox(height: 22),
                    AppButton(label: 'Sign in', onPressed: _login, loading: _loading),
                    const SizedBox(height: 14),
                    Center(
                      child: TextButton(
                        onPressed: () => Navigator.push(context,
                          MaterialPageRoute(builder: (_) => const RegisterPage())),
                        child: const Text('New here? Create an account'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
