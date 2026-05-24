import 'package:flutter/material.dart';

class AppLocalizations {
  AppLocalizations(this.locale);

  final Locale locale;

  static const supportedLocales = [Locale('en'), Locale('hi')];

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static AppLocalizations of(BuildContext context) {
    final localizations = Localizations.of<AppLocalizations>(
      context,
      AppLocalizations,
    );
    return localizations ?? AppLocalizations(const Locale('en'));
  }

  static const Map<String, Map<String, String>> _localizedValues = {
    'en': {
      'app_title': 'Vruttaant',
      'settings': 'Settings',
      'save': 'Save',
      'theme': 'Theme',
      'theme_system': 'System',
      'theme_light': 'Light',
      'theme_dark': 'Dark',
      'search_sort': 'Search & Sort',
      'search_hint': 'Search by title, summary, source...',
      'sort_latest': 'Latest',
      'sort_relevance': 'Relevance',
      'clear': 'Clear',
      'apply': 'Apply',
      'sign_in': 'Sign In',
      'sign_in_with_google': 'Continue with Google',
      'sign_in_with_apple': 'Continue with Apple',
      'email': 'Email',
      'password': 'Password',
      'sign_in_to_bookmark': 'Sign in to bookmark stories.',
      'bookmark_missing_url': 'This story cannot be bookmarked (missing URL).',
      'bookmark_removed': 'Bookmark removed.',
      'bookmarked': 'Bookmarked.',
      'already_bookmarked': 'Already bookmarked.',
      'signed_out': 'Signed out.',
      'bookmarks': 'Bookmarks',
      'no_bookmarks': 'No bookmarks yet.',
      'feed_load_failed': 'Could not load news feed',
      'retry': 'Retry',
      'no_stories_now': 'No stories available right now.',
      'no_stories_filters':
          'No stories available for the selected filters yet.',
      'all': 'All',
      'cached_feed': 'Cached feed',
      'cached_feed_with_time': 'Cached feed ({time})',
      'account': 'Account',
      'signed_in_state': 'Signed in',
      'profile_sync_hint': 'Profile and notification preferences are synced.',
      'sign_out': 'Sign Out',
      'sign_in_manage': 'Sign in to manage profile and notifications.',
      'language': 'Language',
      'category_preferences': 'Category Preferences',
      'notifications': 'Notifications',
      'notification_defaults_hint':
          'Using defaults because server preferences could not be loaded.',
      'enable_notifications': 'Enable Notifications',
      'breaking_news_alerts': 'Breaking News Alerts',
      'bookmark_alerts': 'Bookmark Alerts',
      'daily_digest': 'Daily Digest',
      'registered_devices': 'Registered Devices',
      'no_notification_devices': 'No notification devices registered yet.',
      'device_removed': 'Device removed.',
      'activity_overview': 'Activity Overview',
      'recent_reading': 'Recent Reading',
      'no_recent_activity': 'No recent reading activity yet.',
      'total_views': 'Views',
      'total_bookmarks': 'Bookmarks',
      'total_translations': 'Translations',
      'total_shares': 'Shares',
      'last_active': 'Last active: {value}',
      'last_active_unknown': 'Last active: unavailable',
      'story_fallback_title': 'Story',
      'read_time_minutes': '{minutes} min read',
      'generic_action_failed': 'Action failed. Please try again.',
      'settings_load_failed': 'Could not load profile settings right now.',
      'settings_save_failed': 'Could not save settings right now.',
      'read_more': 'Read More',
      'reader_hint':
          'Swipe left from the news card to open the full article in supported mobile platforms.',
      'no_original_url': 'No original article URL available.',
      'translating': 'Translating...',
      'translated': 'Translated',
      'original': 'Original',
      'show_original': 'Show original',
      'translate': 'Translate',
      'share': 'Share',
      'translation_unavailable': 'Translation unavailable',
      'translation_unavailable_snack':
          'Translation unavailable for this story. Showing original.',
      'translation_failed': 'Translation failed',
      'translation_failed_snack': 'Could not translate this story right now.',
      'add_bookmark': 'Add bookmark',
      'remove_bookmark': 'Remove bookmark',
      'tech': 'Tech',
      'politics': 'Politics',
      'sports': 'Sports',
      'business': 'Business',
      'world': 'World',
      'health': 'Health',
      'entertainment': 'Entertainment',
      'science': 'Science',
      'education': 'Education',
      'general': 'General',
      'lang_en': 'English',
      'lang_hi': 'Hindi',
      'lang_bn': 'Bengali',
      'lang_mr': 'Marathi',
      'lang_te': 'Telugu',
      'lang_ta': 'Tamil',
      'lang_gu': 'Gujarati',
      'lang_ur': 'Urdu',
      'lang_kn': 'Kannada',
      'lang_or': 'Odia',
      'lang_ml': 'Malayalam',
      'unknown_platform': 'unknown',
      'device_fallback_name': 'Device',
      'onboarding_welcome_title': 'Welcome to Vruttaant',
      'onboarding_welcome_body':
          'Get short, swipeable news cards in your language. We will personalize your feed in one quick step.',
      'onboarding_continue': 'Continue',
      'onboarding_category_title': 'Choose your primary interest',
      'onboarding_category_body':
          'Pick at least 3 content types to start with. You can change these anytime in settings.',
      'onboarding_start_reading': 'Start Reading',
      'onboarding_category_selection_hint':
          'Select at least 3 categories ({count} selected)',
      'onboarding_reset': 'Show onboarding again',
    },
    'hi': {
      'app_title': 'वृत्तांत',
      'settings': 'सेटिंग्स',
      'save': 'सेव करें',
      'theme': 'थीम',
      'theme_system': 'सिस्टम',
      'theme_light': 'लाइट',
      'theme_dark': 'डार्क',
      'search_sort': 'खोज और क्रम',
      'search_hint': 'शीर्षक, सारांश, स्रोत से खोजें...',
      'sort_latest': 'नवीनतम',
      'sort_relevance': 'प्रासंगिक',
      'clear': 'साफ करें',
      'apply': 'लागू करें',
      'sign_in': 'साइन इन',
      'sign_in_with_google': 'Google से जारी रखें',
      'sign_in_with_apple': 'Apple से जारी रखें',
      'email': 'ईमेल',
      'password': 'पासवर्ड',
      'sign_in_to_bookmark': 'स्टोरी बुकमार्क करने के लिए साइन इन करें।',
      'bookmark_missing_url':
          'यह स्टोरी बुकमार्क नहीं की जा सकती (URL नहीं मिला)।',
      'bookmark_removed': 'बुकमार्क हटा दिया गया।',
      'bookmarked': 'बुकमार्क किया गया।',
      'already_bookmarked': 'पहले से बुकमार्क है।',
      'signed_out': 'साइन आउट हो गया।',
      'bookmarks': 'बुकमार्क',
      'no_bookmarks': 'अभी कोई बुकमार्क नहीं है।',
      'feed_load_failed': 'न्यूज़ फ़ीड लोड नहीं हो सकी',
      'retry': 'फिर से प्रयास करें',
      'no_stories_now': 'अभी कोई स्टोरी उपलब्ध नहीं है।',
      'no_stories_filters': 'चुने गए फ़िल्टर के लिए कोई स्टोरी उपलब्ध नहीं है।',
      'all': 'सभी',
      'cached_feed': 'कैश किया गया फ़ीड',
      'cached_feed_with_time': 'कैश किया गया फ़ीड ({time})',
      'account': 'खाता',
      'signed_in_state': 'साइन इन है',
      'profile_sync_hint': 'प्रोफाइल और नोटिफिकेशन प्राथमिकताएँ सिंक हैं।',
      'sign_out': 'साइन आउट',
      'sign_in_manage':
          'प्रोफाइल और नोटिफिकेशन प्रबंधित करने के लिए साइन इन करें।',
      'language': 'भाषा',
      'category_preferences': 'श्रेणी प्राथमिकताएँ',
      'notifications': 'नोटिफिकेशन',
      'notification_defaults_hint':
          'सर्वर प्राथमिकताएँ लोड न होने के कारण डिफॉल्ट का उपयोग हो रहा है।',
      'enable_notifications': 'नोटिफिकेशन सक्षम करें',
      'breaking_news_alerts': 'ब्रेकिंग न्यूज़ अलर्ट',
      'bookmark_alerts': 'बुकमार्क अलर्ट',
      'daily_digest': 'डेली डाइजेस्ट',
      'registered_devices': 'रजिस्टर्ड डिवाइस',
      'no_notification_devices': 'अभी कोई नोटिफिकेशन डिवाइस रजिस्टर्ड नहीं है।',
      'device_removed': 'डिवाइस हटा दिया गया।',
      'activity_overview': 'गतिविधि सारांश',
      'recent_reading': 'हाल की पढ़ाई',
      'no_recent_activity': 'अभी हाल की पढ़ाई गतिविधि नहीं है।',
      'total_views': 'व्यूज़',
      'total_bookmarks': 'बुकमार्क',
      'total_translations': 'अनुवाद',
      'total_shares': 'शेयर',
      'last_active': 'आखिरी सक्रिय: {value}',
      'last_active_unknown': 'आखिरी सक्रिय: उपलब्ध नहीं',
      'story_fallback_title': 'स्टोरी',
      'read_time_minutes': '{minutes} मिनट पढ़ें',
      'generic_action_failed': 'कार्रवाई विफल हुई। कृपया फिर से कोशिश करें।',
      'settings_load_failed': 'अभी प्रोफाइल सेटिंग्स लोड नहीं हो सकीं।',
      'settings_save_failed': 'अभी सेटिंग्स सेव नहीं हो सकीं।',
      'read_more': 'और पढ़ें',
      'reader_hint':
          'समर्थित मोबाइल प्लेटफॉर्म पर पूरा लेख खोलने के लिए न्यूज़ कार्ड से बाएं स्वाइप करें।',
      'no_original_url': 'मूल लेख का URL उपलब्ध नहीं है।',
      'translating': 'अनुवाद हो रहा है...',
      'translated': 'अनूदित',
      'original': 'मूल',
      'show_original': 'मूल दिखाएँ',
      'translate': 'अनुवाद करें',
      'share': 'साझा करें',
      'translation_unavailable': 'अनुवाद उपलब्ध नहीं है',
      'translation_unavailable_snack':
          'इस स्टोरी का अनुवाद उपलब्ध नहीं है। मूल दिखाया जा रहा है।',
      'translation_failed': 'अनुवाद विफल',
      'translation_failed_snack': 'अभी इस स्टोरी का अनुवाद नहीं हो सका।',
      'add_bookmark': 'बुकमार्क जोड़ें',
      'remove_bookmark': 'बुकमार्क हटाएँ',
      'tech': 'टेक',
      'politics': 'राजनीति',
      'sports': 'खेल',
      'business': 'बिजनेस',
      'world': 'विश्व',
      'health': 'स्वास्थ्य',
      'entertainment': 'मनोरंजन',
      'science': 'विज्ञान',
      'education': 'शिक्षा',
      'general': 'सामान्य',
      'lang_en': 'अंग्रेज़ी',
      'lang_hi': 'हिंदी',
      'lang_bn': 'बंगाली',
      'lang_mr': 'मराठी',
      'lang_te': 'तेलुगु',
      'lang_ta': 'तमिल',
      'lang_gu': 'गुजराती',
      'lang_ur': 'उर्दू',
      'lang_kn': 'कन्नड़',
      'lang_or': 'ओड़िया',
      'lang_ml': 'मलयालम',
      'unknown_platform': 'अज्ञात',
      'device_fallback_name': 'डिवाइस',
      'onboarding_welcome_title': 'वृत्तांत में आपका स्वागत है',
      'onboarding_welcome_body':
          'अपनी भाषा में छोटे, स्वाइप करने योग्य न्यूज़ कार्ड पढ़ें। एक छोटे चरण में हम आपका फ़ीड वैयक्तिकृत करेंगे।',
      'onboarding_continue': 'आगे बढ़ें',
      'onboarding_category_title': 'अपनी मुख्य रुचि चुनें',
      'onboarding_category_body':
          'शुरुआत के लिए कम से कम 3 कंटेंट प्रकार चुनें। आप इन्हें सेटिंग्स में कभी भी बदल सकते हैं।',
      'onboarding_start_reading': 'पढ़ना शुरू करें',
      'onboarding_category_selection_hint':
          'कम से कम 3 श्रेणियां चुनें ({count} चुनी गई)',
      'onboarding_reset': 'ऑनबोर्डिंग फिर से दिखाएं',
    },
  };

