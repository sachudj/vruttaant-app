import 'package:flutter/material.dart';
import 'package:mobile_app/l10n/app_localizations.dart';

class NewsCard extends StatelessWidget {
  const NewsCard({
    super.key,
    required this.title,
    required this.summary,
    required this.imageUrl,
    this.source,
    this.readingTime,
    this.isBookmarked = false,
    this.onBookmarkPressed,
    this.onSharePressed,
    this.isTranslated = false,
    this.isTranslating = false,
    this.onTranslatePressed,
    this.translationErrorLabel,
    this.translateTooltip,
    this.showOriginalTooltip,
    this.addBookmarkTooltip,
    this.removeBookmarkTooltip,
    this.shareTooltip,
    this.statusOriginalLabel,
    this.statusTranslatedLabel,
    this.statusTranslatingLabel,
  });

  final String title;
  final String summary;
  final String imageUrl;
  final String? source;
  final int? readingTime; // K.2: Reading time in minutes
  final bool isBookmarked;
  final VoidCallback? onBookmarkPressed;
  final VoidCallback? onSharePressed;
  final bool isTranslated;
  final bool isTranslating;
  final VoidCallback? onTranslatePressed;
  final String? translationErrorLabel;
  final String? translateTooltip;
  final String? showOriginalTooltip;
  final String? addBookmarkTooltip;
  final String? removeBookmarkTooltip;
  final String? shareTooltip;
  final String? statusOriginalLabel;
  final String? statusTranslatedLabel;
  final String? statusTranslatingLabel;

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context);

    return SizedBox.expand(
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.network(
            imageUrl,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return const ColoredBox(
                color: Color(0xFF1A1A1A),
                child: Center(
                  child: Icon(
                    Icons.broken_image_outlined,
                    color: Colors.white54,
                    size: 40,
                  ),
                ),
              );
            },
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.08),
                  Colors.black.withValues(alpha: 0.18),
                  Colors.black.withValues(alpha: 0.82),
                ],
                stops: const [0.2, 0.45, 1.0],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (source != null && source!.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.35),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.24),
                            ),
                          ),
                          child: Text(
                            source!,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ),
                      const Spacer(),
                      IconButton.filledTonal(
                        onPressed: isTranslating ? null : onTranslatePressed,
                        icon: isTranslating
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : Icon(
                                isTranslated
                                    ? Icons.translate_outlined
                                    : Icons.g_translate,
                                color: Colors.white,
                              ),
                        tooltip: isTranslated
                            ? (showOriginalTooltip ??
                                  localizations.showOriginal)
                            : (translateTooltip ?? localizations.translate),
                      ),
                      IconButton.filledTonal(
                        onPressed: onSharePressed,
                        icon: const Icon(
                          Icons.share_outlined,
                          color: Colors.white,
                        ),
                        tooltip: shareTooltip ?? localizations.share,
                      ),
                      IconButton.filledTonal(
                        onPressed: onBookmarkPressed,
                        icon: Icon(
                          isBookmarked ? Icons.bookmark : Icons.bookmark_border,
                          color: isBookmarked ? Colors.amber : Colors.white,
                        ),
                        tooltip: isBookmarked
                            ? (removeBookmarkTooltip ??
                                  localizations.removeBookmark)
                            : (addBookmarkTooltip ?? localizations.addBookmark),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: isTranslated
                              ? Colors.teal.withValues(alpha: 0.28)
                              : Colors.white.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          isTranslating
                              ? (statusTranslatingLabel ??
                                    localizations.translating)
                              : isTranslated
                              ? (statusTranslatedLabel ??
                                    localizations.translated)
                              : (statusOriginalLabel ?? localizations.original),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      if (readingTime != null && readingTime! > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.16),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.schedule,
                                color: Colors.white,
                                size: 14,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                localizations.readTimeMinutes(readingTime!),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      if ((translationErrorLabel ?? '').trim().isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.redAccent.withValues(alpha: 0.24),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            translationErrorLabel!,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const Spacer(),
                  Text(
                    title,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      height: 1.12,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: MediaQuery.sizeOf(context).height * 0.48,
                    ),
                    child: Text(
                      summary,
                      maxLines: 12,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFFE8E8E8),
                        fontSize: 16,
                        fontWeight: FontWeight.w400,
                        height: 1.45,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
