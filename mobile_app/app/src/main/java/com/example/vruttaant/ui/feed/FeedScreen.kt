package com.example.vruttaant.ui.feed

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.*
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.ui.platform.LocalView
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import coil3.compose.SubcomposeAsyncImage
import coil3.compose.AsyncImagePainter
import coil3.request.ImageRequest
import coil3.request.allowHardware
import com.example.vruttaant.data.model.NewsItem
import com.example.vruttaant.ui.theme.LocalAppLanguage
import com.example.vruttaant.ui.theme.Localizations

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    viewModel: FeedViewModel,
    authViewModel: com.example.vruttaant.ui.auth.AuthViewModel,
    bookmarksViewModel: com.example.vruttaant.ui.bookmarks.BookmarksViewModel,
    onSettingsClick: () -> Unit,
    onOpenBookmark: (NewsItem) -> Unit,
    modifier: Modifier = Modifier
) {
    val language = LocalAppLanguage.current
    val context = LocalContext.current
    val feed by viewModel.feed.collectAsState()
    val isInitialLoading by viewModel.isInitialLoading.collectAsState()
    val isLoadingMore by viewModel.isLoadingMore.collectAsState()
    val showingCachedFeed by viewModel.showingCachedFeed.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val sort by viewModel.sort.collectAsState()
    val bookmarkedUrls by viewModel.bookmarkedUrls.collectAsState()

    var showSearchSheet by remember { mutableStateOf(false) }
    var showBookmarksSheet by remember { mutableStateOf(false) }
    var showLoginSheet by remember { mutableStateOf(false) }

    val categories = listOf(
        null,
        "Tech",
        "Politics",
        "Sports",
        "Business",
        "World",
        "Health",
        "Entertainment",
        "Science",
        "Education",
        "General"
    )

    val darkBackground = Color(0xFF0F0F0F)
    val accentColor = Color(0xFF00B0FF)

    // Load initial feed on entry
    LaunchedEffect(Unit) {
        if (feed.isEmpty()) {
            viewModel.loadInitialFeed()
        } else {
            viewModel.syncBookmarks()
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(darkBackground)
    ) {
        when {
            isInitialLoading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color.White)
                }
            }
            errorMessage != null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = Localizations.getString("feed_load_failed", language),
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(text = errorMessage ?: "", color = Color.LightGray, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(20.dp))
                    Button(
                        onClick = { viewModel.loadInitialFeed() },
                        colors = ButtonDefaults.buttonColors(containerColor = accentColor)
                    ) {
                        Text(text = Localizations.getString("retry", language), color = Color.Black)
                    }
                }
            }
            feed.isEmpty() -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        text = Localizations.getString("no_stories_now", language),
                        color = Color.Gray,
                        fontSize = 16.sp
                    )
                }
            }
            else -> {
                val pagerState = rememberPagerState(pageCount = { feed.size + if (isLoadingMore) 1 else 0 })

                // Observe active page index changes to track view analytics
                LaunchedEffect(pagerState.currentPage) {
                    viewModel.trackActiveCard(pagerState.currentPage)
                    viewModel.loadMoreIfNeeded(pagerState.currentPage)
                }

                VerticalPager(
                    state = pagerState,
                    modifier = Modifier.fillMaxSize()
                ) { verticalPage ->
                    if (verticalPage >= feed.size) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = Color.White)
                        }
                    } else {
                        val item = feed[verticalPage]
                        val isBookmarked = bookmarkedUrls.contains(item.originalUrl)

                        HorizontalPager(
                            state = rememberPagerState(pageCount = { 2 }),
                            modifier = Modifier.fillMaxSize()
                        ) { horizontalPage ->
                            if (horizontalPage == 0) {
                                NewsCardScreen(
                                    item = item,
                                    isBookmarked = isBookmarked,
                                    onBookmarkToggle = { viewModel.toggleBookmark(item, onLoginRequired = { showLoginSheet = true }) },
                                    onTranslateRequested = { onResult -> viewModel.translateStory(item, onResult) },
                                    onShare = { viewModel.trackShare(item) },
                                    onSourceClick = {
                                        if (item.originalUrl.isNotEmpty()) {
                                            try {
                                                val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(item.originalUrl))
                                                context.startActivity(intent)
                                            } catch (e: Exception) {
                                                // ignore
                                            }
                                        }
                                    }
                                )
                            } else {
                                WebViewReaderScreen(
                                    item = item,
                                    onTranslateRequested = { onResult -> viewModel.translateStory(item, onResult) }
                                )
                            }
                        }
                    }
                }
            }
        }

        // Top Category Bar Row Overlay
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .safeDrawingPadding()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Horizontal category chips
                LazyRow(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(categories) { category ->
                        val isSelected = selectedCategory == category
                        val chipText = if (category == null) {
                            Localizations.getString("all", language)
                        } else {
                            Localizations.categoryLabel(category, language)
                        }

                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(999.dp))
                                .background(if (isSelected) Color.White else Color.Black.copy(alpha = 0.5f))
                                .border(
                                    width = 1.dp,
                                    color = if (isSelected) Color.White else Color.DarkGray,
                                    shape = RoundedCornerShape(999.dp)
                                )
                                .clickable { viewModel.selectCategory(category) }
                                .padding(horizontal = 14.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = chipText,
                                color = if (isSelected) Color.Black else Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Actions buttons group
                IconButton(
                    onClick = { showSearchSheet = true },
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(modifier = Modifier.width(6.dp))

                IconButton(
                    onClick = { showBookmarksSheet = true },
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.BookmarkBorder,
                        contentDescription = "Bookmarks",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(modifier = Modifier.width(6.dp))

                IconButton(
                    onClick = onSettingsClick,
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = "Settings",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            if (showingCachedFeed) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color.DarkGray.copy(alpha = 0.8f))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = Localizations.getString("cached_feed", language),
                            color = Color.LightGray,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // Bottom Sheets overlays
        if (showSearchSheet) {
            SearchSortSheet(
                initialQuery = searchQuery,
                initialSort = sort,
                onDismiss = { showSearchSheet = false },
                onApply = { query, sortMode -> viewModel.searchAndSort(query, sortMode) }
            )
        }

        if (showBookmarksSheet) {
            com.example.vruttaant.ui.bookmarks.BookmarksSheet(
                viewModel = bookmarksViewModel,
                onDismiss = { showBookmarksSheet = false },
                onBookmarkSelected = { bookmark -> onOpenBookmark(bookmark.toNewsItem()) }
            )
        }

        if (showLoginSheet) {
            com.example.vruttaant.ui.auth.LoginSheet(
                viewModel = authViewModel,
                onDismiss = { showLoginSheet = false },
                onLoginSuccess = {
                    showLoginSheet = false
                    viewModel.syncBookmarks()
                }
            )
        }
    }
}


@Composable
fun NewsCardScreen(
    item: NewsItem,
    isBookmarked: Boolean,
    onBookmarkToggle: () -> Unit,
    onTranslateRequested: ((title: String, summary: String, isSuccess: Boolean) -> Unit) -> Unit,
    onShare: () -> Unit,
    onSourceClick: () -> Unit
) {
    val language = LocalAppLanguage.current
    val context = LocalContext.current
    val view = LocalView.current

    var displayTitle by remember(item) { mutableStateOf(item.title) }
    var displaySummary by remember(item) { mutableStateOf(item.summary) }
    var translationState by remember(item) { mutableStateOf("original") } // original, translating, translated
    var translationError by remember(item) { mutableStateOf<String?>(null) }

    Column(modifier = Modifier.fillMaxSize()) {
        // Top 50% - Image or placeholder with a top scrim
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            SubcomposeAsyncImage(
                model = coil3.request.ImageRequest.Builder(LocalContext.current)
                    .data(item.imageUrl)
                    .allowHardware(false)
                    .build(),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            ) {
                val state = painter.state.collectAsState().value
                android.util.Log.d("FeedScreen", "Coil image state: $state for url: ${item.imageUrl}")
                if (state is AsyncImagePainter.State.Error) {
                    android.util.Log.e("FeedScreen", "Coil load error for ${item.imageUrl}: ${state.result.throwable.message}", state.result.throwable)
                }

                if (state is AsyncImagePainter.State.Success) {
                    androidx.compose.foundation.Image(
                        painter = painter,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color(0xFF2C3E50),
                                        Color(0xFF0F2027)
                                    )
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Article,
                            contentDescription = null,
                            tint = Color.White.copy(alpha = 0.6f),
                            modifier = Modifier.size(64.dp)
                        )
                    }
                }
            }
            // Top scrim gradient for status bar / category bar overlay readability
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Black.copy(alpha = 0.65f),
                                Color.Transparent
                            )
                        )
                    )
            )
        }

        // Bottom 50% - News details with a clean dark background
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .background(Color(0xFF161719))
                .navigationBarsPadding()
                .padding(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Upper part: Status row + Title + Summary
            Column(modifier = Modifier.fillMaxWidth()) {
                // Translation state row
                if (translationState != "original" || translationError != null) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(bottom = 12.dp)
                    ) {
                        if (translationState != "original") {
                            val statusText = when (translationState) {
                                "translating" -> Localizations.getString("translating", language)
                                "translated" -> Localizations.getString("translated", language)
                                else -> ""
                            }
                            val statusBg = if (translationState == "translated") Color(0xFF00796B) else Color.White.copy(alpha = 0.16f)

                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(statusBg)
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = statusText,
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        // Error text overlay
                        translationError?.let {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(Color.Red.copy(alpha = 0.24f))
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text(text = it, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // Title (max 4 lines)
                Text(
                    text = displayTitle,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White,
                    maxLines = 4,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 26.sp
                )
                Spacer(modifier = Modifier.height(10.dp))

                // Summary (max 6 lines)
                Text(
                    text = displaySummary,
                    fontSize = 15.sp,
                    color = Color(0xFFE8E8E8),
                    maxLines = 6,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 22.sp
                )
            }

            // Bottom part: Action Bar (Source + Actions)
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Source label
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(Color.White.copy(alpha = 0.16f))
                        .border(
                            width = 1.dp,
                            color = Color.White.copy(alpha = 0.24f),
                            shape = RoundedCornerShape(999.dp)
                        )
                        .clickable(enabled = item.originalUrl.isNotEmpty()) { onSourceClick() }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = item.source.ifEmpty { "News" },
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.weight(1f))

                // Actions row
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Translate Toggle
                    IconButton(
                        onClick = {
                            if (translationState == "translated") {
                                displayTitle = item.title
                                displaySummary = item.summary
                                translationState = "original"
                                translationError = null
                            } else if (translationState == "original") {
                                translationState = "translating"
                                translationError = null
                                onTranslateRequested { t, s, isSuccess ->
                                    if (isSuccess) {
                                        displayTitle = t
                                        displaySummary = s
                                        translationState = "translated"
                                    } else {
                                        displayTitle = item.title
                                        displaySummary = item.summary
                                        translationState = "original"
                                        translationError = Localizations.getString("translation_failed", language)
                                    }
                                }
                            }
                        },
                        modifier = Modifier
                            .size(36.dp)
                            .background(Color.White.copy(alpha = 0.16f), CircleShape)
                    ) {
                        if (translationState == "translating") {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = Color.White
                            )
                        } else {
                            Icon(
                                imageVector = if (translationState == "translated") Icons.Default.Translate else Icons.Outlined.Translate,
                                contentDescription = "Translate",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    // Share button
                    IconButton(
                        onClick = {
                            onShare()
                            val text = if (item.originalUrl.isNotEmpty()) {
                                "${displayTitle}\n\n${item.originalUrl}"
                            } else {
                                "${displayTitle}\n\n${displaySummary}"
                            }
                            shareScreenshot(view, context, displayTitle, text)
                        },
                        modifier = Modifier
                            .size(36.dp)
                            .background(Color.White.copy(alpha = 0.16f), CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Share,
                            contentDescription = "Share",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    // Bookmark toggle button
                    IconButton(
                        onClick = onBookmarkToggle,
                        modifier = Modifier
                            .size(36.dp)
                            .background(Color.White.copy(alpha = 0.16f), CircleShape)
                    ) {
                        Icon(
                            imageVector = if (isBookmarked) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder,
                            contentDescription = "Bookmark",
                            tint = if (isBookmarked) Color.Yellow else Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun WebViewReaderScreen(
    item: NewsItem,
    onTranslateRequested: ((title: String, summary: String, isSuccess: Boolean) -> Unit) -> Unit
) {
    val language = LocalAppLanguage.current
    var displayTitle by remember(item) { mutableStateOf(item.title) }
    var displaySummary by remember(item) { mutableStateOf(item.summary) }
    var translationState by remember(item) { mutableStateOf("original") } // original, translating, translated

    val articleUrl = item.originalUrl

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F0F0F))
            .safeDrawingPadding()
    ) {
        // Translation states Header row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val statusText = when (translationState) {
                "translating" -> Localizations.getString("translating", language)
                "translated" -> Localizations.getString("translated", language)
                else -> Localizations.getString("original", language)
            }
            val statusBg = if (translationState == "translated") Color(0xFF00796B) else Color.White.copy(alpha = 0.16f)

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(statusBg)
                    .padding(horizontal = 10.dp, vertical = 5.dp)
            ) {
                Text(
                    text = statusText,
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            IconButton(
                onClick = {
                    if (translationState == "translated") {
                        displayTitle = item.title
                        displaySummary = item.summary
                        translationState = "original"
                    } else if (translationState == "original") {
                        translationState = "translating"
                        onTranslateRequested { t, s, isSuccess ->
                            if (isSuccess) {
                                displayTitle = t
                                displaySummary = s
                                translationState = "translated"
                            } else {
                                displayTitle = item.title
                                displaySummary = item.summary
                                translationState = "original"
                            }
                        }
                    }
                },
                modifier = Modifier
                    .size(36.dp)
                    .background(Color.White.copy(alpha = 0.12f), CircleShape)
            ) {
                if (translationState == "translating") {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = Color.White
                    )
                } else {
                    Icon(
                        imageVector = if (translationState == "translated") Icons.Default.Translate else Icons.Outlined.Translate,
                        contentDescription = "Translate",
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }

        // Preview title + summary
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Text(
                text = displayTitle,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = displaySummary,
                fontSize = 14.sp,
                color = Color.LightGray,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 18.sp
            )
        }

        HorizontalDivider(color = Color.DarkGray, modifier = Modifier.padding(vertical = 4.dp))

        // WebView or Fallback Reader
        if (articleUrl.isNotEmpty()) {
            AndroidView(
                factory = { context ->
                    WebView(context).apply {
                        settings.javaScriptEnabled = true
                        webViewClient = WebViewClient()
                        loadUrl(articleUrl)
                    }
                },
                update = { webView ->
                    // Do not reload URL if it has already loaded to prevent flashes on state changes
                    if (webView.url != articleUrl) {
                        webView.loadUrl(articleUrl)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            )
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = Localizations.getString("read_more", language),
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = Localizations.getString("reader_hint", language),
                    color = Color.Gray,
                    textAlign = TextAlign.Center,
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = Localizations.getString("no_original_url", language),
                    color = Color.Red,
                    fontSize = 14.sp
                )
            }
        }
    }
}

private fun shareScreenshot(view: android.view.View, context: android.content.Context, title: String, text: String) {
    try {
        val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        view.draw(canvas)

        val cachePath = File(context.cacheDir, "shared_images")
        cachePath.mkdirs()
        val file = File(cachePath, "screenshot.png")
        val fileOutputStream = FileOutputStream(file)
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, fileOutputStream)
        fileOutputStream.flush()
        fileOutputStream.close()

        val contentUri = FileProvider.getUriForFile(
            context,
            "com.example.vruttaant.fileprovider",
            file
        )

        if (contentUri != null) {
            val shareIntent = Intent().apply {
                action = Intent.ACTION_SEND
                clipData = android.content.ClipData.newRawUri("", contentUri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                setDataAndType(contentUri, context.contentResolver.getType(contentUri))
                putExtra(Intent.EXTRA_STREAM, contentUri)
                putExtra(Intent.EXTRA_TEXT, text)
                type = "image/png"
            }
            val chooserIntent = Intent.createChooser(shareIntent, "Share News via Vruttaant")
            chooserIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            context.startActivity(chooserIntent)
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

