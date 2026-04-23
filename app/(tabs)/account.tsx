import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from 'expo-image-picker';

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { MOCK_USER } from "@/lib/mock-data";
import { useVentures } from "@/lib/ventures-store";
import { useWallet } from "@/lib/wallet-store";
import { useAuth } from "@/lib/auth-store";
import { uploadImage } from "@/lib/upload";

const TOPUP_PRESETS = [500, 1000, 2000, 5000];
const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', icon: 'qrcode', sublabel: 'Pay via any UPI app' },
  { id: 'card', label: 'Credit / Debit Card', icon: 'creditcard.fill', sublabel: 'Visa, Mastercard, RuPay' },
  { id: 'netbanking', label: 'Net Banking', icon: 'building.columns.fill', sublabel: 'All major banks' },
];

// ─── Top-Up Sheet ─────────────────────────────────────────────────────────────
function TopUpSheet({ visible, onClose, authUsername }: { visible: boolean; onClose: () => void; authUsername: string }) {
  const colors = useColors();
  const { topup } = useWallet();
  const [amount, setAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [step, setStep] = useState<'amount' | 'method' | 'processing' | 'success'>('amount');

  const numericAmount = selectedPreset ?? (parseInt(amount, 10) || 0);

  const handlePreset = (val: number) => {
    setSelectedPreset(val);
    setAmount(String(val));
  };

  const handleCustomAmount = (val: string) => {
    setAmount(val.replace(/[^0-9]/g, ''));
    setSelectedPreset(null);
  };

  const handleProceed = () => {
    if (numericAmount < 10) {
      Alert.alert('Minimum ₹10', 'Please enter at least ₹10 to top up.');
      return;
    }
    setStep('method');
  };

  const handlePay = () => {
    setStep('processing');
    setTimeout(() => {
      topup(authUsername, numericAmount, 'Wallet Top-Up');
      setStep('success');
    }, 1800);
  };

  const handleClose = () => {
    setStep('amount');
    setAmount('');
    setSelectedPreset(null);
    setSelectedMethod('upi');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        onPress={step === 'processing' ? undefined : handleClose}
      >
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 48 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 20 }} />

          {step === 'success' ? (
            <View style={{ paddingHorizontal: 24, paddingBottom: 8, alignItems: 'center', gap: 16 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.success + '20', alignItems: 'center', justifyContent: 'center' }}>
                <IconSymbol name="checkmark.circle.fill" size={44} color={colors.success} />
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground }}>Top-Up Successful!</Text>
              <Text style={{ fontSize: 15, color: colors.muted, textAlign: 'center' }}>
                ₹{numericAmount.toLocaleString()} has been added to your personal wallet.
              </Text>
              <TouchableOpacity onPress={handleClose} activeOpacity={0.8} style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', width: '100%' }}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : step === 'processing' ? (
            <View style={{ paddingHorizontal: 24, paddingBottom: 8, alignItems: 'center', gap: 16 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                <IconSymbol name="arrow.clockwise" size={36} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>Processing Payment…</Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>Please wait while we confirm your ₹{numericAmount.toLocaleString()} top-up.</Text>
            </View>
          ) : step === 'method' ? (
            <View style={{ paddingHorizontal: 20, gap: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable onPress={() => setStep('amount')} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
                </Pressable>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>Choose Payment Method</Text>
              </View>
              <View style={{ backgroundColor: colors.primaryLight, borderRadius: 14, padding: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>You are adding</Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>₹{numericAmount.toLocaleString()}</Text>
              </View>
              <View style={{ gap: 10 }}>
                {PAYMENT_METHODS.map(method => (
                  <Pressable key={method.id} onPress={() => setSelectedMethod(method.id)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                    <View style={[
                      { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 1.5 },
                      selectedMethod === method.id
                        ? { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                        : { borderColor: colors.border, backgroundColor: colors.background },
                    ]}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                        <IconSymbol name={method.icon as any} size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: selectedMethod === method.id ? colors.primary : colors.foreground }}>{method.label}</Text>
                        <Text style={{ fontSize: 12, color: colors.muted }}>{method.sublabel}</Text>
                      </View>
                      <View style={[{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }, { borderColor: selectedMethod === method.id ? colors.primary : colors.border }]}>
                        {selectedMethod === method.id && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
              <TouchableOpacity onPress={handlePay} activeOpacity={0.85} style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Pay ₹{numericAmount.toLocaleString()}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 20, gap: 20 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground }}>Top Up Wallet</Text>

              {/* Amount input */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Enter Amount</Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  borderWidth: 2, borderColor: numericAmount >= 10 ? colors.primary : colors.border,
                  borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
                  backgroundColor: colors.background, gap: 6,
                }}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primary }}>₹</Text>
                  <TextInput
                    value={amount}
                    onChangeText={handleCustomAmount}
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    style={{ flex: 1, fontSize: 28, fontWeight: '700', color: colors.foreground }}
                  />
                </View>
              </View>

              {/* Quick select presets */}
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Quick Select</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {TOPUP_PRESETS.map(preset => (
                    <Pressable key={preset} onPress={() => handlePreset(preset)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flex: 1 }]}>
                      <View style={[
                        { paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 2 },
                        selectedPreset === preset
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: selectedPreset === preset ? 'white' : colors.foreground }}>
                          ₹{preset >= 1000 ? `${preset / 1000}K` : preset}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
              <TouchableOpacity onPress={handleProceed} disabled={numericAmount < 10} activeOpacity={0.85} style={{ backgroundColor: numericAmount >= 10 ? colors.primary : colors.border, borderRadius: 16, paddingVertical: 16, alignItems: 'center', opacity: numericAmount < 10 ? 0.5 : 1 }}>
                <Text style={{ color: numericAmount >= 10 ? 'white' : colors.muted, fontWeight: '700', fontSize: 15 }}>
                  {numericAmount >= 10 ? `Proceed with ₹${numericAmount.toLocaleString()}` : 'Enter an amount'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Menu Item ────────────────────────────────────────────────────────────────
interface MenuItemProps {
  icon: any;
  label: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  iconColor?: string;
  iconBg?: string;
  rightBadge?: string;
  comingSoon?: boolean;
}

function MenuItem({ icon, label, subtitle, onPress, showChevron = true, iconColor, iconBg, rightBadge, comingSoon }: MenuItemProps) {
  const colors = useColors();
  return (
    <Pressable onPress={comingSoon ? undefined : onPress} style={({ pressed }) => [{ opacity: (pressed && !comingSoon) ? 0.7 : 1 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: iconBg || colors.primaryLight }}>
          <IconSymbol name={icon} size={18} color={iconColor || colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, color: comingSoon ? colors.muted : colors.foreground, fontWeight: '500' }}>{label}</Text>
          {subtitle && <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{subtitle}</Text>}
        </View>
        {comingSoon && (
          <View style={{ backgroundColor: colors.warning + '25', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.warning }}>Soon</Text>
          </View>
        )}
        {rightBadge && (
          <View style={{ backgroundColor: colors.primary + '20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{rightBadge}</Text>
          </View>
        )}
        {showChevron && !comingSoon && <IconSymbol name="chevron.right" size={16} color={colors.muted} />}
      </View>
    </Pressable>
  );
}

// ─── Account Screen ───────────────────────────────────────────────────────────
export default function AccountScreen() {
  const colors = useColors();
  const { user: authUser, login, logout, updateProfile } = useAuth();
  const { ventures, getMemberForUser } = useVentures();
  const { getBalance, getTransactions } = useWallet();
  const balance = authUser ? getBalance(authUser.username) : 0;
  const transactions = authUser ? getTransactions(authUser.username) : [];
  const [showTopUp, setShowTopUp] = useState(false);
  const [showSwitchUser, setShowSwitchUser] = useState(false);
  const [switchUsername, setSwitchUsername] = useState('');
  const [switchPassword, setSwitchPassword] = useState('');
  const [switchError, setSwitchError] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  // Profile edit fields
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [editPublicNamePref, setEditPublicNamePref] = useState<'username' | 'displayName'>('displayName');
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setAvatarUploading(true);
        try {
          const remoteUrl = await uploadImage(result.assets[0].uri, 'avatar');
          await updateProfile({ avatar: remoteUrl });
        } catch (err: any) {
          Alert.alert('Upload failed', err?.message ?? 'Could not upload photo.');
        } finally {
          setAvatarUploading(false);
        }
      }
    } catch {
      Alert.alert('Photo', 'Could not access photo library.');
    }
  };

  const user = authUser
    ? { ...MOCK_USER, name: authUser.displayName, handle: `@${authUser.username}`, avatar: authUser.avatar, city: authUser.city }
    : MOCK_USER;

  const myVentures = authUser
    ? ventures.filter(v => getMemberForUser(v.id, authUser.username) !== null)
    : ventures.filter(v => v.myRole !== undefined);
  const completedVentures = myVentures.filter(v => v.status === 'finished');

  const handleSwitchUser = async () => {
    setSwitchError('');
    const result = await login(switchUsername.trim(), switchPassword);
    if (result.success) {
      setSwitchUsername('');
      setSwitchPassword('');
      setShowSwitchUser(false);
    } else {
      setSwitchError(result.error ?? 'Invalid credentials');
    }
  };

  const handleOpenProfile = () => {
    setEditDisplayName(authUser?.displayName ?? '');
    setEditCity(authUser?.city ?? '');
    setEditAbout(authUser?.about ?? '');
    setEditPublicNamePref(authUser?.publicNamePref ?? 'displayName');
    setShowProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim()) {
      Alert.alert('Name required', 'Please enter your display name.');
      return;
    }
    setProfileSaving(true);
    await updateProfile({
      displayName: editDisplayName.trim(),
      city: editCity.trim(),
      about: editAbout.trim(),
      publicNamePref: editPublicNamePref,
    });
    setProfileSaving(false);
    setShowProfile(false);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.foreground }}>Account</Text>
        </View>

        {/* Profile card */}
        <View style={{ marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {user.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.primary }}
              />
            ) : (
              <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.primary, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                <IconSymbol name="person.fill" size={36} color={colors.muted} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>{user.name}</Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2 }}>{user.handle}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{user.city}</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>Member since {user.joinedDate}</Text>
            </View>
          </View>
          {(authUser?.about || user.bio) ? (
            <Text style={{ fontSize: 14, color: colors.muted, marginTop: 12, lineHeight: 20 }}>{authUser?.about || user.bio}</Text>
          ) : null}
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 16, gap: 12 }}>
          {[
            { label: 'Ventures\nCompleted', value: completedVentures.length || user.venturesCompleted, icon: 'trophy.fill' as const, color: colors.accent },
            { label: 'Kg Trash\nCollected', value: user.kgCollected, icon: 'trash.fill' as const, color: colors.primary },
            { label: 'Badges\nEarned', value: user.badgesEarned, icon: 'star.fill' as const, color: '#8B5CF6' },
          ].map(stat => (
            <View key={stat.label} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 4 }}>
              <IconSymbol name={stat.icon} size={20} color={stat.color} />
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>{stat.value}</Text>
              <Text style={{ fontSize: 11, color: colors.muted, textAlign: 'center' }} numberOfLines={2}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Wallet card */}
        <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          <View style={{ backgroundColor: colors.primary, padding: 16, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconSymbol name="wallet.pass.fill" size={18} color="white" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' }}>Personal Wallet</Text>
              </View>
              <Pressable onPress={() => setShowTopUp(true)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <IconSymbol name="plus" size={13} color="white" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: 'white' }}>Top Up</Text>
                </View>
              </Pressable>
            </View>
            <Text style={{ fontSize: 32, fontWeight: '800', color: 'white', marginTop: 4 }}>₹{balance.toLocaleString()}</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Available balance</Text>
          </View>

          {transactions.length > 0 && (
            <View>
              <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent Transactions</Text>
              </View>
              {transactions.slice(0, 3).map((tx, index) => (
                <View key={tx.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: tx.type === 'topup' ? colors.success + '20' : colors.error + '15', alignItems: 'center', justifyContent: 'center' }}>
                      <IconSymbol
                        name={tx.type === 'topup' ? 'arrow.down.circle.fill' : 'arrow.up.circle.fill'}
                        size={16}
                        color={tx.type === 'topup' ? colors.success : colors.error}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: colors.foreground }}>{tx.label}</Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>{new Date(tx.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: tx.type === 'topup' ? colors.success : colors.error }}>
                      {tx.type === 'topup' ? '+' : '−'}₹{tx.amount.toLocaleString()}
                    </Text>
                  </View>
                  {index < Math.min(transactions.length, 3) - 1 && <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Badges */}
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 12 }}>My Badges</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {user.badges.map(badge => (
              <View key={badge.id} style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: badge.color + '20' }}>
                  <Text style={{ fontSize: 26 }}>{badge.icon}</Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.muted, textAlign: 'center', maxWidth: 56 }} numberOfLines={2}>
                  {badge.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Menu sections */}
        <View style={{ marginHorizontal: 16, marginTop: 20, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Profile</Text>
          </View>
          <MenuItem icon="person.fill" label="User Profile" subtitle="Edit your public profile" onPress={handleOpenProfile} />
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
          <MenuItem icon="trophy.fill" label="Shuddh Stats" subtitle="Your impact and achievements" onPress={() => {}} iconColor={colors.accent} iconBg={colors.accent + '20'} comingSoon />
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>App</Text>
          </View>
          <MenuItem icon="wallet.pass.fill" label="Top Up Wallet" subtitle={`Balance: ₹${balance.toLocaleString()}`} onPress={() => setShowTopUp(true)} iconColor="#3B82F6" iconBg="#EFF6FF" rightBadge="+ Add" />
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
          <MenuItem icon="bell.fill" label="Notifications" subtitle="Manage your alerts" onPress={() => {}} iconColor={colors.warning} iconBg={colors.warning + '20'} comingSoon />
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
          <MenuItem icon="gear" label="Settings" onPress={() => {}} iconColor={colors.muted} iconBg={colors.border} comingSoon />
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Support</Text>
          </View>
          <MenuItem icon="questionmark.circle" label="Help & Legal" onPress={() => {}} iconColor={colors.muted} iconBg={colors.border} comingSoon />
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
          <MenuItem icon="doc.text.fill" label="About CleanVentures" onPress={() => setShowAbout(true)} iconColor={colors.primary} iconBg={colors.primaryLight} />
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          <MenuItem icon="person.2.fill" label="Switch User" subtitle={authUser ? `Signed in as ${authUser.username}` : 'Switch demo account'} onPress={() => setShowSwitchUser(true)} showChevron={false} iconColor="#6366F1" iconBg="#EEF2FF" />
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
          <MenuItem icon="arrow.left" label="Sign Out" onPress={() => logout()} showChevron={false} iconColor={colors.error} iconBg={colors.error + '20'} />
        </View>
      </ScrollView>

      <TopUpSheet visible={showTopUp} onClose={() => setShowTopUp(false)} authUsername={authUser?.username ?? ''} />

      {/* ─── User Profile Edit Modal ─── */}
      <Modal visible={showProfile} transparent animationType="slide" onRequestClose={() => setShowProfile(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowProfile(false)}>
            <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 20 }} />
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 18, paddingBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground }}>Edit Profile</Text>
                  <Pressable onPress={() => setShowProfile(false)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                    <IconSymbol name="xmark.circle.fill" size={26} color={colors.muted} />
                  </Pressable>
                </View>

                {/* Avatar upload */}
                <Pressable onPress={handlePickAvatar} disabled={avatarUploading} style={({ pressed }) => [{ opacity: (pressed || avatarUploading) ? 0.7 : 1, alignItems: 'center', gap: 8 }]}>
                  <View style={{ position: 'relative' }}>
                    {authUser?.avatar ? (
                      <Image source={{ uri: authUser.avatar }} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.primary }} />
                    ) : (
                      <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.primary, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                        <IconSymbol name="person.fill" size={36} color={colors.muted} />
                      </View>
                    )}
                    <View style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface }}>
                      {avatarUploading ? <ActivityIndicator size="small" color="white" /> : <IconSymbol name="camera.fill" size={12} color="white" />}
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>{avatarUploading ? 'Uploading…' : 'Tap to change photo'}</Text>
                </Pressable>

                {/* Display Name */}
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>Display Name</Text>
                  <View style={{ backgroundColor: colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12 }}>
                    <TextInput value={editDisplayName} onChangeText={setEditDisplayName} placeholder="Your full name" placeholderTextColor={colors.muted} style={{ fontSize: 15, color: colors.foreground }} />
                  </View>
                </View>

                {/* Username (read-only) */}
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>Username</Text>
                  <View style={{ backgroundColor: colors.border + '40', borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 15, color: colors.muted, flex: 1 }}>@{authUser?.username}</Text>
                    <View style={{ backgroundColor: colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '600' }}>Fixed</Text>
                    </View>
                  </View>
                </View>

                {/* Location */}
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>Location</Text>
                  <View style={{ backgroundColor: colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12 }}>
                    <TextInput value={editCity} onChangeText={setEditCity} placeholder="City, State" placeholderTextColor={colors.muted} style={{ fontSize: 15, color: colors.foreground }} />
                  </View>
                </View>

                {/* About */}
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>About</Text>
                  <View style={{ backgroundColor: colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12 }}>
                    <TextInput
                      value={editAbout}
                      onChangeText={setEditAbout}
                      placeholder="Tell the community about yourself…"
                      placeholderTextColor={colors.muted}
                      multiline
                      numberOfLines={3}
                      style={{ fontSize: 15, color: colors.foreground, minHeight: 72, textAlignVertical: 'top' }}
                    />
                  </View>
                </View>

                {/* Public name preference */}
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>Display Name to Public</Text>
                  {(['displayName', 'username'] as const).map(pref => (
                    <Pressable key={pref} onPress={() => setEditPublicNamePref(pref)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                      <View style={[
                        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
                        editPublicNamePref === pref
                          ? { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                          : { borderColor: colors.border, backgroundColor: colors.background },
                      ]}>
                        <View style={[{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }, { borderColor: editPublicNamePref === pref ? colors.primary : colors.border }]}>
                          {editPublicNamePref === pref && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: editPublicNamePref === pref ? colors.primary : colors.foreground }}>
                            {pref === 'displayName' ? 'Full name' : 'Username'}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.muted }}>
                            {pref === 'displayName' ? `Show as "${editDisplayName || authUser?.displayName}"` : `Show as "@${authUser?.username}"`}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>

                {/* Save button */}
                <TouchableOpacity onPress={handleSaveProfile} disabled={profileSaving} activeOpacity={0.7} style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4, opacity: profileSaving ? 0.7 : 1 }}>
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{profileSaving ? 'Saving…' : 'Save Profile'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── About CleanVentures Modal ─── */}
      <Modal visible={showAbout} transparent animationType="slide" onRequestClose={() => setShowAbout(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowAbout(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 48 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>🌿</Text>
              </View>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground }}>CleanVentures</Text>
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>Community. Action. Impact.</Text>
              </View>
            </View>
            <Text style={{ fontSize: 15, color: colors.foreground, lineHeight: 24, marginBottom: 16 }}>
              CleanVentures is a community-driven platform that brings neighbours, volunteers, and local organisations together to make the world a cleaner, greener place — one neighbourhood at a time.
            </Text>
            <View style={{ gap: 12, marginBottom: 20 }}>
              {[
                { icon: '🗺️', title: 'Organise Cleanups', desc: 'Create or join local cleanup ventures with goals, tasks, and budgets.' },
                { icon: '🛒', title: 'Source Supplies', desc: 'Order gloves, bags, tools and more — paid from shared venture wallets.' },
                { icon: '👥', title: 'Build a Team', desc: 'Invite co-owners, buyers and volunteers to collaborate on each venture.' },
                { icon: '📊', title: 'Track Impact', desc: 'Log trash collected, tasks completed, and celebrate milestones together.' },
              ].map(item => (
                <View key={item.title} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 22, marginTop: 1 }}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{item.title}</Text>
                    <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 20 }}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={() => setShowAbout(false)} activeOpacity={0.8} style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Got it!</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Switch User Modal */}
      <Modal visible={showSwitchUser} transparent animationType="slide" onRequestClose={() => setShowSwitchUser(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowSwitchUser(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground, marginBottom: 4 }}>Switch Account</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 16 }}>Sign in with a different account</Text>
            <View style={{ gap: 12 }}>
              <View style={{ backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '600', marginBottom: 4 }}>EMAIL OR USERNAME</Text>
                <TextInput value={switchUsername} onChangeText={setSwitchUsername} placeholder="your@email.com or username" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" style={{ fontSize: 15, color: colors.foreground }} returnKeyType="next" />
              </View>
              <View style={{ backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '600', marginBottom: 4 }}>PASSWORD</Text>
                <TextInput value={switchPassword} onChangeText={setSwitchPassword} placeholder="Enter password" placeholderTextColor={colors.muted} secureTextEntry style={{ fontSize: 15, color: colors.foreground }} returnKeyType="done" onSubmitEditing={handleSwitchUser} />
              </View>
              {switchError ? <Text style={{ fontSize: 13, color: colors.error, textAlign: 'center' }}>{switchError}</Text> : null}
              <TouchableOpacity onPress={handleSwitchUser} activeOpacity={0.85} style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Switch Account</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}
