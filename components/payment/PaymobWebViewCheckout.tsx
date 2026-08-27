import React, { useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';

export interface PaymobErrorData {
  status?: string;
  message: string;
  rawUrl?: string;
  [key: string]: any;
}

export interface PaymobWebViewCheckoutProps {
  /** Whether the checkout modal is visible */
  visible: boolean;
  /** The client secret received from backend intention creation */
  clientSecret: string;
  /** Paymob Public Key received from backend response */
  publicKey: string;
  /** Optional custom base checkout URL override */
  baseUrl?: string;
  /** Callback fired on successful payment with transaction ID or reference */
  onSuccess: (transactionId: string, params?: Record<string, string>) => void;
  /** Callback fired on payment failure, cancellation, or decline */
  onFailure: (errorData: PaymobErrorData) => void;
  /** Callback fired when user closes the modal */
  onClose?: () => void;
  /** Optional header title text (default: 'Paymob Secure Checkout') */
  headerTitle?: string;
  /** Custom success pattern (regex or string) to match redirect URLs */
  customSuccessPattern?: RegExp | string;
  /** Custom failure pattern (regex or string) to match redirect URLs */
  customFailurePattern?: RegExp | string;
  /** Visual indicator color for loading state */
  loadingIndicatorColor?: string;
  /** Header background color */
  headerBackgroundColor?: string;
  /** Header text color */
  headerTextColor?: string;
}

const DEFAULT_BASE_CHECKOUT_URL =
  'https://accept.paymob.com/unifiedcheckout/';

/**
 * Modern Paymob Unified Checkout WebView Component
 * Completely isolated parallel implementation utilizing Paymob's Intention API.
 */
export const PaymobWebViewCheckout: React.FC<PaymobWebViewCheckoutProps> = ({
  visible,
  clientSecret,
  publicKey,
  baseUrl = DEFAULT_BASE_CHECKOUT_URL,
  onSuccess,
  onFailure,
  onClose,
  headerTitle = 'Secure Checkout',
  customSuccessPattern,
  customFailurePattern,
  loadingIndicatorColor = '#22c55e',
  headerBackgroundColor = '#0f172a',
  headerTextColor = '#ffffff',
}) => {
  const isHandledRef = useRef<boolean>(false);
  const webViewRef = useRef<WebView>(null);

  // Reset completion latch when modal opens
  useEffect(() => {
    if (visible) {
      isHandledRef.current = false;
    }
  }, [visible]);

  // Construct standard Paymob Intention Unified Checkout URL
  const checkoutUrl = React.useMemo(() => {
    if (!clientSecret || !publicKey) return '';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const encodedPk = encodeURIComponent(publicKey.trim());
    const encodedSecret = encodeURIComponent(clientSecret.trim());
    return `${cleanBase}?publicKey=${encodedPk}&clientSecret=${encodedSecret}`;
  }, [baseUrl, publicKey, clientSecret]);

  /**
   * Helper function to extract query parameters from URL string
   */
  const parseQueryParams = (url: string): Record<string, string> => {
    const params: Record<string, string> = {};
    try {
      const queryString = url.split('?')[1];
      if (!queryString) return params;

      const pairs = queryString.split('&');
      for (const pair of pairs) {
        const [rawKey, rawValue] = pair.split('=');
        if (rawKey) {
          params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue || '');
        }
      }
    } catch {
      // Ignore query string parsing errors
    }
    return params;
  };

  /**
   * Evaluates navigation state to detect completion, success, failure, or cancellation
   */
  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (!navState.url || isHandledRef.current) return;

      const { url } = navState;
      const lowerUrl = url.toLowerCase();
      const params = parseQueryParams(url);

      // Check custom patterns if provided
      if (customSuccessPattern) {
        const matchesSuccess =
          typeof customSuccessPattern === 'string'
            ? url.includes(customSuccessPattern)
            : customSuccessPattern.test(url);

        if (matchesSuccess) {
          isHandledRef.current = true;
          const txnId = params.id || params.order || params.transaction_id || 'SUCCESS';
          onSuccess(txnId, params);
          return;
        }
      }

      if (customFailurePattern) {
        const matchesFailure =
          typeof customFailurePattern === 'string'
            ? url.includes(customFailurePattern)
            : customFailurePattern.test(url);

        if (matchesFailure) {
          isHandledRef.current = true;
          onFailure({
            status: 'FAILED',
            message: params.data_message || params['data.message'] || 'Payment failed or was declined.',
            rawUrl: url,
            ...params,
          });
          return;
        }
      }

      // Check standard Paymob success signatures
      const isSuccessParam =
        params.success === 'true' ||
        params.success === '1' ||
        params.txn_response_code === 'APPROVED' ||
        lowerUrl.includes('success=true') ||
        lowerUrl.includes('txn_response_code=approved');

      // Check standard Paymob failure/decline/cancellation signatures
      const isFailureParam =
        params.success === 'false' ||
        params.success === '0' ||
        params.txn_response_code === 'DECLINED' ||
        params.txn_response_code === 'CANCELLED' ||
        lowerUrl.includes('success=false') ||
        lowerUrl.includes('txn_response_code=declined') ||
        lowerUrl.includes('txn_response_code=cancelled');

      if (isSuccessParam && !isFailureParam) {
        isHandledRef.current = true;
        const transactionId =
          params.id ||
          params.order ||
          params.transaction_id ||
          params.order_id ||
          'UNKNOWN_TXN';
        onSuccess(transactionId, params);
        return;
      }

      if (isFailureParam) {
        isHandledRef.current = true;
        const failureMessage =
          params.data_message ||
          params['data.message'] ||
          params.message ||
          'Transaction was declined or failed.';
        onFailure({
          status: 'DECLINED',
          message: failureMessage,
          rawUrl: url,
          ...params,
        });
      }
    },
    [customSuccessPattern, customFailurePattern, onSuccess, onFailure]
  );

  /**
   * Handle user tapping top-left close/cancel button
   */
  const handleUserCancel = () => {
    if (!isHandledRef.current) {
      isHandledRef.current = true;
      onFailure({
        status: 'CANCELLED',
        message: 'User dismissed payment modal.',
      });
    }
    if (onClose) {
      onClose();
    }
  };

  /**
   * Render loading spinner anchor
   */
  const renderLoadingView = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={loadingIndicatorColor} />
      <Text style={styles.loadingText}>Initializing Secure Payment...</Text>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleUserCancel}
    >
      <SafeAreaView
        edges={['top', 'left', 'right', 'bottom']}
        style={[styles.safeArea, { backgroundColor: headerBackgroundColor }]}
      >
        <StatusBar
          barStyle={Platform.OS === 'ios' ? 'light-content' : 'light-content'}
          backgroundColor={headerBackgroundColor}
        />

        {/* Modal Navigation Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor },
          ]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close payment checkout"
            onPress={handleUserCancel}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.closeButtonText, { color: headerTextColor }]}>
              ✕ Cancel
            </Text>
          </TouchableOpacity>

          <Text
            numberOfLines={1}
            style={[styles.headerTitle, { color: headerTextColor }]}
          >
            {headerTitle}
          </Text>

          <View style={styles.headerRightSpacer} />
        </View>

        {/* WebView Container */}
        <View style={styles.webViewContainer}>
          {checkoutUrl ? (
            <WebView
              ref={webViewRef}
              source={{ uri: checkoutUrl }}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={renderLoadingView}
              onNavigationStateChange={handleNavigationStateChange}
              scalesPageToFit={true}
              style={styles.webView}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('[PaymobWebViewCheckout] WebView error:', nativeEvent);
                if (!isHandledRef.current) {
                  isHandledRef.current = true;
                  onFailure({
                    status: 'NETWORK_ERROR',
                    message: nativeEvent.description || 'Failed to load Paymob checkout page.',
                  });
                }
              }}
            />
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Unable to load checkout: Missing clientSecret or publicKey.
              </Text>
              <TouchableOpacity
                onPress={handleUserCancel}
                style={styles.errorButton}
              >
                <Text style={styles.errorButtonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerRightSpacer: {
    width: 60,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#22c55e',
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default PaymobWebViewCheckout;
