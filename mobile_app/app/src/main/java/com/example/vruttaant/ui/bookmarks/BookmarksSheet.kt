package com.example.vruttaant.ui.bookmarks

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.example.vruttaant.data.model.BookmarkItem
import com.example.vruttaant.ui.theme.LocalAppLanguage
import com.example.vruttaant.ui.theme.Localizations

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookmarksSheet(
    viewModel: BookmarksViewModel,
    onDismiss: () -> Unit,
    onBookmarkSelected: (BookmarkItem) -> Unit,
    modifier: Modifier = Modifier
) {
    val language = LocalAppLanguage.current
    val bookmarksState by viewModel.state.collectAsState()

    val textColor = Color.White
    val secondaryTextColor = Color.LightGray

    // Load bookmarks when sheet opens
    LaunchedEffect(Unit) {
        viewModel.loadBookmarks()
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF161616),
        dragHandle = { BottomSheetDefaults.DragHandle(color = Color.DarkGray) },
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 8.dp)
        ) {
            Text(
                text = Localizations.getString("bookmarks", language),
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = textColor
            )
            Spacer(modifier = Modifier.height(16.dp))

            when (val state = bookmarksState) {
                is BookmarksState.Loading -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = Color(0xFF00B0FF))
                    }
                }
                is BookmarksState.Failure -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = state.message, color = Color.Red, fontSize = 14.sp)
                    }
                }
                is BookmarksState.Success -> {
                    val list = state.list
                    if (list.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(200.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = Localizations.getString("no_bookmarks", language),
                                color = Color.Gray,
                                fontSize = 16.sp
                            )
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 400.dp)
                        ) {
                            items(list, key = { it.id }) { bookmark ->
                                BookmarkRowItem(
                                    bookmark = bookmark,
                                    language = language,
                                    onItemClick = {
                                        onBookmarkSelected(bookmark)
                                        onDismiss()
                                    },
                                    onDeleteClick = {
                                        viewModel.removeBookmark(bookmark.id)
                                    }
                                )
                            }
                        }
                    }
                }
                else -> {}
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
fun BookmarkRowItem(
    bookmark: BookmarkItem,
    language: String,
    onItemClick: () -> Unit,
    onDeleteClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF222222))
            .clickable { onItemClick() }
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        AsyncImage(
            model = bookmark.imageUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .size(70.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color.DarkGray)
        )

        Spacer(modifier = Modifier.width(12.dp))

        Column(
            modifier = Modifier.weight(1f)
        ) {
            Text(
                text = bookmark.title,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = bookmark.source,
                    fontSize = 12.sp,
                    color = Color.LightGray,
                    fontWeight = FontWeight.SemiBold
                )
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(Color.White.copy(alpha = 0.15f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = Localizations.categoryLabel(bookmark.category, language),
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        IconButton(onClick = onDeleteClick) {
            Icon(
                imageVector = Icons.Default.Delete,
                contentDescription = Localizations.getString("remove_bookmark", language),
                tint = Color.LightGray
            )
        }
    }
}
