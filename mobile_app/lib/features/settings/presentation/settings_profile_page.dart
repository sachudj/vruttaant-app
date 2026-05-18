import 'package:flutter/material.dart';
import 'package:mobile_app/l10n/app_localizations.dart';
import 'package:mobile_app/services/auth_service.dart';
import 'package:mobile_app/services/news_api_service.dart';

class SettingsProfilePage extends StatefulWidget {
  const SettingsProfilePage({
    super.key,
    required this.authService,
    required this.newsApiService,
    required this.currentLanguage,
    required this.currentCategories,
    required this.defaultNotificationPreferences,
    required this.normalizeNotificationPreferences,
    required this.categoryOptions,
    required this.currentThemeMode,
  });

  final AuthService authService;
  final NewsApiService newsApiService;
  final String currentLanguage;
  final List<String> currentCategories;
  final Map<String, dynamic> defaultNotificationPreferences;
  final Map<String, dynamic> Function(Map<String, dynamic>?)
  normalizeNotificationPreferences;
  final List<String> categoryOptions;
  final ThemeMode currentThemeMode;

  @override
  State<SettingsProfilePage> createState() => _SettingsProfilePageState();
}

class _SettingsProfilePageState extends State<SettingsProfilePage> {
  static const List<String> _languageCodes = [
    'en',
    'hi',
    'bn',
    'mr',
    'te',
    'ta',
    'gu',
    'ur',
    'kn',
    'or',
    'ml',
  ];

  late String _pendingLanguage;
  late Set<String> _pendingCategories;
  late Map<String, dynamic> _pendingNotifications;
  late ThemeMode _pendingThemeMode;

  bool _isLoading = false;
  bool _isSaving = false;
  bool _isLoggedIn = false;
  bool _hasServerNotificationPrefs = false;
  List<Map<String, dynamic>> _devices = const [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _pendingLanguage = widget.currentLanguage;
    _pendingCategories = widget.currentCategories.toSet();
    _pendingThemeMode = widget.currentThemeMode;
    _pendingNotifications = widget.normalizeNotificationPreferences(
      widget.defaultNotificationPreferences,
    );
    _isLoggedIn = widget.authService.isLoggedIn;

    if (_isLoggedIn) {
      _loadServerData();
    }
  }

  Future<void> _loadServerData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final profileData = await widget.newsApiService.fetchProfile();
      final profile = profileData['profile'];
      final prefs = profile is Map<String, dynamic>
          ? profile['preferences'] as Map<String, dynamic>?
          : null;

      var nextLanguage = _pendingLanguage;
      var nextCategories = _pendingCategories;
      if (prefs != null) {
        final profileLang = prefs['language'] as String?;
        if (profileLang != null && profileLang.isNotEmpty) {
          nextLanguage = profileLang;
        }
        final profileCategories = (prefs['categories'] as List?)
            ?.whereType<String>()
            .map((c) => c.trim())
            .where((c) => c.isNotEmpty)
            .toSet();
        if (profileCategories != null) {
          nextCategories = profileCategories;
        }
      }

      Map<String, dynamic> nextNotifications = _pendingNotifications;
      var hasNotificationPrefs = false;
      try {
        final fetched = await widget.newsApiService
            .fetchNotificationPreferences();
        nextNotifications = widget.normalizeNotificationPreferences(fetched);
        hasNotificationPrefs = true;
      } catch (_) {
        nextNotifications = widget.normalizeNotificationPreferences(null);
      }

      List<Map<String, dynamic>> devices = const [];
      try {
        devices = await widget.newsApiService.fetchNotificationDevices();
      } catch (_) {}

