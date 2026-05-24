import 'package:flutter/material.dart';
import 'package:mobile_app/l10n/app_localizations.dart';
import 'package:mobile_app/services/auth_service.dart';

Future<void> showLoginSheet({
  required BuildContext context,
  required AppLocalizations localizations,
  required AuthService authService,
  required Future<void> Function() onLoginSuccess,
  required VoidCallback onSignedIn,
}) {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  String? loginError;
  bool isLoading = false;

  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: const Color(0xFF121212),
    builder: (context) {
      return StatefulBuilder(
        builder: (context, setModalState) {
          Future<void> doLogin() async {
            setModalState(() {
              isLoading = true;
              loginError = null;
            });
            final result = await authService.login(
              emailController.text,
              passwordController.text,
            );
            if (!context.mounted) return;
            if (result.success) {
              Navigator.of(context).pop();
              onSignedIn();
              await onLoginSuccess();
            } else {
              setModalState(() {
                loginError = result.errorMessage;
                isLoading = false;
              });
            }
          }

          Future<void> doGoogleLogin() async {
            setModalState(() {
              isLoading = true;
              loginError = null;
            });
            final result = await authService.loginWithGoogle();
            if (!context.mounted) return;
            if (result.success) {
              Navigator.of(context).pop();
              onSignedIn();
              await onLoginSuccess();
            } else {
              setModalState(() {
                loginError = result.errorMessage;
                isLoading = false;
              });
            }
          }

          Future<void> doAppleLogin() async {
            setModalState(() {
              isLoading = true;
              loginError = null;
            });
            final result = await authService.loginWithApple();
            if (!context.mounted) return;
            if (result.success) {
              Navigator.of(context).pop();
              onSignedIn();
              await onLoginSuccess();
            } else {
              setModalState(() {
                loginError = result.errorMessage;
                isLoading = false;
              });
            }
          }

          return SafeArea(
            child: Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    localizations.signIn,
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 20,
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: emailController,
                    keyboardType: TextInputType.emailAddress,
                    autocorrect: false,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: localizations.email,
                      labelStyle: TextStyle(color: Colors.white70),
                      enabledBorder: UnderlineInputBorder(
                        borderSide: BorderSide(color: Colors.white30),
                      ),
                      focusedBorder: UnderlineInputBorder(
                        borderSide: BorderSide(color: Colors.indigoAccent),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: passwordController,
                    obscureText: true,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: localizations.password,
                      labelStyle: TextStyle(color: Colors.white70),
                      enabledBorder: UnderlineInputBorder(
                        borderSide: BorderSide(color: Colors.white30),
                      ),
                      focusedBorder: UnderlineInputBorder(
                        borderSide: BorderSide(color: Colors.indigoAccent),
                      ),
                    ),
                    onSubmitted: (_) => doLogin(),
                  ),
                  if (loginError != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      loginError!,
                      style: const TextStyle(color: Colors.redAccent),
                    ),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: isLoading ? null : doLogin,
                    child: isLoading
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(localizations.signIn),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: isLoading ? null : doGoogleLogin,
                    icon: const Icon(Icons.g_mobiledata),
                    label: Text(localizations.signInWithGoogle),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: isLoading ? null : doAppleLogin,
                    icon: const Icon(Icons.apple),
                    label: Text(localizations.signInWithApple),
                  ),
                ],
              ),
            ),
          );
        },
      );
    },
  );
}
