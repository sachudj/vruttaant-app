import 'package:flutter/material.dart';
import 'package:mobile_app/l10n/app_localizations.dart';
import 'package:mobile_app/models/bookmark_item.dart';

Future<BookmarkItem?> showBookmarksSheet({
  required BuildContext context,
  required AppLocalizations localizations,
  required List<BookmarkItem> bookmarks,
  required Future<void> Function(BookmarkItem bookmark) onDeleteBookmark,
}) {
  final localBookmarks = List<BookmarkItem>.from(bookmarks);

  return showModalBottomSheet<BookmarkItem>(
    context: context,
    backgroundColor: const Color(0xFF121212),
    isScrollControlled: true,
    builder: (context) {
      return StatefulBuilder(
        builder: (context, setModalState) => SafeArea(
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.75,
            child: Column(
              children: [
                const SizedBox(height: 10),
                Text(
                  localizations.bookmarks,
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 18,
                  ),
                ),
                const SizedBox(height: 8),
                const Divider(color: Colors.white24, height: 1),
                Expanded(
                  child: localBookmarks.isEmpty
                      ? Center(
                          child: Text(
                            localizations.noBookmarks,
                            style: TextStyle(color: Colors.white70),
                          ),
                        )
                      : ListView.separated(
                          itemCount: localBookmarks.length,
                          separatorBuilder: (_, index) =>
                              const Divider(color: Colors.white12, height: 1),
                          itemBuilder: (context, index) {
                            final bookmark = localBookmarks[index];
                            return ListTile(
                              title: Text(
                                bookmark.title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Colors.white),
                              ),
                              subtitle: Text(
                                bookmark.source,
                                style: const TextStyle(color: Colors.white70),
                              ),
                              trailing: IconButton(
                                icon: const Icon(
                                  Icons.delete_outline,
                                  color: Colors.white70,
                                ),
                                onPressed: () async {
                                  await onDeleteBookmark(bookmark);
                                  if (!context.mounted) return;
                                  setModalState(() {
                                    localBookmarks.removeWhere(
                                      (item) => item.id == bookmark.id,
                                    );
                                  });
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        localizations.bookmarkRemoved,
                                      ),
                                    ),
                                  );
                                },
                              ),
                              onTap: () => Navigator.of(context).pop(bookmark),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        ),
      );
    },
  );
}
