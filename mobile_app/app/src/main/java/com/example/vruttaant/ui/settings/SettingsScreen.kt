package com.example.vruttaant.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.vruttaant.data.model.DeviceItem
import com.example.vruttaant.data.model.NotificationPrefs
import com.example.vruttaant.ui.theme.LocalAppLanguage
import com.example.vruttaant.ui.theme.Localizations

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel,
    onBackClick: () -> Unit,
    onSignInRequired: () -> Unit,
    onResetOnboardingComplete: () -> Unit,
    modifier: Modifier = Modifier
) {
    val language = LocalAppLanguage.current
    val uiState by viewModel.uiState.collectAsState()

    // Preferences states
    val themeMode by viewModel.themeMode.collectAsState()
    val languageCode by viewModel.languageCode.collectAsState()
    val selectedCategories by viewModel.selectedCategories.collectAsState()

    // Notification states
    val notificationPrefs by viewModel.notificationPrefs.collectAsState()
    val registeredDevices by viewModel.registeredDevices.collectAsState()

    // Activity stats states
    val activityStats by viewModel.activityStats.collectAsState()
    val readingEvents by viewModel.readingEvents.collectAsState()

    // Temporary view states to edit before saving
    var tempTheme by remember { mutableStateOf(themeMode) }
    var tempLanguage by remember { mutableStateOf(languageCode) }
    val tempCategories = remember { mutableStateListOf<String>() }

    // Dropdown expanded states
    var languageExpanded by remember { mutableStateOf(false) }

    val languages = listOf("en", "hi", "bn", "mr", "te", "ta", "gu", "ur", "kn", "or", "ml")
    val categoriesList = listOf(
        "Politics", "Sports", "Entertainment", "Business", "Tech",
        "World", "Health", "Science", "Education", "General"
    )

    val primaryColor = Color(0xFF00B0FF)
    val cardBg = Color(0xFF1E1E1E)
    val textColor = Color.White
    val textSecondary = Color.LightGray

    // Initialize temporary values when details load
    LaunchedEffect(themeMode, languageCode, selectedCategories) {
        tempTheme = themeMode
        tempLanguage = languageCode
        tempCategories.clear()
        tempCategories.addAll(selectedCategories)
    }

    // Synchronize remote settings on entry
    LaunchedEffect(Unit) {
        viewModel.loadRemoteSettings()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(Localizations.getString("settings", language), fontWeight = FontWeight.Bold, color = textColor) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back", tint = textColor)
                    }
                },
                actions = {
                    TextButton(
                        onClick = {
                            viewModel.saveSettings(
                                theme = tempTheme,
                                language = tempLanguage,
                                categories = tempCategories.toSet(),
                                onSaved = onBackClick
                            )
                        }
                    ) {
                        Text(
                            text = Localizations.getString("save", language),
                            color = primaryColor,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F0F0F))
            )
        },
        containerColor = Color(0xFF0F0F0F),
        modifier = modifier
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            // Loading / Error HUD
            if (uiState is SettingsUiState.Loading) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = primaryColor,
                    trackColor = Color.DarkGray
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            // 1. Account Section
            Card(
                colors = CardDefaults.cardColors(containerColor = cardBg),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = Localizations.getString("account", language),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = primaryColor
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    if (viewModel.isLoggedIn) {
                        Text(
                            text = Localizations.getString("signed_in_state", language) + ":",
                            fontSize = 14.sp,
                            color = textSecondary
                        )
                        Text(
                            text = viewModel.userEmail.orEmpty(),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = textColor
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = Localizations.getString("profile_sync_hint", language),
                            fontSize = 11.sp,
                            color = Color.Gray
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { viewModel.signOut(onBackClick) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.Red),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(Localizations.getString("sign_out", language), color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    } else {
                        Text(
                            text = Localizations.getString("sign_in_manage", language),
                            fontSize = 14.sp,
                            color = textSecondary
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = onSignInRequired,
                            colors = ButtonDefaults.buttonColors(containerColor = primaryColor),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(Localizations.getString("sign_in", language), color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // 2. Preferences Settings Card
            Card(
                colors = CardDefaults.cardColors(containerColor = cardBg),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = Localizations.getString("settings", language),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = primaryColor
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    // Language dropdown selector
                    Text(
                        text = Localizations.getString("language", language),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = textSecondary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Box {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFF2B2B2B))
                                .clickable { languageExpanded = true }
                                .padding(14.dp)
                        ) {
                            Text(
                                text = Localizations.languageLabel(tempLanguage, language),
                                color = textColor,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        DropdownMenu(
                            expanded = languageExpanded,
                            onDismissRequest = { languageExpanded = false },
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF2B2B2B))
                        ) {
                            languages.forEach { code ->
                                DropdownMenuItem(
                                    text = { Text(Localizations.languageLabel(code, language), color = textColor) },
                                    onClick = {
                                        tempLanguage = code
                                        languageExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Theme selector (System / Light / Dark)
                    Text(
                        text = Localizations.getString("theme", language),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = textSecondary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val themeOptions = listOf("system", "light", "dark")
                        themeOptions.forEach { option ->
                            val active = tempTheme == option
                            val label = when (option) {
                                "light" -> Localizations.getString("theme_light", language)
                                "dark" -> Localizations.getString("theme_dark", language)
                                else -> Localizations.getString("theme_system", language)
                            }
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (active) primaryColor else Color(0xFF2B2B2B))
                                    .clickable { tempTheme = option }
                                    .padding(vertical = 12.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = label,
                                    color = if (active) Color.Black else textColor,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Category preferences selector
                    Text(
                        text = Localizations.getString("category_preferences", language),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = textSecondary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        categoriesList.forEach { category ->
                            val active = tempCategories.contains(category)
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(999.dp))
                                    .background(if (active) primaryColor else Color(0xFF2B2B2B))
                                    .clickable {
                                        if (active) tempCategories.remove(category)
                                        else tempCategories.add(category)
                                    }
                                    .padding(horizontal = 14.dp, vertical = 8.dp)
                            ) {
                                Text(
                                    text = Localizations.categoryLabel(category, language),
                                    color = if (active) Color.Black else textColor,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }

            // 3. Notification Settings Card (Visible when signed in)
            if (viewModel.isLoggedIn) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = cardBg),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = Localizations.getString("notifications", language),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = primaryColor
                        )
                        Spacer(modifier = Modifier.height(16.dp))

                        // Enable switch
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(Localizations.getString("enable_notifications", language), color = textColor, fontSize = 14.sp)
                            Switch(
                                checked = notificationPrefs.enabled,
                                onCheckedChange = {
                                    viewModel.updateNotificationPreferences(notificationPrefs.copy(enabled = it))
                                },
                                colors = SwitchDefaults.colors(checkedThumbColor = primaryColor)
                            )
                        }

                        // Sub options (only show if notifications are enabled)
                        if (notificationPrefs.enabled) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(Localizations.getString("breaking_news_alerts", language), color = textColor, fontSize = 14.sp)
                                Switch(
                                    checked = notificationPrefs.breakingNews,
                                    onCheckedChange = {
                                        viewModel.updateNotificationPreferences(notificationPrefs.copy(breakingNews = it))
                                    },
                                    colors = SwitchDefaults.colors(checkedThumbColor = primaryColor)
                                )
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(Localizations.getString("bookmark_alerts", language), color = textColor, fontSize = 14.sp)
                                Switch(
                                    checked = notificationPrefs.bookmarkAlerts,
                                    onCheckedChange = {
                                        viewModel.updateNotificationPreferences(notificationPrefs.copy(bookmarkAlerts = it))
                                    },
                                    colors = SwitchDefaults.colors(checkedThumbColor = primaryColor)
                                )
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(Localizations.getString("daily_digest", language), color = textColor, fontSize = 14.sp)
                                Switch(
                                    checked = notificationPrefs.dailyDigest,
                                    onCheckedChange = {
                                        viewModel.updateNotificationPreferences(notificationPrefs.copy(dailyDigest = it))
                                    },
                                    colors = SwitchDefaults.colors(checkedThumbColor = primaryColor)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Registered Devices list
                        Text(
                            text = Localizations.getString("registered_devices", language),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = textSecondary
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        if (registeredDevices.isEmpty()) {
                            Text(
                                text = Localizations.getString("no_notification_devices", language),
                                color = Color.Gray,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(vertical = 4.dp)
                            )
                        } else {
                            registeredDevices.forEach { device ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 6.dp)
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(Color(0xFF2B2B2B))
                                        .padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = device.deviceName ?: Localizations.getString("device_fallback_name", language),
                                            color = textColor,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = "${device.platform} | Token: ${device.token.take(12)}...",
                                            color = Color.Gray,
                                            fontSize = 11.sp
                                        )
                                    }
                                    IconButton(onClick = { viewModel.deleteDevice(device.deviceId) }) {
                                        Icon(
                                            imageVector = Icons.Default.Delete,
                                            contentDescription = Localizations.getString("device_removed", language),
                                            tint = Color.Red,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // 4. Activity Overview Card
                Card(
                    colors = CardDefaults.cardColors(containerColor = cardBg),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = Localizations.getString("activity_overview", language),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = primaryColor
                        )
                        Spacer(modifier = Modifier.height(16.dp))

                        // Grid metrics stats
                        Row(modifier = Modifier.fillMaxWidth()) {
                            MetricItem(
                                title = Localizations.getString("total_views", language),
                                value = activityStats.totalViews.toString(),
                                modifier = Modifier.weight(1f)
                            )
                            MetricItem(
                                title = Localizations.getString("total_bookmarks", language),
                                value = activityStats.totalBookmarks.toString(),
                                modifier = Modifier.weight(1f)
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth()) {
                            MetricItem(
                                title = Localizations.getString("total_translations", language),
                                value = activityStats.totalTranslations.toString(),
                                modifier = Modifier.weight(1f)
                            )
                            MetricItem(
                                title = Localizations.getString("total_shares", language),
                                value = activityStats.totalShares.toString(),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Recent read items
                        Text(
                            text = Localizations.getString("recent_reading", language),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = textSecondary
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        if (readingEvents.isEmpty()) {
                            Text(
                                text = Localizations.getString("no_recent_activity", language),
                                color = Color.Gray,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(vertical = 4.dp)
                            )
                        } else {
                            readingEvents.forEach { event ->
                                val cardTitle = event.newsCard?.title ?: Localizations.getString("story_fallback_title", language)
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp)
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(Color(0xFF2B2B2B))
                                        .padding(10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = cardTitle,
                                        color = textColor,
                                        fontSize = 13.sp,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 5. Reset Onboarding
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedButton(
                onClick = {
                    viewModel.resetOnboarding(onResetOnboardingComplete)
                },
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = textColor),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                Text(Localizations.getString("onboarding_reset", language), fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
fun MetricItem(
    title: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF2B2B2B)),
        modifier = modifier.padding(4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = value, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFF00B0FF))
            Spacer(modifier = Modifier.height(2.dp))
            Text(text = title, fontSize = 11.sp, color = Color.LightGray)
        }
    }
}
