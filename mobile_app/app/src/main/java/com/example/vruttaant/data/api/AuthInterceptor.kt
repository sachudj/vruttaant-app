package com.example.vruttaant.data.api

import com.example.vruttaant.data.AuthRepository
import com.example.vruttaant.data.model.RefreshRequest
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType

class AuthInterceptor(
    private val authRepository: AuthRepository,
    private val baseUrl: String
) : Interceptor {

    private val json = Json { ignoreUnknownKeys = true }
    private val contentType = "application/json".toMediaType()

    @Volatile
    private var isRefreshing = false

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val builder = originalRequest.newBuilder()

        // Attach access token if present
        authRepository.accessToken?.let { token ->
            builder.addHeader("Authorization", "Bearer $token")
        }

        val request = builder.build()
        val response = chain.proceed(request)

        if (response.code == 401) {
            synchronized(this) {
                // If token has already been refreshed by another thread while this thread was waiting
                val currentToken = authRepository.accessToken
                val requestToken = originalRequest.header("Authorization")?.replace("Bearer ", "")
                if (currentToken != requestToken && currentToken != null) {
                    response.close()
                    val newRequest = originalRequest.newBuilder()
                        .header("Authorization", "Bearer $currentToken")
                        .build()
                    return chain.proceed(newRequest)
                }

                val rToken = authRepository.refreshToken
                if (!rToken.isNullOrEmpty() && !isRefreshing) {
                    isRefreshing = true
                    try {
                        // Create a clean Retrofit instance to avoid circular calls
                        val cleanClient = OkHttpClient.Builder().build()
                        val cleanRetrofit = Retrofit.Builder()
                            .baseUrl(baseUrl)
                            .client(cleanClient)
                            .addConverterFactory(json.asConverterFactory(contentType))
                            .build()
                        val cleanService = cleanRetrofit.create(NewsApiService::class.java)

                        val refreshResponse = cleanService.refreshSync(RefreshRequest(rToken)).execute()
                        if (refreshResponse.isSuccessful && refreshResponse.body()?.success == true) {
                            val tokens = refreshResponse.body()?.data?.tokens
                            if (tokens != null) {
                                authRepository.storeAuthSuccess(
                                    accessToken = tokens.accessToken,
                                    refreshToken = tokens.refreshToken,
                                    email = authRepository.userEmail,
                                    id = authRepository.userId
                                )
                                response.close()
                                val newRequest = originalRequest.newBuilder()
                                    .header("Authorization", "Bearer ${tokens.accessToken}")
                                    .build()
                                return chain.proceed(newRequest)
                            }
                        } else {
                            // Session expired
                            authRepository.clear()
                        }
                    } catch (e: Exception) {
                        // Keep going, return original 401
                    } finally {
                        isRefreshing = false
                    }
                }
            }
        }

        return response
    }
}
