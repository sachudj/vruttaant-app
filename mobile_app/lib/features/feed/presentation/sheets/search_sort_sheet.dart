import 'package:flutter/material.dart';
import 'package:mobile_app/l10n/app_localizations.dart';

Future<Map<String, String>?> showSearchSortSheet({
  required BuildContext context,
  required AppLocalizations localizations,
  required String initialQuery,
  required String initialSort,
}) {
  var pendingQuery = initialQuery;
  var pendingSort = initialSort;

  return showModalBottomSheet<Map<String, String>>(
    context: context,
    isScrollControlled: true,
    backgroundColor: const Color(0xFF121212),
    builder: (context) {
      return StatefulBuilder(
        builder: (context, setModalState) {
          return SafeArea(
            child: SingleChildScrollView(
              child: Padding(
                padding: EdgeInsets.only(
                  left: 16,
                  right: 16,
                  top: 12,
                  bottom: MediaQuery.of(context).viewInsets.bottom + 16,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      localizations.searchSort,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      key: const ValueKey('search-query-input'),
                      initialValue: pendingQuery,
                      onChanged: (value) {
                        pendingQuery = value;
                      },
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: localizations.searchHint,
                        hintStyle: const TextStyle(color: Colors.white54),
                        filled: true,
                        fillColor: Colors.white.withValues(alpha: 0.08),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        prefixIcon: const Icon(
                          Icons.search,
                          color: Colors.white70,
                        ),
                      ),
                      textInputAction: TextInputAction.search,
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      children: [
                        ChoiceChip(
                          label: Text(localizations.sortLatest),
                          selected: pendingSort == 'latest',
                          onSelected: (_) {
                            setModalState(() {
                              pendingSort = 'latest';
                            });
                          },
                        ),
                        ChoiceChip(
                          label: Text(localizations.sortRelevance),
                          selected: pendingSort == 'relevance',
                          onSelected: (_) {
                            setModalState(() {
                              pendingSort = 'relevance';
                            });
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        TextButton(
                          onPressed: () {
                            Navigator.of(
                              context,
                            ).pop({'q': '', 'sort': 'latest'});
                          },
                          child: Text(localizations.clear),
                        ),
                        const Spacer(),
                        FilledButton(
                          onPressed: () {
                            Navigator.of(context).pop({
                              'q': pendingQuery.trim(),
                              'sort': pendingSort,
                            });
                          },
                          child: Text(localizations.apply),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      );
    },
  );
}
