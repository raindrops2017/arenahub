import { Platform } from 'react-native';
import Paymob from 'paymob-reactnative';

/**
 * Feature flag to switch between modern WebView Intention checkout and legacy native SDK.
 * Controlled via EXPO_PUBLIC_USE_PAYMOB_WEBVIEW in .env (defaults to true if set to 'true' or '1').
 */
export const USE_PAYMOB_WEBVIEW =
  process.env.EXPO_PUBLIC_USE_PAYMOB_WEBVIEW === 'true' ||
  process.env.EXPO_PUBLIC_USE_PAYMOB_WEBVIEW === '1';

/**
 * Configure native Paymob SDK styling and event listener.
 * Disables the SDK's internal confirmation/results page so it automatically
 * closes upon completion and hands control back to the app UI.
 */
export function configurePaymobSDK(
  onSuccess: () => void,
  onFail: (reason?: string) => void,
  onPending: () => void
) {
  try {
    // const PaymobModule = require('paymob-reactnative');
    // const Paymob = PaymobModule.default || PaymobModule;

    console.log('Paymob configuration started');

    if (Paymob) {
      if (typeof Paymob.setAppIcon === 'function') {
        Paymob.setAppIcon('@assets/images/icon.png');
      }
      if (typeof Paymob.setAppName === 'function') {
        Paymob.setAppName('ARENA HUB');
      }
      if (typeof Paymob.setButtonBackgroundColor === 'function') {
        Paymob.setButtonBackgroundColor('#22c55e');
      }
      if (typeof Paymob.setButtonTextColor === 'function') {
        Paymob.setButtonTextColor('#ffffff');
      }
      if (typeof Paymob.setShowSaveCard === 'function') {
        Paymob.setShowSaveCard(false);
      }
      // Disable internal SDK result/confirmation pages so SDK closes immediately
      if (typeof Paymob.setShowConfirmationPage === 'function') {
        Paymob.setShowConfirmationPage(false);
      }
      if (typeof Paymob.setShowTransactionResult === 'function') {
        Paymob.setShowTransactionResult(false);
      }

//       Paymob.setSdkListener((status: PaymentResult) => {
//   switch (status) {
//     case PaymentResult.SUCCESS:
//       // Handle successful payment
//       break;
//     case PaymentResult.FAIL:
//       // Handle failed payment
//       break;
//     case PaymentResult.PENDING:
//       // Handle pending payment status
//       break;
//   }
// });


        Paymob.setSdkListener((response: any) => {
          console.log('[Paymob SDK Listener] Payment Result Event:', JSON.stringify(response));

          const statusStr = (
            typeof response === 'string'
              ? response
              : response?.status || ''
          ).toUpperCase();

          switch (statusStr) {
            case 'SUCCESS':
            case 'ACCEPTED':
              onSuccess();
              break;
            case 'CANCELLED':
              onFail('Transaction was cancelled.');
              break;
            case 'FAIL':
            case 'REJECTED':
              onFail(response?.details?.message || 'Transaction was declined or failed.');
              break;
            case 'PENDING':
              onPending();
              break;
            default:
              console.log('[Paymob SDK Listener] Unhandled status received:', statusStr, response);
              break;
          }
        });
    }
  } catch (err) {
    console.warn('[PaymobService] paymob-reactnative SDK not available in current environment:', err);
  }
}

/**
 * Presents native Paymob View Controller directly using the clientSecret from backend.
 * Returns true if launched successfully, false if native SDK is not available.
 */
export function startNativePaymobCheckout(
  clientSecret: string,
  publicKey?: string
): boolean {
  const validPublicKey =
    publicKey && publicKey !== 'CARD' && publicKey !== 'WALLET'
      ? publicKey
      : '';
  try {
    console.log('[PaymobService] Presenting Paymob VC with clientSecret:', clientSecret);
    if (Paymob && typeof Paymob.presentPayVC === 'function') {
      Paymob.presentPayVC(clientSecret, validPublicKey);
      return true;
    }
  } catch (err) {
    console.warn('[PaymobService] Native Paymob VC failed to present:', err);
  }
  return false;
}
