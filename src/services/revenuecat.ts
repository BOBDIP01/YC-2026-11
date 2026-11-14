/**
 * RevenueCat StoreKit 2 (Apple App Store) & Google Play Billing v7 Service for YouConnect
 * Implements:
 * - Native Capacitor SDK (`@revenuecat/purchases-capacitor`) for iOS & Android
 * - Web Billing SDK (`@revenuecat/purchases-js`) for Web
 * - Entitlement mapping (`basic_access` -> Basic Tier, `business_access` -> Business Tier)
 * - Consumable IAP (`youconnect_ai_booster_50` -> +50 AI Quota Coins valid 3 months)
 * - Apple App Store Guideline 3.1.1 & 3.1.2 Mandatory Restore Purchases (`Purchases.restorePurchases()`)
 */

import { SubscriptionTier } from '../types';
import { getRuntimePlatform, isNativeMobilePlatform, apiFetch } from '../utils/apiConfig';
import { getPersistedAuthUser } from './firebase';

export const REVENUECAT_ENTITLEMENTS = {
  PRO: 'pro_access',
  BASIC: 'pro_access', // backward compatibility alias for $12 tier
  BUSINESS: 'business_access',
} as const;

export const REVENUECAT_PRODUCT_IDS = {
  PRO_MONTHLY: 'youconnect_pro_monthly',
  BASIC_MONTHLY: 'youconnect_pro_monthly', // backward compatibility alias
  BUSINESS_MONTHLY: 'youconnect_business_monthly',
  AI_BOOSTER_50: 'youconnect_ai_booster_50',
} as const;

export interface RevenueCatPackageDisplay {
  identifier: string;
  productId: string;
  tier?: SubscriptionTier;
  title: string;
  description: string;
  priceString: string;
  priceAmountMicros: number;
  currencyCode: string;
  billingPeriodISO: string;
  rawPackage?: any;
}

export interface RevenueCatCustomerState {
  appUserId: string;
  activeTier: SubscriptionTier;
  activeEntitlements: string[];
  activeSubscriptions: string[];
  expirationDate?: string | null;
  willRenew: boolean;
  managementURL?: string | null;
  isSandbox: boolean;
  billingProvider: 'apple_storekit2' | 'google_play_billing' | 'revenuecat_web' | 'sandbox_preview';
}

export interface PurchaseOutcome {
  success: boolean;
  userCancelled?: boolean;
  tier?: SubscriptionTier;
  boosterCoinsAdded?: number;
  transactionId?: string;
  customerState?: RevenueCatCustomerState;
  message: string;
}

function loadDynamicModule(specifier: string): Promise<any> {
  return import(/* @vite-ignore */ specifier);
}

let cachedRuntimeSdkKey: string | null = null;
let runtimeConfiguredFlag = true;

async function fetchRuntimeBillingSdkKey(platform: 'ios' | 'android' | 'web'): Promise<string> {
  if (cachedRuntimeSdkKey !== null) return cachedRuntimeSdkKey;
  try {
    const res = await apiFetch('/api/billing/sdk-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Platform': platform,
      },
      body: JSON.stringify({ platform }),
    });
    if (res.ok) {
      const data = await res.json();
      runtimeConfiguredFlag = Boolean(data?.configured);
      cachedRuntimeSdkKey = String(data?.sdkKey || '').trim();
      return cachedRuntimeSdkKey;
    }
  } catch {
    // Offline or unreachable
  }
  return '';
}

export function isRevenueCatConfigured(): boolean {
  return runtimeConfiguredFlag;
}

let rcNativePurchases: any = null;
let rcWebInstance: any = null;
let rcInitializedForUser: string | null = null;

/**
 * Resolves active subscription tier from RevenueCat CustomerInfo object.
 */
