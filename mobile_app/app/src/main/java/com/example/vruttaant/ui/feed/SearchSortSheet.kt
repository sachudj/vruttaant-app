package com.example.vruttaant.ui.feed

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.vruttaant.ui.theme.LocalAppLanguage
import com.example.vruttaant.ui.theme.Localizations

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchSortSheet(
    initialQuery: String,
    initialSort: String,
    onDismiss: () -> Unit,
    onApply: (query: String, sort: String) -> Unit,
    modifier: Modifier = Modifier
) {
    val language = LocalAppLanguage.current
    var query by remember { mutableStateOf(initialQuery) }
    var selectedSort by remember { mutableStateOf(initialSort) }

    val primaryColor = Color(0xFF00B0FF)
    val textColor = Color.White

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
                .padding(horizontal = 24.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = Localizations.getString("search_sort", language),
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = textColor
            )
            Spacer(modifier = Modifier.height(20.dp))

            // Search Field
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                placeholder = { Text(Localizations.getString("search_hint", language), color = Color.Gray) },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = primaryColor,
                    unfocusedBorderColor = Color.DarkGray,
                    focusedTextColor = textColor,
                    unfocusedTextColor = textColor
                ),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(20.dp))

            // Sort Section
            Text(
                text = Localizations.getString("sort_latest", language) + " / " + Localizations.getString("sort_relevance", language),
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = textColor
            )
            Spacer(modifier = Modifier.height(10.dp))

            Column(Modifier.selectableGroup()) {
                val sortOptions = listOf("latest", "relevance")
                sortOptions.forEach { option ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .selectable(
                                selected = (selectedSort == option),
                                onClick = { selectedSort = option },
                                role = Role.RadioButton
                            ),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = (selectedSort == option),
                            onClick = null, // null recommended for accessibility with selectable modifier
                            colors = RadioButtonDefaults.colors(selectedColor = primaryColor, unselectedColor = Color.DarkGray)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = if (option == "latest") {
                                Localizations.getString("sort_latest", language)
                            } else {
                                Localizations.getString("sort_relevance", language)
                            },
                            color = textColor,
                            fontSize = 15.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = {
                        query = ""
                        selectedSort = "latest"
                        onApply("", "latest")
                        onDismiss()
                    },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = textColor),
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                ) {
                    Text(Localizations.getString("clear", language), fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = {
                        onApply(query, selectedSort)
                        onDismiss()
                    },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = primaryColor),
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                ) {
                    Text(
                        text = Localizations.getString("apply", language),
                        color = Color.Black,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
