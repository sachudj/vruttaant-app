import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_app/main.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile_app/models/news_item.dart';
import 'package:mobile_app/services/feed_cache_service.dart';
import 'package:mobile_app/widgets/news_card.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({'onboarding_completed': true});
  });

  testWidgets('renders initial feed story', (WidgetTester tester) async {
    await tester.pumpWidget(
      MyApp(
        newsLoader: (page) async {
          if (page == 0) {
            return const [
              NewsItem(
                title: 'Story One',
                summary: 'Summary one',
                imageUrl: 'https://example.com/one.jpg',
                source: 'Source One',
                category: 'General',
              ),
              NewsItem(
                title: 'Story Two',
                summary: 'Summary two',
                imageUrl: 'https://example.com/two.jpg',
                source: 'Source Two',
                category: 'General',
              ),
            ];
          }

          return const [
            NewsItem(
              title: 'Story Three',
              summary: 'Summary three',
              imageUrl: 'https://example.com/three.jpg',
              source: 'Source Three',
              category: 'General',
            ),
          ];
        },
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Story One'), findsOneWidget);
  });

  testWidgets('opens language preference settings and selects Hindi', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MyApp(
        newsLoader: (page) async {
          return const [
            NewsItem(
              title: 'Story Localized',
              summary: 'Summary local',
              imageUrl: 'https://example.com/loc.jpg',
              source: 'Source Loc',
              category: 'General',
            ),
          ];
        },
      ),
    );

    await tester.pumpAndSettle();
    expect(find.text('Story Localized'), findsOneWidget);

    // Find and tap Language Preferences button
    final langButton = find.byIcon(Icons.settings_outlined);
    expect(langButton, findsOneWidget);
    await tester.tap(langButton);
    await tester.pumpAndSettle();

    // Verify sheet opened
    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Hindi'), findsOneWidget);

    // Tap Hindi and save
    await tester.tap(find.text('Hindi'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();

    // Verify sheet closed
    expect(find.text('Settings'), findsNothing);

    // Re-open settings and verify localized Hindi labels are applied.
    await tester.tap(langButton);
    await tester.pumpAndSettle();

    expect(find.text('सेटिंग्स'), findsOneWidget);
    expect(find.text('सेव करें'), findsOneWidget);
    expect(find.text('भाषा'), findsOneWidget);

    // Save and verify top-level Hindi localized actions.
    await tester.tap(find.text('सेव करें'));
    await tester.pumpAndSettle();

    final searchButton = find.byIcon(Icons.manage_search);
    expect(searchButton, findsOneWidget);
    await tester.tap(searchButton);
    await tester.pumpAndSettle();

    expect(find.text('खोज और क्रम'), findsOneWidget);
    expect(find.text('लागू करें'), findsOneWidget);
  });

  testWidgets('opens search sheet and applies query', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MyApp(
        newsLoader: (page) async {
          return const [
            NewsItem(
              title: 'Market Story',
              summary: 'Summary market',
              imageUrl: 'https://example.com/market.jpg',
              source: 'Source Market',
              category: 'Business',
            ),
          ];
        },
      ),
    );

    await tester.pumpAndSettle();

    final searchButton = find.byIcon(Icons.manage_search);
    expect(searchButton, findsOneWidget);
    await tester.tap(searchButton);
    await tester.pumpAndSettle();

    expect(find.text('Search & Sort'), findsOneWidget);
    expect(find.byKey(const ValueKey('search-query-input')), findsOneWidget);

    await tester.enterText(
      find.byKey(const ValueKey('search-query-input')),
      'market',
    );
    await tester.tap(find.text('Relevance'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Apply'));
    await tester.pumpAndSettle();

    expect(find.text('Search & Sort'), findsNothing);
    expect(find.text('Market Story'), findsOneWidget);
  });

  testWidgets('shows translation controls and badges on story card', (
    WidgetTester tester,
  ) async {
    var tappedTranslate = false;

    await tester.pumpWidget(
      MaterialApp(
        home: NewsCard(
          title: 'Original Story Title',
          summary: 'Original story summary.',
          imageUrl: 'https://example.com/one.jpg',
          source: 'Source One',
          readingTime: 3,
          isTranslated: false,
          isTranslating: false,
          onTranslatePressed: () {
            tappedTranslate = true;
          },
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Original'), findsOneWidget);
    expect(find.byTooltip('Translate'), findsOneWidget);

    await tester.tap(find.byTooltip('Translate'));
    await tester.pumpAndSettle();

    expect(tappedTranslate, isTrue);

    await tester.pumpWidget(
      const MaterialApp(
        home: NewsCard(
          title: 'अनुवादित शीर्षक',
          summary: 'अनुवादित सारांश',
          imageUrl: 'https://example.com/one.jpg',
          source: 'Source One',
          readingTime: 3,
          isTranslated: true,
          isTranslating: false,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Translated'), findsOneWidget);
    expect(find.text('अनुवादित शीर्षक'), findsOneWidget);
    expect(find.byTooltip('Show original'), findsOneWidget);
  });

  testWidgets('reader page shows translation status and story metadata', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MyApp(
        newsLoader: (page) async {
          return const [
            NewsItem(
              title: 'Original Story Title',
              summary: 'Original story summary.',
              imageUrl: 'https://example.com/one.jpg',
              source: 'Source One',
              category: 'General',
              language: 'en',
            ),
          ];
        },
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Read More'), findsNothing);

    await tester.drag(find.text('Original Story Title'), const Offset(-500, 0));
    await tester.pumpAndSettle();

    expect(find.text('Read More'), findsOneWidget);
    expect(find.text('Original'), findsOneWidget);
    expect(find.text('Original Story Title'), findsOneWidget);
    expect(find.text('Original story summary.'), findsOneWidget);
  });

  testWidgets('loads cached feed when network fetch fails', (
    WidgetTester tester,
  ) async {
    final cacheService = FeedCacheService();
    final cacheKey = cacheService.buildCacheKey(language: 'en', sort: 'latest');
    final cachedStory = const NewsItem(
      title: 'Cached Offline Story',
      summary: 'Offline summary',
      imageUrl: 'https://example.com/cache.jpg',
      source: 'Offline Source',
      category: 'General',
      language: 'en',
    );

    SharedPreferences.setMockInitialValues({
      'onboarding_completed': true,
      cacheService.storageKeyFor(cacheKey): jsonEncode({
        'savedAt': DateTime.now().toUtc().toIso8601String(),
        'items': [cachedStory.toJson()],
      }),
    });

    await tester.pumpWidget(
      MyApp(
        newsLoader: (page) async {
          throw Exception('Network unavailable');
        },
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Cached Offline Story'), findsOneWidget);
    expect(find.textContaining('Cached feed'), findsOneWidget);
  });
}