export function mapCustomerInfoToTier(customerInfo: any): SubscriptionTier {
  const active = customerInfo?.entitlements?.active || {};
  const subs: string[] = Array.isArray(customerInfo?.activeSubscriptions)
    ? customerInfo.activeSubscriptions
    : [];
  if (
    active[REVENUECAT_ENTITLEMENTS.BUSINESS] ||
    active['business_access'] ||
    active['YouConnect Ultra'] ||
    subs.some(
      (s) =>
        s.startsWith(REVENUECAT_PRODUCT_IDS.BUSINESS_MONTHLY) ||
        s.includes('business') ||
        s === 'Annual_Tier_2' ||
        s.startsWith('ultra_y_1')
    )
  ) {
    return 'business';
  }
  if (
    active[REVENUECAT_ENTITLEMENTS.PRO] ||
    active['pro_access'] ||
    active['basic_access'] || // legacy entitlement name for $12 tier
    active['YouConnect Pro'] ||
    subs.some(
      (s) =>
        s.startsWith(REVENUECAT_PRODUCT_IDS.PRO_MONTHLY) ||
        s.startsWith('youconnect_basic_monthly') || // legacy product ID for $12 tier
        s.includes('pro') ||
        s === 'Annual_Tier_1' ||
        s.startsWith('plus_y_1')
    )
  ) {
    return 'pro';
  }
  return 'basic';
}

/**
 * Initializes the RevenueCat SDK and binds it to the authenticated Firebase UID.
 */
