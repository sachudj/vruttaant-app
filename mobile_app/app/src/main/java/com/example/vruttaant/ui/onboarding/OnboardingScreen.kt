package com.example.vruttaant.ui.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.vruttaant.ui.theme.LocalAppLanguage
import com.example.vruttaant.ui.theme.Localizations

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun OnboardingScreen(
    viewModel: OnboardingViewModel,
    onComplete: () -> Unit,
    modifier: Modifier = Modifier
) {
    val language = LocalAppLanguage.current
    var currentPage by remember { mutableIntStateOf(0) }
    val selectedCategories by viewModel.selectedCategories.collectAsState()

    val darkBackground = Color(0xFF0F0F0F)
    val cardColor = Color(0xFF1E1E1E)
    val accentColor = Color(0xFF00B0FF) // Vivid blue

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(darkBackground)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .safeDrawingPadding()
        ) {
            // Header spacing
            Spacer(modifier = Modifier.height(30.dp))

            // Sliding pages
            Box(modifier = Modifier.weight(1f)) {
                AnimatedContent(
                    targetState = currentPage,
                    transitionSpec = {
                        if (targetState > initialState) {
                            slideInHorizontally { width -> width } togetherWith slideOutHorizontally { width -> -width }
                        } else {
                            slideInHorizontally { width -> -width } togetherWith slideOutHorizontally { width -> width }
                        }
                    },
                    label = "OnboardingContent"
                ) { page ->
                    when (page) {
                        0 -> {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .verticalScroll(rememberScrollState()),
                                verticalArrangement = Arrangement.Center,
                                horizontalAlignment = Alignment.Start
                            ) {
                                Text(
                                    text = Localizations.getString("onboarding_welcome_title", language),
                                    fontSize = 32.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color.White,
                                    lineHeight = 40.sp
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = Localizations.getString("onboarding_welcome_body", language),
                                    fontSize = 18.sp,
                                    color = Color.LightGray,
                                    lineHeight = 28.sp
                                )
                                Spacer(modifier = Modifier.height(40.dp))
                                Button(
                                    onClick = { currentPage = 1 },
                                    colors = ButtonDefaults.buttonColors(containerColor = accentColor),
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(56.dp)
                                ) {
                                    Text(
                                        text = Localizations.getString("onboarding_continue", language),
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.Black
                                    )
                                }
                            }
                        }
                        1 -> {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .verticalScroll(rememberScrollState())
                            ) {
                                Text(
                                    text = Localizations.getString("onboarding_category_title", language),
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = Localizations.getString("onboarding_category_body", language),
                                    fontSize = 15.sp,
                                    color = Color.Gray,
                                    lineHeight = 22.sp
                                )
                                Spacer(modifier = Modifier.height(24.dp))

                                // Wrap layout for categories
                                FlowRow(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    verticalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    viewModel.categories.forEach { category ->
                                        val isSelected = selectedCategories.contains(category)
                                        val chipBg = if (isSelected) accentColor else cardColor
                                        val chipBorder = if (isSelected) Color.Transparent else Color.DarkGray
                                        val chipText = if (isSelected) Color.Black else Color.White

                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(999.dp))
                                                .background(chipBg)
                                                .clickable { viewModel.toggleCategory(category) }
                                                .padding(horizontal = 16.dp, vertical = 10.dp)
                                        ) {
                                            Text(
                                                text = Localizations.categoryLabel(category, language),
                                                color = chipText,
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(30.dp))

                                val hintTemplate = Localizations.getString("onboarding_category_selection_hint", language)
                                val count = selectedCategories.size
                                val hintText = hintTemplate.replace("{count}", count.toString())
                                val isSelectionValid = count >= 3

                                Text(
                                    text = hintText,
                                    color = if (isSelectionValid) accentColor else Color.Red,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold
                                )

                                Spacer(modifier = Modifier.height(16.dp))

                                Button(
                                    onClick = { viewModel.finishOnboarding(onComplete) },
                                    enabled = isSelectionValid,
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = accentColor,
                                        disabledContainerColor = Color.DarkGray
                                    ),
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(56.dp)
                                ) {
                                    Text(
                                        text = Localizations.getString("onboarding_start_reading", language),
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isSelectionValid) Color.Black else Color.Gray
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Bottom Pager Indicators
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(2) { index ->
                    val active = currentPage == index
                    val width = if (active) 18.dp else 8.dp
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 4.dp)
                            .size(width = width, height = 8.dp)
                            .clip(CircleShape)
                            .background(
                                if (active) accentColor else accentColor.copy(alpha = 0.35f)
                            )
                    )
                }
            }
        }
    }
}
