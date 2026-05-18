import 'package:flutter/material.dart';
import 'package:mobile_app/l10n/app_localizations.dart';

class FeedCategoryChips extends StatelessWidget {
  const FeedCategoryChips({
    super.key,
    required this.categories,
    required this.selectedCategory,
    required this.localizations,
    required this.onCategorySelected,
  });

  final List<String?> categories;
  final String? selectedCategory;
  final AppLocalizations localizations;
  final ValueChanged<String?> onCategorySelected;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SizedBox(
        height: 56,
        child: ListView.separated(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          scrollDirection: Axis.horizontal,
          itemBuilder: (context, index) {
            final category = categories[index];
            final selected = category == selectedCategory;
            return ChoiceChip(
              label: Text(
                category == null
                    ? localizations.all
                    : localizations.categoryLabel(category),
              ),
              selected: selected,
              onSelected: (_) => onCategorySelected(category),
              selectedColor: Colors.white,
              labelStyle: TextStyle(
                color: selected ? Colors.black : Colors.white,
                fontWeight: FontWeight.w600,
              ),
              backgroundColor: Colors.black.withValues(alpha: 0.6),
              side: const BorderSide(color: Colors.white38),
            );
          },
          separatorBuilder: (context, index) => const SizedBox(width: 8),
          itemCount: categories.length,
        ),
      ),
    );
  }
}

class FeedCacheBadge extends StatelessWidget {
  const FeedCacheBadge({
    super.key,
    required this.localizations,
    required this.cachedAt,
    required this.formatCachedTime,
  });

  final AppLocalizations localizations;
  final DateTime? cachedAt;
  final String Function(DateTime savedAt) formatCachedTime;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Align(
        alignment: Alignment.topLeft,
        child: Padding(
          padding: const EdgeInsets.only(left: 12, top: 64),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.amber.withValues(alpha: 0.22),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: Colors.amber.withValues(alpha: 0.55)),
            ),
            child: Text(
              cachedAt == null
                  ? localizations.cachedFeed
                  : localizations.cachedFeedWithTime(
                      formatCachedTime(cachedAt!),
                    ),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class FeedActionButtons extends StatelessWidget {
  const FeedActionButtons({
    super.key,
    required this.localizations,
    required this.isBookmarkSheetLoading,
    required this.onSearchPressed,
    required this.onSettingsPressed,
    required this.onBookmarksPressed,
  });

  final AppLocalizations localizations;
  final bool isBookmarkSheetLoading;
  final VoidCallback onSearchPressed;
  final VoidCallback onSettingsPressed;
  final VoidCallback onBookmarksPressed;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Align(
        alignment: Alignment.topRight,
        child: Padding(
          padding: const EdgeInsets.only(right: 8, top: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton.filledTonal(
                onPressed: onSearchPressed,
                icon: const Icon(Icons.manage_search),
                tooltip: localizations.searchSort,
              ),
              const SizedBox(width: 8),
              IconButton.filledTonal(
                onPressed: onSettingsPressed,
                icon: const Icon(Icons.settings_outlined),
                tooltip: localizations.settings,
              ),
              const SizedBox(width: 8),
              IconButton.filledTonal(
                onPressed: isBookmarkSheetLoading ? null : onBookmarksPressed,
                icon: isBookmarkSheetLoading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.bookmarks_outlined),
                tooltip: localizations.bookmarks,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