export async function initializeRevenueCat(customAppUserId?: string): Promise<{
  initialized: boolean;
  provider: RevenueCatCustomerState['billingProvider'];
  appUserId: string;
}> {
  const authUser = getPersistedAuthUser();
  const appUserId =
    customAppUserId ||
    authUser?.uid ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('youconnect_rc_anon_id') ||
        (() => {
          const id = `rc_anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
          try {
            localStorage.setItem('youconnect_rc_anon_id', id);
          } catch {
            // ignore
          }
          return id;
        })()
      : 'rc_anon_server');

  const platform = getRuntimePlatform();
  const apiKey = await fetchRuntimeBillingSdkKey(platform);

  // 1. Native iOS / Android Capacitor RevenueCat SDK
  if (isNativeMobilePlatform() && apiKey) {
    try {
      const capMod = await loadDynamicModule('@revenuecat/purchases-capacitor');
      const Purchases = capMod.Purchases || capMod.default;
      if (Purchases) {
        if (!rcNativePurchases) {
          await Purchases.configure({
            apiKey,
            appUserID: appUserId,
          });
          rcNativePurchases = Purchases;
        } else if (rcInitializedForUser !== appUserId) {
          await Purchases.logIn({ appUserID: appUserId });
        }
        rcInitializedForUser = appUserId;
        return {
          initialized: true,
          provider: platform === 'ios' ? 'apple_storekit2' : 'google_play_billing',
          appUserId,
        };
      }
    } catch (err) {
      console.warn('Native Store SDK initialization warning:', err);
    }
  }

  // 2. RevenueCat Web Billing SDK (`@revenuecat/purchases-js`)
  if (!isNativeMobilePlatform() && apiKey && apiKey.startsWith('rcb_')) {
    try {
      const webMod = await loadDynamicModule('@revenuecat/purchases-js');
      const Purchases = webMod.Purchases || webMod.default;
      if (Purchases && typeof Purchases.configure === 'function') {
        rcWebInstance = Purchases.configure(apiKey, appUserId);
        rcInitializedForUser = appUserId;
        return {
          initialized: true,
          provider: 'revenuecat_web',
          appUserId,
        };
      }
    } catch (err) {
      console.warn('Web Billing SDK initialization warning:', err);
    }
  }

  rcInitializedForUser = appUserId;
  return {
    initialized: Boolean(rcNativePurchases || rcWebInstance),
    provider:
      platform === 'ios'
        ? 'apple_storekit2'
        : platform === 'android'
        ? 'google_play_billing'
        : 'sandbox_preview',
    appUserId,
  };
}

/**
 * Fetches available subscription & consumable packages from RevenueCat Offerings
 * (or returns canonical App Store Connect / Play Console product metadata when testing in sandbox).
 */
export async function fetchRevenueCatOfferings(): Promise<RevenueCatPackageDisplay[]> {
  await initializeRevenueCat();

  if (rcNativePurchases) {
    try {
      const offerings = await rcNativePurchases.getOfferings();
      const available = offerings?.current?.availablePackages || [];
      if (available.length > 0) {
        return available.map((pkg: any) => {
          const prod = pkg.product || {};
          const prodId = prod.identifier || pkg.identifier;
          const tier: SubscriptionTier | undefined = prodId.includes('business')
            ? 'business'
            : prodId.includes('pro') || prodId.includes('basic')
            ? 'pro'
            : undefined;
          return {
            identifier: pkg.identifier,
            productId: prodId,
            tier,
            title: prod.title || pkg.identifier,
            description: prod.description || '',
            priceString: prod.priceString || (tier === 'business' ? '$29.00' : '$12.00'),
            priceAmountMicros: prod.price ? Math.round(prod.price * 1_000_000) : 0,
            currencyCode: prod.currencyCode || 'USD',
            billingPeriodISO: prod.subscriptionPeriod || 'P1M',
            rawPackage: pkg,
          };
        });
      }
    } catch (err) {
      console.warn('Could not load native RevenueCat offerings:', err);
    }
  }

  return [
    {
      identifier: '$rc_monthly_pro',
      productId: REVENUECAT_PRODUCT_IDS.PRO_MONTHLY,
      tier: 'pro',
      title: 'YouConnect Pro Monthly',
      description: 'Unlimited Digital Cards, 5 Daily AI Quota Coins & Unlimited P2P Radar',
      priceString: '$12.00',
      priceAmountMicros: 12_000_000,
      currencyCode: 'USD',
      billingPeriodISO: 'P1M',
    },
    {
      identifier: '$rc_monthly_business',
      productId: REVENUECAT_PRODUCT_IDS.BUSINESS_MONTHLY,
      tier: 'business',
      title: 'YouConnect Business & CRM Monthly',
      description: 'Full Business CRM, 10 Daily AI Images & Unlimited Text/CRM AI',
      priceString: '$29.00',
      priceAmountMicros: 29_000_000,
      currencyCode: 'USD',
      billingPeriodISO: 'P1M',
    },
    {
      identifier: 'consumable_booster_50',
      productId: REVENUECAT_PRODUCT_IDS.AI_BOOSTER_50,
      title: 'AI Booster Pack (+50 Coins)',
      description: '+50 Universal AI Quota Coins valid for 3 months (90 days)',
      priceString: '$14.99',
      priceAmountMicros: 14_990_000,
      currencyCode: 'USD',
      billingPeriodISO: 'CONSUMABLE_P3M',
    },
  ];
}

/**
 * Executes a subscription tier purchase (`basic` downgrade, `pro` $12/mo, or `business` $29/mo)
 * via RevenueCat StoreKit 2 / Google Play Billing.
 */
export async function purchaseSubscriptionTierWithRevenueCat(
  targetTier: SubscriptionTier
): Promise<PurchaseOutcome> {
  // Switching to Basic tier cancels/downgrades at next renewal
  if (targetTier === 'basic') {
    return {
      success: true,
      tier: 'basic',
      transactionId: `rc_downgrade_${Date.now()}`,
      message: 'Plan set to Basic Tier ($0). Manage active store auto-renewals in device Account Settings.',
    };
  }

  // Strict Offline / Wi-Fi Disconnect Guard: never allow paid tier activation while offline
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      success: false,
      message: 'Network connection unavailable. Please reconnect to Wi-Fi or cellular data to complete your purchase.',
    };
  }

  const initInfo = await initializeRevenueCat();

  const targetProductId =
    targetTier === 'business'
      ? REVENUECAT_PRODUCT_IDS.BUSINESS_MONTHLY
      : REVENUECAT_PRODUCT_IDS.PRO_MONTHLY;

  // 1. Native Capacitor StoreKit 2 / Play Billing Flow
  if (rcNativePurchases) {
    try {
      const offerings = await rcNativePurchases.getOfferings();
      const packages: any[] = offerings?.current?.availablePackages || [];
      const matchingPkg = packages.find(
        (p) =>
          p.product?.identifier === targetProductId ||
          p.product?.identifier === 'youconnect_basic_monthly' ||
          p.identifier?.toLowerCase().includes(targetTier) ||
          (targetTier === 'pro' && p.identifier?.toLowerCase().includes('basic'))
      );

      let purchaseResult: any;
      if (matchingPkg) {
        purchaseResult = await rcNativePurchases.purchasePackage({ aPackage: matchingPkg });
      } else if (typeof rcNativePurchases.getProducts === 'function') {
        const { products } = await rcNativePurchases.getProducts({
          productIdentifiers: [targetProductId, 'youconnect_basic_monthly'],
        });
        if (products && products.length > 0) {
          purchaseResult = await rcNativePurchases.purchaseStoreProduct({
            product: products[0],
          });
        }
      }

      const txId = purchaseResult?.transaction?.transactionIdentifier;
      if (!purchaseResult?.customerInfo || !txId) {
        return {
          success: false,
          message: 'Store purchase could not be completed or verified. Please check your network connection and try again.',
        };
      }

      const verifiedTier = mapCustomerInfoToTier(purchaseResult.customerInfo);
      if (verifiedTier !== targetTier && !(targetTier === 'pro' && verifiedTier === 'business')) {
        return {
          success: false,
          message: 'Entitlement verification did not match the requested plan. No upgrade was applied.',
        };
      }

      const serverCheck = await verifyReceiptWithBackend({
        appUserId: initInfo.appUserId,
        productId: targetProductId,
        tier: verifiedTier,
        transactionId: txId,
        provider: initInfo.provider,
      });

      if (!serverCheck.verified) {
        return {
          success: false,
          message: serverCheck.error || 'Could not verify purchase receipt with server. Please use Restore Purchases once online.',
        };
      }

      return {
        success: true,
        tier: verifiedTier,
        transactionId: txId,
        message: `Your ${verifiedTier === 'business' ? 'Business' : 'Basic'} plan is now active!`,
      };
    } catch (err: any) {
      if (err?.userCancelled || err?.code === '1' || err?.message?.includes('cancelled')) {
        return {
          success: false,
          userCancelled: true,
          message: 'Purchase cancelled.',
        };
      }
      return {
        success: false,
        message: err?.message || 'Subscription transaction could not be completed due to a network or store error.',
      };
    }
  }

  // 2. RevenueCat Web Billing SDK Flow
  if (rcWebInstance && typeof rcWebInstance.getOfferings === 'function') {
    try {
      const offerings = await rcWebInstance.getOfferings();
      const pkgs: any[] = offerings?.current?.availablePackages || [];
      const pkg = pkgs.find((p) => p.rcBillingProduct?.identifier === targetProductId);
      if (!pkg) {
        return {
          success: false,
          message: 'Selected subscription package is currently unavailable.',
        };
      }
      const purchaseRes = await rcWebInstance.purchase({ rcPackage: pkg });
      const customerInfo = purchaseRes?.customerInfo;
      const verifiedTier = mapCustomerInfoToTier(customerInfo);
      if (verifiedTier !== targetTier && !(targetTier === 'pro' && verifiedTier === 'business')) {
        return {
          success: false,
          message: 'Subscription payment was not confirmed. No plan changes were made.',
        };
      }
      const txId =
        purchaseRes?.StoreTransaction?.storeTransactionId ||
        purchaseRes?.transaction?.transactionIdentifier ||
        `rc_web_${initInfo.appUserId}_${Date.now()}`;

      const serverCheck = await verifyReceiptWithBackend({
        appUserId: initInfo.appUserId,
        productId: targetProductId,
        tier: verifiedTier,
        transactionId: txId,
        provider: initInfo.provider,
      });

      if (!serverCheck.verified) {
        return {
          success: false,
          message: serverCheck.error || 'Could not verify subscription receipt with server.',
        };
      }

      return {
        success: true,
        tier: verifiedTier,
        transactionId: txId,
        message: `Your ${verifiedTier === 'business' ? 'Business' : 'Basic'} subscription is now active!`,
      };
    } catch (err: any) {
      if (err?.userCancelled) {
        return {
          success: false,
          userCancelled: true,
          message: 'Purchase cancelled.',
        };
      }
      return {
        success: false,
        message: err?.message || 'Subscription checkout failed due to a network or billing error.',
      };
    }
  }

  // Fail closed when no verified store billing session is active (prevents free upgrades on web or during network failures)
  return {
    success: false,
    message:
      'In-app purchases require the iOS App Store, Google Play Store, or an active billing session. Please complete your purchase in the mobile app or tap Restore Purchases if you already subscribed.',
  };
}

/**
 * Executes a Consumable In-App Purchase for `youconnect_ai_booster_50` (+50 AI Quota Coins valid 3 months).
 */
export async function purchaseAiBoosterWithRevenueCat(
  coinsToAdd = 50
): Promise<PurchaseOutcome> {
  // Strict Offline / Wi-Fi Disconnect Guard: never grant AI Booster Coins while offline
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      success: false,
      message: 'Network connection unavailable. Please reconnect to Wi-Fi or cellular data to purchase AI Booster Coins.',
    };
  }

  const safeCoinsToAdd = 50;
  const initInfo = await initializeRevenueCat();
  const productId = REVENUECAT_PRODUCT_IDS.AI_BOOSTER_50;

  if (rcNativePurchases) {
    try {
      const { products } = await rcNativePurchases.getProducts({
        productIdentifiers: [productId],
        type: 'CONSUMABLE',
      });
      if (!products || products.length === 0) {
        return {
          success: false,
          message: 'AI Booster Pack product is currently unavailable from the store. Please check your connection.',
        };
      }

      const res = await rcNativePurchases.purchaseStoreProduct({
        product: products[0],
      });
      const txId = res?.transaction?.transactionIdentifier;
      if (!txId) {
        return {
          success: false,
          message: 'Store transaction receipt was not returned. No coins were added.',
        };
      }

      const serverCheck = await verifyReceiptWithBackend({
        appUserId: initInfo.appUserId,
        productId,
        boosterCoinsAdded: safeCoinsToAdd,
        transactionId: txId,
        provider: initInfo.provider,
        isConsumable: true,
      });

      if (!serverCheck.verified || serverCheck.alreadyProcessed) {
        return {
          success: false,
          message:
            serverCheck.error ||
            (serverCheck.alreadyProcessed
              ? 'This purchase receipt has already been credited to your balance.'
              : 'Receipt verification failed. Please check your internet connection.'),
        };
      }

      return {
        success: true,
        boosterCoinsAdded: safeCoinsToAdd,
        transactionId: txId,
        message: `+${safeCoinsToAdd} AI Quota Coins added to your balance (valid for 3 months)!`,
      };
    } catch (err: any) {
      if (err?.userCancelled || err?.code === '1') {
        return {
          success: false,
          userCancelled: true,
          message: 'Booster pack purchase cancelled.',
        };
      }
      return {
        success: false,
        message: err?.message || 'Booster pack purchase could not be completed due to a network or store error.',
      };
    }
  }

  if (rcWebInstance && typeof rcWebInstance.getOfferings === 'function') {
    try {
      const offerings = await rcWebInstance.getOfferings();
      const pkgs: any[] = offerings?.current?.availablePackages || [];
      const pkg = pkgs.find((p) => p.rcBillingProduct?.identifier === productId);
      if (!pkg) {
        return {
          success: false,
          message: 'AI Booster Pack is currently unavailable in web billing.',
        };
      }
      const purchaseRes = await rcWebInstance.purchase({ rcPackage: pkg });
      const txId =
        purchaseRes?.StoreTransaction?.storeTransactionId ||
        purchaseRes?.transaction?.transactionIdentifier;
      if (!txId) {
        return {
          success: false,
          message: 'Transaction receipt was not confirmed. No coins were added.',
        };
      }

      const serverCheck = await verifyReceiptWithBackend({
        appUserId: initInfo.appUserId,
        productId,
        boosterCoinsAdded: safeCoinsToAdd,
        transactionId: txId,
        provider: initInfo.provider,
        isConsumable: true,
      });

      if (!serverCheck.verified || serverCheck.alreadyProcessed) {
        return {
          success: false,
          message:
            serverCheck.error ||
            (serverCheck.alreadyProcessed
              ? 'This purchase receipt has already been credited to your balance.'
              : 'Could not verify booster purchase receipt with server.'),
        };
      }

      return {
        success: true,
        boosterCoinsAdded: safeCoinsToAdd,
        transactionId: txId,
        message: `+${safeCoinsToAdd} AI Quota Coins added to your balance (valid for 3 months)!`,
      };
    } catch (err: any) {
      if (err?.userCancelled) {
        return {
          success: false,
          userCancelled: true,
          message: 'Booster pack purchase cancelled.',
        };
      }
      return {
        success: false,
        message: err?.message || 'Booster pack checkout failed due to a network or billing error.',
      };
    }
  }

  // Fail closed when no verified store billing session is active
  return {
    success: false,
    message:
      'Purchasing the +50 AI Booster Pack requires the iOS App Store, Google Play Store, or an active billing session.',
  };
}

/**
 * Apple App Store Guideline 3.1.1 / 3.1.2 Mandatory "Restore Purchases" handler.
 * Queries StoreKit 2 / Google Play Billing / RevenueCat backend ledger to restore active entitlements.
 */
export async function restorePurchasesWithRevenueCat(
  currentLocalTier: SubscriptionTier
): Promise<PurchaseOutcome> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      success: false,
      tier: currentLocalTier,
      message: 'Network connection unavailable. Please reconnect to Wi-Fi or cellular data to restore purchases.',
    };
  }

  const initInfo = await initializeRevenueCat();

  // 1. Native Capacitor StoreKit 2 / Play Billing restorePurchases()
  if (rcNativePurchases && typeof rcNativePurchases.restorePurchases === 'function') {
    try {
      const { customerInfo } = await rcNativePurchases.restorePurchases();
      const restoredTier = mapCustomerInfoToTier(customerInfo);
      return {
        success: true,
        tier: restoredTier,
        message: `Your purchases have been restored (${restoredTier.toUpperCase()} plan active).`,
      };
    } catch (err: any) {
      return {
        success: false,
        tier: currentLocalTier,
        message: err?.message || 'Failed to restore purchases from the store.',
      };
    }
  }

  // 2. Query server-side RevenueCat entitlement ledger
  try {
    const res = await apiFetch(
      `/api/billing/entitlements?appUserId=${encodeURIComponent(initInfo.appUserId)}`
    );
    if (res.ok) {
      const data = await res.json();
      const rawTier = String(data?.tier || '').toLowerCase();
      let resolvedTier: SubscriptionTier = 'basic';
      if (rawTier === 'business') resolvedTier = 'business';
      else if (rawTier === 'pro' || rawTier === 'basic') resolvedTier = 'pro';
      else resolvedTier = 'basic';

      return {
        success: true,
        tier: resolvedTier,
        message: `Your purchases have been restored (${resolvedTier.toUpperCase()} plan active).`,
      };
    }
  } catch {
    return {
      success: false,
      tier: currentLocalTier,
      message: 'Could not reach the billing server to restore purchases. Please check your connection.',
    };
  }

  return {
    success: true,
    tier: currentLocalTier,
    message: `Your subscription status is up to date (${currentLocalTier.toUpperCase()} plan).`,
  };
}

async function verifyReceiptWithBackend(payload: {
  appUserId: string;
  productId: string;
  tier?: SubscriptionTier;
  boosterCoinsAdded?: number;
  transactionId: string;
  provider: string;
  isConsumable?: boolean;
}): Promise<{ verified: boolean; alreadyProcessed?: boolean; error?: string }> {
  try {
    const res = await apiFetch('/api/billing/verify-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        verified: false,
        error: data?.error || `Receipt verification failed (${res.status}).`,
      };
    }
    return {
      verified: Boolean(data?.verified),
      alreadyProcessed: Boolean(data?.alreadyProcessed),
    };
  } catch {
    return {
      verified: false,
      error: 'Network error while verifying transaction receipt.',
    };
  }
}

