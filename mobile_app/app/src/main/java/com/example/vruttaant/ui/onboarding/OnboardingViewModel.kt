package com.example.vruttaant.ui.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vruttaant.data.PreferencesRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class OnboardingViewModel(
    private val preferencesRepository: PreferencesRepository
) : ViewModel() {

    val categories = listOf(
        "Politics",
        "Sports",
        "Entertainment",
        "Business",
        "Tech",
        "World",
        "Health",
        "Science",
        "Education",
        "General"
    )

    private val _selectedCategories = MutableStateFlow<Set<String>>(emptySet())
    val selectedCategories: StateFlow<Set<String>> = _selectedCategories.asStateFlow()

    fun toggleCategory(category: String) {
        val current = _selectedCategories.value.toMutableSet()
        if (current.contains(category)) {
            current.remove(category)
        } else {
            current.add(category)
        }
        _selectedCategories.value = current
    }

    fun finishOnboarding(onComplete: () -> Unit) {
        val selected = _selectedCategories.value
        if (selected.size >= 3) {
            viewModelScope.launch {
                preferencesRepository.saveOnboardingCategories(selected)
                preferencesRepository.onboardingCompleted = true
                if (selected.isNotEmpty()) {
                    preferencesRepository.primaryCategory = selected.first()
                }
                onComplete()
            }
        }
    }
}

// Extension to save categories since PreferencesRepository uses Set<String> property
private fun PreferencesRepository.saveOnboardingCategories(categories: Set<String>) {
    this.onboardingCategories = categories
}