  String _t(String key) {
    final lang = locale.languageCode.toLowerCase();
    final map = _localizedValues[lang] ?? _localizedValues['en']!;
    return map[key] ?? _localizedValues['en']![key] ?? key;
  }

  String get appTitle => _t('app_title');
  String get settings => _t('settings');
  String get save => _t('save');
  String get theme => _t('theme');
  String get themeSystem => _t('theme_system');
  String get themeLight => _t('theme_light');
  String get themeDark => _t('theme_dark');
  String get searchSort => _t('search_sort');
  String get searchHint => _t('search_hint');
  String get sortLatest => _t('sort_latest');
  String get sortRelevance => _t('sort_relevance');
  String get clear => _t('clear');
  String get apply => _t('apply');
  String get signIn => _t('sign_in');
  String get signInWithGoogle => _t('sign_in_with_google');
  String get signInWithApple => _t('sign_in_with_apple');
  String get email => _t('email');
  String get password => _t('password');
  String get signInToBookmark => _t('sign_in_to_bookmark');
  String get bookmarkMissingUrl => _t('bookmark_missing_url');
  String get bookmarkRemoved => _t('bookmark_removed');
  String get bookmarked => _t('bookmarked');
  String get alreadyBookmarked => _t('already_bookmarked');
  String get signedOut => _t('signed_out');
  String get bookmarks => _t('bookmarks');
  String get noBookmarks => _t('no_bookmarks');
  String get feedLoadFailed => _t('feed_load_failed');
  String get retry => _t('retry');
  String get noStoriesNow => _t('no_stories_now');
  String get noStoriesForFilters => _t('no_stories_filters');
  String get all => _t('all');
  String get cachedFeed => _t('cached_feed');
  String cachedFeedWithTime(String time) =>
      _t('cached_feed_with_time').replaceAll('{time}', time);
  String get account => _t('account');
  String get signedInState => _t('signed_in_state');
  String get profileSyncHint => _t('profile_sync_hint');
  String get signOut => _t('sign_out');
  String get signInManage => _t('sign_in_manage');
  String get language => _t('language');
  String get categoryPreferences => _t('category_preferences');
  String get notifications => _t('notifications');
  String get notificationDefaultsHint => _t('notification_defaults_hint');
  String get enableNotifications => _t('enable_notifications');
  String get breakingNewsAlerts => _t('breaking_news_alerts');
  String get bookmarkAlerts => _t('bookmark_alerts');
  String get dailyDigest => _t('daily_digest');
  String get registeredDevices => _t('registered_devices');
  String get noNotificationDevices => _t('no_notification_devices');
  String get deviceRemoved => _t('device_removed');
  String get activityOverview => _t('activity_overview');
  String get recentReading => _t('recent_reading');
  String get noRecentActivity => _t('no_recent_activity');
  String get totalViews => _t('total_views');
  String get totalBookmarks => _t('total_bookmarks');
  String get totalTranslations => _t('total_translations');
  String get totalShares => _t('total_shares');
  String lastActive(String value) =>
      _t('last_active').replaceAll('{value}', value);
  String get lastActiveUnknown => _t('last_active_unknown');
  String get storyFallbackTitle => _t('story_fallback_title');
  String readTimeMinutes(int minutes) =>
      _t('read_time_minutes').replaceAll('{minutes}', '$minutes');
  String get genericActionFailed => _t('generic_action_failed');
  String get settingsLoadFailed => _t('settings_load_failed');
  String get settingsSaveFailed => _t('settings_save_failed');
  String get readMore => _t('read_more');
  String get readerHint => _t('reader_hint');
  String get noOriginalUrl => _t('no_original_url');
  String get translating => _t('translating');
  String get translated => _t('translated');
  String get original => _t('original');
  String get showOriginal => _t('show_original');
  String get translate => _t('translate');
  String get share => _t('share');
  String get translationUnavailable => _t('translation_unavailable');
  String get translationUnavailableSnack => _t('translation_unavailable_snack');
  String get translationFailed => _t('translation_failed');
  String get translationFailedSnack => _t('translation_failed_snack');
  String get addBookmark => _t('add_bookmark');
  String get removeBookmark => _t('remove_bookmark');
  String get unknownPlatform => _t('unknown_platform');
  String get deviceFallbackName => _t('device_fallback_name');
  String get onboardingWelcomeTitle => _t('onboarding_welcome_title');
  String get onboardingWelcomeBody => _t('onboarding_welcome_body');
  String get onboardingContinue => _t('onboarding_continue');
  String get onboardingCategoryTitle => _t('onboarding_category_title');
  String get onboardingCategoryBody => _t('onboarding_category_body');
  String get onboardingStartReading => _t('onboarding_start_reading');
  String onboardingCategorySelectionHint(int count) =>
      _t('onboarding_category_selection_hint').replaceAll('{count}', '$count');
  String get onboardingReset => _t('onboarding_reset');

