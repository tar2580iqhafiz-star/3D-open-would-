package com.verdantisle.sandbox

import android.app.Activity
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Google Mobile Ads SDK Rewarded Ad Controller.
 *
 * - Debug builds allow Google's official test Rewarded Ad Unit ID.
 * - Release builds strictly enforce the production Rewarded Ad Unit ID and reject test IDs.
 * - Rewards are confirmed ONLY when OnUserEarnedRewardListener fires with a positive amount.
 */
class AdMobRewardedManager(
    private val context: Context,
    private val defaultRewardedAdUnitId: String = BuildConfig.ADMOB_REWARDED_AD_UNIT_ID,
    private val allowTestAds: Boolean = BuildConfig.ADMOB_USE_TEST_ADS
) {
    companion object {
        private const val TAG = "AdMobRewardedManager"
        const val PRODUCTION_APP_ID = "ca-app-pub-1097647548047380~4558161173"
        const val PRODUCTION_REWARDED_AD_UNIT_ID = "ca-app-pub-1097647548047380/8090212075"
        const val TEST_REWARDED_AD_UNIT_ID = "ca-app-pub-3940256099942544/5224354917"
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private val initialized = AtomicBoolean(false)
    private val isShowing = AtomicBoolean(false)
    private var rewardedAd: RewardedAd? = null
    private var isLoading = false

    fun initializeAndPreload() {
        if (initialized.compareAndSet(false, true)) {
            MobileAds.initialize(context.applicationContext) {
                Log.d(TAG, "MobileAds initialized (allowTestAds=$allowTestAds)")
                preloadRewardedAd(defaultRewardedAdUnitId)
            }
        } else {
            preloadRewardedAd(defaultRewardedAdUnitId)
        }
    }

    fun isAdReady(): Boolean = rewardedAd != null

    fun preloadRewardedAd(requestedUnitId: String = defaultRewardedAdUnitId) {
        mainHandler.post {
            if (rewardedAd != null || isLoading) return@post
            val resolvedUnitId = resolveUnitId(requestedUnitId)
            isLoading = true

            val adRequest = AdRequest.Builder().build()
            RewardedAd.load(
                context,
                resolvedUnitId,
                adRequest,
                object : RewardedAdLoadCallback() {
                    override fun onAdLoaded(ad: RewardedAd) {
                        isLoading = false
                        rewardedAd = ad
                        Log.d(TAG, "Preloaded rewarded ad ($resolvedUnitId)")
                    }

                    override fun onAdFailedToLoad(error: LoadAdError) {
                        isLoading = false
                        rewardedAd = null
                        Log.w(TAG, "Preload failed ($resolvedUnitId): ${error.message}")
                    }
                }
            )
        }
    }

    fun showRewardedAd(
        activity: Activity,
        requestedUnitId: String,
        onFinished: (outcome: String, rewardAmount: Int, rewardType: String) -> Unit
    ) {
        mainHandler.post {
            if (!isShowing.compareAndSet(false, true)) {
                onFinished("unavailable", 0, "")
                return@post
            }

            val resolvedUnitId = resolveUnitId(requestedUnitId)
            val readyAd = rewardedAd

            if (readyAd != null) {
                rewardedAd = null
                presentLoadedAd(activity, readyAd, resolvedUnitId, onFinished)
                return@post
            }

            val adRequest = AdRequest.Builder().build()
            RewardedAd.load(
                activity,
                resolvedUnitId,
                adRequest,
                object : RewardedAdLoadCallback() {
                    override fun onAdLoaded(ad: RewardedAd) {
                        presentLoadedAd(activity, ad, resolvedUnitId, onFinished)
                    }

                    override fun onAdFailedToLoad(error: LoadAdError) {
                        isShowing.set(false)
                        Log.w(TAG, "On-demand ad load failed ($resolvedUnitId): ${error.message}")
                        onFinished("unavailable", 0, "")
                    }
                }
            )
        }
    }

    private fun presentLoadedAd(
        activity: Activity,
        ad: RewardedAd,
        resolvedUnitId: String,
        onFinished: (outcome: String, rewardAmount: Int, rewardType: String) -> Unit
    ) {
        var rewardEarned = false
        var earnedAmount = 0
        var earnedType = ""
        var callbackDispatched = false

        fun dispatchOnce(outcome: String) {
            if (callbackDispatched) return
            callbackDispatched = true
            isShowing.set(false)
            if (outcome == "completed" && rewardEarned && earnedAmount > 0) {
                onFinished("completed", earnedAmount, earnedType)
            } else {
                onFinished(outcome, 0, "")
            }
        }

        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdShowedFullScreenContent() {
                Log.d(TAG, "Rewarded ad showed full screen")
            }

            override fun onAdFailedToShowFullScreenContent(adError: AdError) {
                Log.w(TAG, "Failed to show rewarded ad: ${adError.message}")
                dispatchOnce("unavailable")
                preloadRewardedAd(resolvedUnitId)
            }

            override fun onAdDismissedFullScreenContent() {
                // Only confirm completion if OnUserEarnedRewardListener verified the reward
                dispatchOnce(if (rewardEarned && earnedAmount > 0) "completed" else "closed_early")
                preloadRewardedAd(resolvedUnitId)
            }
        }

        ad.show(activity) { rewardItem ->
            rewardEarned = true
            earnedAmount = if (rewardItem.amount > 0) rewardItem.amount else 1
            earnedType = rewardItem.type
            Log.d(TAG, "User earned reward: $earnedAmount $earnedType")
        }
    }

    private fun resolveUnitId(requestedUnitId: String): String {
        val trimmed = requestedUnitId.trim()
        if (!allowTestAds) {
            // Production release: NEVER allow empty or test ad unit IDs
            if (trimmed.isEmpty() || trimmed == TEST_REWARDED_AD_UNIT_ID) {
                return PRODUCTION_REWARDED_AD_UNIT_ID
            }
            return trimmed
        }

        // Debug builds: strictly use Google's official test rewarded ad unit ID
        return TEST_REWARDED_AD_UNIT_ID
    }
}
