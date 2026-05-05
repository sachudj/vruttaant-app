// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_app/main.dart';
import 'package:mobile_app/models/news_item.dart';

void main() {
  testWidgets('renders feed, swipes, and paginates near the end', (
    WidgetTester tester,
  ) async {
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

    await tester.drag(
      find.byKey(const ValueKey('vertical-feed-pageview')),
      const Offset(0, -220),
    );
    await tester.pumpAndSettle();

    await tester.drag(
      find.byKey(const ValueKey('vertical-feed-pageview')),
      const Offset(0, -400),
    );
    await tester.pumpAndSettle();

    expect(find.text('Story Three'), findsOneWidget);
  });
}