      if (!mounted) return;
      setState(() {
        _pendingLanguage = nextLanguage;
        _pendingCategories = nextCategories;
        _pendingNotifications = nextNotifications;
        _hasServerNotificationPrefs = hasNotificationPrefs;
        _devices = devices;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error';
        _isLoading = false;
      });
    }
  }

  Future<void> _saveSettings() async {
    final themeModeCode = switch (_pendingThemeMode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    };

    if (!_isLoggedIn) {
      Navigator.of(context).pop({
        'language': _pendingLanguage,
        'categories': _pendingCategories.toList(growable: false),
        'themeMode': themeModeCode,
      });
      return;
    }

    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      await widget.newsApiService.updateProfile(
        language: _pendingLanguage,
        categories: _pendingCategories.toList(growable: false),
      );

      await widget.newsApiService.updateNotificationPreferences(
        notifications: widget.normalizeNotificationPreferences(
          _pendingNotifications,
        ),
      );

      if (!mounted) return;
      Navigator.of(context).pop({
        'language': _pendingLanguage,
        'categories': _pendingCategories.toList(growable: false),
        'themeMode': themeModeCode,
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error';
        _isSaving = false;
      });
    }
  }

  Future<void> _deleteDevice(String id) async {
    try {
      await widget.newsApiService.deleteNotificationDevice(id);
      if (!mounted) return;
      setState(() {
        _devices = _devices
            .where((d) => '${d['id']}' != id)
            .toList(growable: false);
      });
      final localizations = AppLocalizations.of(context);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(localizations.deviceRemoved)));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  Future<void> _logout() async {
    await widget.authService.logout();
    if (!mounted) return;
    Navigator.of(context).pop({'signedOut': true});
  }

  Widget _languageTile(String code, String label) {
    return ListTile(
      title: Text(label, style: const TextStyle(color: Colors.white)),
      trailing: _pendingLanguage == code
          ? const Icon(Icons.check, color: Colors.indigoAccent)
          : null,
      onTap: () {
        setState(() {
          _pendingLanguage = code;
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(localizations.settings),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _saveSettings,
            child: _isSaving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(localizations.save),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.only(bottom: 20),
              children: [
                if (_error != null)
                  Container(
                    margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: Colors.redAccent.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                Padding(
                  padding: EdgeInsets.fromLTRB(16, 12, 16, 6),
                  child: Text(
                    localizations.account,
                    style: TextStyle(
                      color: Colors.white70,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
                if (_isLoggedIn) ...[
                  ListTile(
                    leading: const Icon(
                      Icons.account_circle,
                      color: Colors.white70,
                    ),
                    title: Text(
                      widget.authService.userEmail ??
                          localizations.signedInState,
                      style: const TextStyle(color: Colors.white),
                    ),
                    subtitle: Text(
                      localizations.profileSyncHint,
                      style: TextStyle(color: Colors.white54),
                    ),
                  ),
                  ListTile(
                    leading: const Icon(Icons.logout, color: Colors.white70),
                    title: Text(
                      localizations.signOut,
                      style: TextStyle(color: Colors.white),
                    ),
                    onTap: _logout,
                  ),
                ] else ...[
                  ListTile(
                    leading: const Icon(Icons.login, color: Colors.white70),
                    title: Text(
                      localizations.signIn,
                      style: TextStyle(color: Colors.white),
                    ),
                    subtitle: Text(
                      localizations.signInManage,
                      style: TextStyle(color: Colors.white54),
                    ),
                    onTap: () =>
                        Navigator.of(context).pop({'signInRequested': true}),
                  ),
                ],
                const Divider(color: Colors.white24),
                Padding(
                  padding: EdgeInsets.fromLTRB(16, 4, 16, 4),
                  child: Text(
                    localizations.language,
                    style: TextStyle(
                      color: Colors.white70,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
                ..._languageCodes.map(
                  (code) =>
                      _languageTile(code, localizations.languageLabel(code)),
                ),
                const Divider(color: Colors.white24),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
                  child: Text(
                    localizations.theme,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ChoiceChip(
                        label: Text(localizations.themeSystem),
                        selected: _pendingThemeMode == ThemeMode.system,
                        onSelected: (_) {
                          setState(() {
                            _pendingThemeMode = ThemeMode.system;
                          });
                        },
                      ),
                      ChoiceChip(
                        label: Text(localizations.themeLight),
                        selected: _pendingThemeMode == ThemeMode.light,
                        onSelected: (_) {
                          setState(() {
                            _pendingThemeMode = ThemeMode.light;
                          });
                        },
                      ),
                      ChoiceChip(
                        label: Text(localizations.themeDark),
                        selected: _pendingThemeMode == ThemeMode.dark,
                        onSelected: (_) {
                          setState(() {
                            _pendingThemeMode = ThemeMode.dark;
                          });
                        },
                      ),
                    ],
                  ),
                ),
                const Divider(color: Colors.white24),
                Padding(
                  padding: EdgeInsets.fromLTRB(16, 4, 16, 4),
                  child: Text(
                    localizations.categoryPreferences,
                    style: TextStyle(
                      color: Colors.white70,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: widget.categoryOptions
                        .map((category) {
                          final selected = _pendingCategories.contains(
                            category,
                          );
                          return FilterChip(
                            label: Text(localizations.categoryLabel(category)),
                            selected: selected,
                            onSelected: (value) {
                              setState(() {
                                if (value) {
                                  _pendingCategories.add(category);
                                } else {
                                  _pendingCategories.remove(category);
                                }
                              });
                            },
                          );
                        })
                        .toList(growable: false),
                  ),
                ),
                if (_isLoggedIn) ...[
                  const Divider(color: Colors.white24),
                  Padding(
                    padding: EdgeInsets.fromLTRB(16, 4, 16, 4),
                    child: Text(
                      localizations.notifications,
                      style: TextStyle(
                        color: Colors.white70,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  if (!_hasServerNotificationPrefs)
                    Padding(
                      padding: EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 4,
                      ),
                      child: Text(
                        localizations.notificationDefaultsHint,
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                    ),
                  SwitchListTile.adaptive(
                    title: Text(
                      localizations.enableNotifications,
                      style: TextStyle(color: Colors.white),
                    ),
                    value: _pendingNotifications['enabled'] as bool,
                    onChanged: (value) {
                      setState(() {
                        _pendingNotifications['enabled'] = value;
                      });
                    },
                  ),
                  SwitchListTile.adaptive(
                    title: Text(
                      localizations.breakingNewsAlerts,
                      style: TextStyle(color: Colors.white),
                    ),
                    value: _pendingNotifications['breakingNews'] as bool,
                    onChanged: (value) {
                      setState(() {
                        _pendingNotifications['breakingNews'] = value;
                      });
                    },
                  ),
                  SwitchListTile.adaptive(
                    title: Text(
                      localizations.bookmarkAlerts,
                      style: TextStyle(color: Colors.white),
                    ),
                    value: _pendingNotifications['bookmarkAlerts'] as bool,
                    onChanged: (value) {
                      setState(() {
                        _pendingNotifications['bookmarkAlerts'] = value;
                      });
                    },
                  ),
                  SwitchListTile.adaptive(
                    title: Text(
                      localizations.dailyDigest,
                      style: TextStyle(color: Colors.white),
                    ),
                    value: _pendingNotifications['dailyDigest'] as bool,
                    onChanged: (value) {
                      setState(() {
                        _pendingNotifications['dailyDigest'] = value;
                      });
                    },
                  ),
                  const Divider(color: Colors.white24),
                  Padding(
                    padding: EdgeInsets.fromLTRB(16, 4, 16, 4),
                    child: Text(
                      localizations.registeredDevices,
                      style: TextStyle(
                        color: Colors.white70,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  if (_devices.isEmpty)
                    Padding(
                      padding: EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      child: Text(
                        localizations.noNotificationDevices,
                        style: TextStyle(color: Colors.white70),
                      ),
                    )
                  else
                    ..._devices.map((device) {
                      final id = '${device['id'] ?? ''}';
                      final platform =
                          '${device['platform'] ?? localizations.unknownPlatform}';
                      final name =
                          '${device['deviceName'] ?? localizations.deviceFallbackName}';
                      return ListTile(
                        leading: const Icon(
                          Icons.phone_android,
                          color: Colors.white70,
                        ),
                        title: Text(
                          name,
                          style: const TextStyle(color: Colors.white),
                        ),
                        subtitle: Text(
                          platform.toUpperCase(),
                          style: const TextStyle(color: Colors.white54),
                        ),
                        trailing: IconButton(
                          onPressed: id.isEmpty
                              ? null
                              : () => _deleteDevice(id),
                          icon: const Icon(
                            Icons.delete_outline,
                            color: Colors.white70,
                          ),
                        ),
                      );
                    }),
                ],
              ],
            ),
    );
  }
}
