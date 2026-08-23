import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/AppText';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { contactApi } from '@/services/api/contactApi';

const SUPPORT_PHONE = '+201000000000';
const SUPPORT_WHATSAPP = '201000000000';
const SUPPORT_EMAIL = 'ads@arenahub.com';

const CAMPAIGN_TYPES = [
  { id: 'BANNER', labelEn: 'Header Banner', labelAr: 'بانر رئيسي' },
  { id: 'TOURNAMENT', labelEn: 'Tournament Sponsor', labelAr: 'رعاية بطولة' },
  { id: 'PITCH', labelEn: 'Pitch Promotion', labelAr: 'ترويج ملعب' },
  { id: 'OTHER', labelEn: 'Other Inquiries', labelAr: 'استفسارات أخرى' },
];

export default function ContactScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const { colors, isDark } = useTheme();

  const [name, setName] = useState(user?.userName || user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [company, setCompany] = useState('');
  const [selectedType, setSelectedType] = useState('BANNER');
  const [message, setMessage] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhoneCall = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'تعذر فتح تطبيق الهاتف' : 'Unable to open phone dialer'
      );
    });
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      isArabic
        ? 'مرحباً أريناهب، أود الاستفسار عن الإعلان والرعاية على تطبيقكم.'
        : 'Hello ArenaHub team, I would like to inquire about advertising and sponsorship opportunities.'
    );
    Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`).catch(() => {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'تعذر فتح تطبيق واتساب' : 'Unable to open WhatsApp'
      );
    });
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Advertising & Partnership Inquiry');
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'تعذر فتح تطبيق البريد' : 'Unable to open email client'
      );
    });
  };

  const handleSubmitInquiry = async () => {
    let hasError = false;
    setNameError('');
    setPhoneError('');

    if (!name.trim()) {
      setNameError(isArabic ? 'الاسم مطلوب *' : 'Name is required *');
      hasError = true;
    }
    if (!phone.trim()) {
      setPhoneError(isArabic ? 'رقم الهاتف مطلوب *' : 'Phone number is required *');
      hasError = true;
    }

    if (hasError) {
      Alert.alert(
        isArabic ? 'حقول مطلوبة' : 'Required Fields',
        isArabic ? 'يرجى إدخال الاسم ورقم الهاتف للمتابعة' : 'Please provide both Name and Phone number'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await contactApi.submitInquiry({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        campaignType: selectedType,
        message: message.trim() || undefined,
      });

      setIsSubmitting(false);
      Alert.alert(
        isArabic ? 'تم حفظ طلبك بنجاح!' : 'Inquiry Saved Successfully!',
        isArabic
          ? 'شكراً لتواصلك معنا. تم حفظ رسالتك في النظام وسيقوم فريق أريناهب بالتواصل معك قريباً.'
          : 'Thank you for reaching out. Your inquiry has been stored in our system and our team will contact you shortly.',
        [
          {
            text: isArabic ? 'حسناً' : 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        err.message || (isArabic ? 'تعذر إرسال الطلب، يرجى المحاولة لاحقاً' : 'Failed to submit inquiry, please try again')
      );
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Navigation Header */}
        <View
          style={{
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          }}
          className={`flex-row items-center justify-between px-4 py-3 border-b ${
            isArabic ? 'flex-row-reverse' : ''
          }`}
        >
          <View className={`flex-row items-center gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={{
                backgroundColor: isDark ? '#141d2e' : '#f1f5f9',
                borderColor: colors.border,
              }}
              className="w-10 h-10 rounded-full items-center justify-center border active:opacity-75"
            >
              <Ionicons
                name={isArabic ? 'arrow-forward' : 'arrow-back'}
                size={20}
                color={colors.textPrimary}
              />
            </Pressable>
            <View>
              <Text
                style={isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined}
                className="text-lg font-black uppercase text-foreground tracking-wide"
              >
                {isArabic ? 'الإعلان والتواصل' : 'Advertise & Contact'}
              </Text>
              <Text
                style={isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined}
                className="text-[11px] text-muted-foreground font-medium"
              >
                {isArabic ? 'انضم إلى شبكة شركاء أريناهب' : 'Partner with ArenaHub Platform'}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Banner Card */}
          <View className="rounded-3xl overflow-hidden mb-6 shadow-lg relative">
            <LinearGradient
              colors={isDark ? ['#0f291e', '#04060c'] : ['#16a34a', '#15803d']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="p-6 relative"
            >
              <View className="flex-row justify-between items-start mb-3">
                <View className="bg-[#22c55e] px-3 py-1 rounded-full flex-row items-center">
                  <FontAwesome5 name="bullhorn" size={12} color="#04060c" />
                  <Text
                    style={isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined}
                    className="text-[11px] font-black text-[#04060c] ml-1.5 uppercase"
                  >
                    {isArabic ? 'فرص الشراكة' : 'GROW WITH US'}
                  </Text>
                </View>
                <FontAwesome5
                  name="award"
                  size={26}
                  color={isDark ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.4)'}
                />
              </View>

              <Text
                style={[
                  isArabic
                    ? {
                        fontFamily: 'DroidArabicKufi',
                        textAlign: 'right',
                        writingDirection: 'rtl',
                      }
                    : undefined,
                ]}
                className="text-2xl font-black text-white uppercase tracking-wider mb-2"
              >
                {isArabic ? 'أعلن علامتك التجارية هنا' : 'Promote Your Brand on ArenaHub'}
              </Text>

              <Text
                style={[
                  isArabic
                    ? {
                        fontFamily: 'DroidArabicKufi',
                        textAlign: 'right',
                        writingDirection: 'rtl',
                      }
                    : undefined,
                ]}
                className="text-xs text-emerald-100 font-medium leading-5"
              >
                {isArabic
                  ? 'اوصل إلى آلاف اللاعبين، عشاق الرياضة، وأصحاب الملاعب يومياً عبر بانرات ديناميكية تفاعلية وحملات مخصصة.'
                  : 'Reach thousands of active athletes, players, and sports facility visitors every day through high-impact interactive banner campaigns.'}
              </Text>
            </LinearGradient>
          </View>

          {/* Direct Quick Contact Options */}
          <Text
            style={isArabic ? { fontFamily: 'DroidArabicKufi', textAlign: 'right' } : undefined}
            className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-3 ml-1"
          >
            {isArabic ? 'قنوات التواصل المباشر' : 'Direct Channels'}
          </Text>

          <View className="flex-row gap-3 mb-6">
            {/* WhatsApp */}
            <Pressable
              onPress={handleWhatsApp}
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
              }}
              className="flex-1 rounded-2xl p-4 border items-center justify-center active:scale-95 shadow-sm"
            >
              <View className="w-12 h-12 rounded-full bg-[#25D366]/20 items-center justify-center mb-2">
                <FontAwesome5 name="whatsapp" size={24} color="#25D366" />
              </View>
              <Text
                style={isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined}
                className="text-xs font-extrabold text-foreground"
              >
                {isArabic ? 'واتساب' : 'WhatsApp'}
              </Text>
              <Text className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                {isArabic ? 'محادثة فورية' : 'Instant Chat'}
              </Text>
            </Pressable>

            {/* Phone */}
            <Pressable
              onPress={handlePhoneCall}
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
              }}
              className="flex-1 rounded-2xl p-4 border items-center justify-center active:scale-95 shadow-sm"
            >
              <View className="w-12 h-12 rounded-full bg-[#3b82f6]/20 items-center justify-center mb-2">
                <Ionicons name="call" size={22} color="#3b82f6" />
              </View>
              <Text
                style={isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined}
                className="text-xs font-extrabold text-foreground"
              >
                {isArabic ? 'اتصال هاتف' : 'Direct Call'}
              </Text>
              <Text className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                {isArabic ? 'فريق الدعم' : 'Support Line'}
              </Text>
            </Pressable>

            {/* Email */}
            <Pressable
              onPress={handleEmail}
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
              }}
              className="flex-1 rounded-2xl p-4 border items-center justify-center active:scale-95 shadow-sm"
            >
              <View className="w-12 h-12 rounded-full bg-[#f59e0b]/20 items-center justify-center mb-2">
                <MaterialIcons name="email" size={24} color="#f59e0b" />
              </View>
              <Text
                style={isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined}
                className="text-xs font-extrabold text-foreground"
              >
                {isArabic ? 'البريد' : 'Email'}
              </Text>
              <Text className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                ads@arenahub.com
              </Text>
            </Pressable>
          </View>

          {/* Interactive Inquiry Form */}
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
            }}
            className="rounded-3xl p-5 border shadow-sm mb-6"
          >
            <View className={`flex-row items-center gap-2.5 mb-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <View className="w-8 h-8 rounded-lg bg-[#22c55e]/20 items-center justify-center">
                <FontAwesome5 name="paper-plane" size={14} color="#22c55e" />
              </View>
              <View>
                <Text
                  style={isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined}
                  className="text-base font-black uppercase text-foreground"
                >
                  {isArabic ? 'طلب إعلان أو رعاية' : 'Send Advertising Inquiry'}
                </Text>
                <Text
                  style={isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined}
                  className="text-[11px] text-muted-foreground"
                >
                  {isArabic ? 'املأ البيانات وسنتواصل معك بأسرع وقت' : 'Fill in your details for a tailored proposal'}
                </Text>
              </View>
            </View>

            {/* Campaign Category Chips */}
            <Text
              style={isArabic ? { fontFamily: 'DroidArabicKufi', textAlign: 'right' } : undefined}
              className="text-xs font-semibold text-muted-foreground mb-2 ml-1 uppercase"
            >
              {isArabic ? 'نوع الحملة / الإعلان' : 'Campaign Type'}
            </Text>
            <View className={`flex-row flex-wrap gap-2 mb-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
              {CAMPAIGN_TYPES.map((type) => {
                const isSelected = selectedType === type.id;
                return (
                  <Pressable
                    key={type.id}
                    onPress={() => setSelectedType(type.id)}
                    style={{
                      backgroundColor: isSelected
                        ? isDark
                          ? '#22c55e'
                          : '#16a34a'
                        : isDark
                        ? '#0b1322'
                        : '#f1f5f9',
                      borderColor: isSelected ? '#22c55e' : colors.border,
                    }}
                    className="px-3 py-1.5 rounded-xl border active:opacity-80"
                  >
                    <Text
                      style={[
                        {
                          color: isSelected ? '#04060c' : colors.textSecondary,
                          fontWeight: isSelected ? '900' : '600',
                        },
                        isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                      ]}
                      className="text-xs uppercase"
                    >
                      {isArabic ? type.labelAr : type.labelEn}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Inputs */}
            <Input
              label={isArabic ? 'الاسم الكامل *' : 'Full Name *'}
              placeholder={isArabic ? 'أدخل اسمك الكريم' : 'e.g. Ahmed Ali'}
              value={name}
              error={nameError}
              onChangeText={(val) => {
                setName(val);
                if (nameError) setNameError('');
              }}
            />

            <Input
              label={isArabic ? 'رقم الهاتف / واتساب *' : 'Phone / WhatsApp *'}
              placeholder="+20 100 000 0000"
              keyboardType="phone-pad"
              value={phone}
              error={phoneError}
              onChangeText={(val) => {
                setPhone(val);
                if (phoneError) setPhoneError('');
              }}
            />

            <Input
              label={isArabic ? 'البريد الإلكتروني' : 'Email Address'}
              placeholder="company@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              label={isArabic ? 'اسم الشركة / العلامة التجارية' : 'Company / Brand Name'}
              placeholder={isArabic ? 'اسم المنشأة أو الملعب' : 'e.g. Sports Club / Brand'}
              value={company}
              onChangeText={setCompany}
            />

            <Input
              label={isArabic ? 'تفاصيل الإعلان أو الملاحظات' : 'Campaign Notes & Budget'}
              placeholder={
                isArabic
                  ? 'وضح نوع الإعلان، الميزانية المقترحة، أو أي استفسار...'
                  : 'Describe your campaign goals, preferred dates, or questions...'
              }
              multiline
              numberOfLines={3}
              style={{ minHeight: 70, textAlignVertical: 'top' }}
              value={message}
              onChangeText={setMessage}
            />

            <Button
              title={
                isSubmitting
                  ? isArabic
                    ? 'جاري الإرسال...'
                    : 'Submitting...'
                  : isArabic
                  ? 'إرسال طلب الإعلان'
                  : 'Submit Inquiry'
              }
              onPress={handleSubmitInquiry}
              disabled={isSubmitting}
              className="mt-3"
            />
          </View>

          {/* Operating Info Footer */}
          <View
            style={{
              backgroundColor: isDark ? '#070c18' : '#f8fafc',
              borderColor: colors.border,
            }}
            className="rounded-2xl p-4 border items-center"
          >
            <Ionicons name="time-outline" size={20} color={colors.mutedForeground} className="mb-1" />
            <Text
              style={isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined}
              className="text-xs font-bold text-foreground mb-0.5"
            >
              {isArabic ? 'ساعات عمل فريق الإعلانات' : 'Advertising Support Hours'}
            </Text>
            <Text
              style={isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined}
              className="text-[11px] text-muted-foreground text-center"
            >
              {isArabic
                ? 'يومياً من 9:00 صباحاً حتى 11:00 مساءً (توقيت القاهرة)'
                : 'Daily from 9:00 AM to 11:00 PM (Cairo Time)'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