  String categoryLabel(String category) {
    return switch (category.trim().toLowerCase()) {
      'tech' => _t('tech'),
      'politics' => _t('politics'),
      'sports' => _t('sports'),
      'business' => _t('business'),
      'world' => _t('world'),
      'health' => _t('health'),
      'entertainment' => _t('entertainment'),
      'science' => _t('science'),
      'education' => _t('education'),
      'general' => _t('general'),
      _ => category,
    };
  }

  String languageLabel(String code) {
    return switch (code.trim().toLowerCase()) {
      'en' => _t('lang_en'),
      'hi' => _t('lang_hi'),
      'bn' => _t('lang_bn'),
      'mr' => _t('lang_mr'),
      'te' => _t('lang_te'),
      'ta' => _t('lang_ta'),
      'gu' => _t('lang_gu'),
      'ur' => _t('lang_ur'),
      'kn' => _t('lang_kn'),
      'or' => _t('lang_or'),
      'ml' => _t('lang_ml'),
      _ => code,
    };
  }
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => AppLocalizations.supportedLocales.any(
    (element) => element.languageCode == locale.languageCode,
  );

  @override
  Future<AppLocalizations> load(Locale locale) async {
    return AppLocalizations(locale);
  }

  @override
  bool shouldReload(covariant LocalizationsDelegate<AppLocalizations> old) {
    return false;
  }
}
