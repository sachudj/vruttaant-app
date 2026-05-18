import 'package:mobile_app/models/news_item.dart';
import 'package:mobile_app/services/news_api_service.dart';

typedef NewsLoader = Future<List<NewsItem>> Function(int page);
typedef StoryTranslator =
    Future<StoryTranslationResult> Function(
      NewsItem news,
      String targetLanguage,
    );
