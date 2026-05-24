import 'package:flutter/material.dart';
import 'package:mobile_app/l10n/app_localizations.dart';

class OnboardingIntroPage extends StatefulWidget {
  const OnboardingIntroPage({super.key, required this.onContinue});

  final Future<void> Function(List<String> selectedCategories) onContinue;

  @override
  State<OnboardingIntroPage> createState() => _OnboardingIntroPageState();
}

class _OnboardingIntroPageState extends State<OnboardingIntroPage> {
  final PageController _pageController = PageController();
  static const List<String> _categoryOptions = [
    'Politics',
    'Sports',
    'Entertainment',
    'Business',
    'Tech',
    'World',
    'Health',
    'Science',
    'Education',
    'General',
  ];

  int _currentPage = 0;
  final Set<String> _selectedCategories = <String>{};
  bool _isSubmitting = false;

  Future<void> _goToNextPage() async {
    await _pageController.nextPage(
      duration: const Duration(milliseconds: 240),
      curve: Curves.easeOut,
    );
  }

  Future<void> _finishOnboarding() async {
    if (_selectedCategories.length < 3 || _isSubmitting) return;

    setState(() {
      _isSubmitting = true;
    });

    try {
      await widget.onContinue(_selectedCategories.toList(growable: false));
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (index) {
                  setState(() {
                    _currentPage = index;
                  });
                },
                children: [
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          localizations.onboardingWelcomeTitle,
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          localizations.onboardingWelcomeBody,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 28),
                        FilledButton(
                          onPressed: _goToNextPage,
                          child: Text(localizations.onboardingContinue),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          localizations.onboardingCategoryTitle,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          localizations.onboardingCategoryBody,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 20),
                        Expanded(
                          child: SingleChildScrollView(
                            child: Wrap(
                              spacing: 10,
                              runSpacing: 10,
                              children: _categoryOptions
                                  .map((category) {
                                    final selected = _selectedCategories
                                        .contains(category);
                                    return ChoiceChip(
                                      label: Text(
                                        localizations.categoryLabel(category),
                                      ),
                                      selected: selected,
                                      onSelected: (value) {
                                        setState(() {
                                          if (value) {
                                            _selectedCategories.add(category);
                                          } else {
                                            _selectedCategories.remove(
                                              category,
                                            );
                                          }
                                        });
                                      },
                                    );
                                  })
                                  .toList(growable: false),
                            ),
                          ),
                        ),
                        Text(
                          localizations.onboardingCategorySelectionHint(
                            _selectedCategories.length,
                          ),
                          style: TextStyle(
                            color: _selectedCategories.length >= 3
                                ? Theme.of(context).colorScheme.primary
                                : Theme.of(context).colorScheme.error,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed:
                                _selectedCategories.length < 3 || _isSubmitting
                                ? null
                                : _finishOnboarding,
                            child: Text(localizations.onboardingStartReading),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(2, (index) {
                  final active = _currentPage == index;
                  return Container(
                    width: active ? 18 : 8,
                    height: 8,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: active
                          ? Theme.of(context).colorScheme.primary
                          : Theme.of(
                              context,
                            ).colorScheme.primary.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(20),
                    ),
                  );
                }),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
