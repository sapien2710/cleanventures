import { useState, useMemo, useCallback } from "react";
import { Alert, FlatList, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useCart } from "@/lib/cart-store";
import { useVentures } from "@/lib/ventures-store";
import { useWallet } from "@/lib/wallet-store";
import { useAuth } from "@/lib/auth-store";
import { useNotifications } from "@/lib/notifications-store";

type CartTab = 'checkout' | 'history';

const STATIC_ORDER_HISTORY = [
  { id: 'o1', date: 'Feb 18, 2026', items: 'Gloves ×4, Masks ×2', total: 420, wallet: 'Personal Wallet', status: 'Delivered' },
  { id: 'o2', date: 'Feb 10, 2026', items: 'Trash Bags ×3', total: 240, wallet: 'LBS Road Cleanup', status: 'Delivered' },
  { id: 'o3', date: 'Jan 28, 2026', items: 'Trash Pickup Service', total: 500, wallet: 'Personal Wallet', status: 'Completed' },
];

export default function CartScreen() {
  const router = useRouter();
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<CartTab>('checkout');
  const [selectedWalletKey, setSelectedWalletKey] = useState<string>('personal');
  const [checkedOut, setCheckedOut] = useState(false);

  const { items, removeFromCart, updateQty, checkoutVenture, checkoutPersonal, getPersonalItems, pendingCount } = useCart();
  const { ventures, addVentureTx, getMemberForUser, getVentureTxs } = useVentures();
  const { getBalance, deduct: deductPersonal } = useWallet();
  const { user: cartAuthUser } = useAuth();
  const { addNotification } = useNotifications();
  const personalBalance = cartAuthUser ? getBalance(cartAuthUser.username) : 0;

  const pendingItems = items.filter(i => i.status === 'pending');
  const purchasedItems = items.filter(i => i.status === 'purchased');

  const myVentures = useMemo(() => {
    if (!cartAuthUser) return [];
    return ventures.filter(v => {
      if (v.status !== 'proposed' && v.status !== 'ongoing') return false;
      const member = getMemberForUser(v.id, cartAuthUser.username);
      const isLegacyOwner = !member &&
        (v.ownerName === cartAuthUser.displayName ||
         v.ownerName?.toLowerCase().includes(cartAuthUser.username.toLowerCase()));
      if (isLegacyOwner) return true;
      return member?.privilege === 'co-owner' || member?.privilege === 'buyer' || member?.isOwner;
    });
  }, [ventures, cartAuthUser, getMemberForUser]);

  const getVentureBalance = useCallback((ventureId: string): number => {
    const txs = getVentureTxs(ventureId);
    return txs.reduce((sum, tx) => sum + tx.amount, 0);
  }, [getVentureTxs]);

  const walletOptions = useMemo(() => {
    const opts: { key: string; label: string; sublabel: string; balance: number; ventureId: string | null }[] = [
      { key: 'personal', label: 'Personal Wallet', sublabel: 'Your personal funds', balance: personalBalance, ventureId: null },
      ...myVentures.map(v => ({
        key: v.id,
        label: v.name,
        sublabel: v.location,
        balance: getVentureBalance(v.id),
        ventureId: v.id,
      })),
    ];
    return opts;
  }, [myVentures, personalBalance, getVentureBalance]);

  const walletItems = selectedWalletKey === 'personal'
    ? pendingItems.filter(i => i.ventureId === null)
    : pendingItems.filter(i => i.ventureId === selectedWalletKey);

  const selectedWallet = walletOptions.find(w => w.key === selectedWalletKey);
  const subtotal = walletItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const delivery = walletItems.length > 0 ? 50 : 0;
  const total = subtotal + delivery;
  const hasEnoughFunds = (selectedWallet?.balance ?? 0) >= total;
  const hasItems = walletItems.length > 0;

  const handleCheckout = () => {
    if (!hasItems || !hasEnoughFunds) return;
    Alert.alert(
      'Confirm Order',
      `Pay ₹${total} from ${selectedWallet?.label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            const itemCount = walletItems.length;
            if (selectedWallet?.ventureId) {
              checkoutVenture(selectedWallet.ventureId);
              addVentureTx(selectedWallet.ventureId, {
                id: `tx-${Date.now()}`,
                type: 'debit',
                amount: -total,
                description: `Market purchase (${itemCount} item${itemCount !== 1 ? 's' : ''})`,
                date: new Date().toISOString().split('T')[0],
              });
            } else {
              checkoutPersonal();
              deductPersonal(cartAuthUser!.username, total);
            }
            if (cartAuthUser) {
              addNotification({
                id: `notif-${Date.now()}`,
                type: 'order',
                title: 'Order Placed!',
                message: `₹${total} paid from ${selectedWallet?.label}. ${itemCount} item${itemCount !== 1 ? 's' : ''} ordered.`,
                timestamp: new Date().toISOString(),
                read: false,
              });
            }
            setCheckedOut(true);
            setTimeout(() => setCheckedOut(false), 3000);
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14, gap: 12,
        borderBottomWidth: 1, borderColor: colors.border,
        backgroundColor: colors.surface,
      }}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '700', flex: 1, color: colors.foreground }}>Cart</Text>
        {pendingCount > 0 && (
          <View style={{ backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: 'white' }}>{pendingCount} pending</Text>
          </View>
        )}
      </View>

      {/* Tab switcher - pill style */}
      <View style={{
        flexDirection: 'row', marginHorizontal: 16, marginVertical: 12,
        backgroundColor: colors.surface, borderRadius: 14, padding: 4,
        borderWidth: 1, borderColor: colors.border,
      }}>
        {(['checkout', 'history'] as CartTab[]).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={[
              { borderRadius: 10, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
              activeTab === tab
                ? { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 4, elevation: 4 }
                : { backgroundColor: 'transparent' },
            ]}>
              <Text style={{
                fontSize: 14, fontWeight: activeTab === tab ? '700' : '500',
                color: activeTab === tab ? 'white' : colors.muted,
                letterSpacing: 0.1,
              }}>
                {tab === 'checkout' ? 'Checkout' : 'Order History'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {activeTab === 'checkout' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 48 }}>

          {/* Success banner */}
          {checkedOut && (
            <View style={{
              backgroundColor: colors.success + '18', borderRadius: 16, padding: 16,
              flexDirection: 'row', alignItems: 'center', gap: 12,
              borderWidth: 1.5, borderColor: colors.success + '40',
            }}>
              <IconSymbol name="checkmark.circle.fill" size={28} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.success }}>Order Placed!</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Items marked as Purchased in Supplies tab.</Text>
              </View>
            </View>
          )}

          {/* Wallet selector */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Pay From Wallet</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {walletOptions.map(wallet => (
                <Pressable
                  key={wallet.key}
                  onPress={() => setSelectedWalletKey(wallet.key)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[
                    { width: 168, padding: 14, borderRadius: 16, borderWidth: 1.5, gap: 4 },
                    selectedWalletKey === wallet.key
                      ? { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                      : { borderColor: colors.border, backgroundColor: colors.surface },
                  ]}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: selectedWalletKey === wallet.key ? colors.primary : colors.foreground }} numberOfLines={1}>
                      {wallet.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted }} numberOfLines={1}>{wallet.sublabel}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: wallet.balance > 0 ? colors.success : colors.error }} />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: wallet.balance > 0 ? colors.success : colors.error }}>
                        ₹{wallet.balance.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Items section */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {selectedWallet?.label} Items
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>{walletItems.length} item{walletItems.length !== 1 ? 's' : ''}</Text>
            </View>

            {walletItems.length === 0 ? (
              <View style={{
                borderRadius: 16, borderWidth: 1, padding: 32,
                alignItems: 'center', gap: 10,
                backgroundColor: colors.surface, borderColor: colors.border,
              }}>
                <IconSymbol name="cart.fill" size={36} color={colors.muted} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>No items yet</Text>
                <Text style={{ fontSize: 12, textAlign: 'center', color: colors.muted, lineHeight: 18 }}>
                  Add products or services from the Market tab.
                </Text>
              </View>
            ) : (
              <View style={{ borderRadius: 16, borderWidth: 1, overflow: 'hidden', backgroundColor: colors.surface, borderColor: colors.border }}>
                {walletItems.map((item, index) => (
                  <View key={item.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 }}>
                      <Image source={{ uri: item.image }} style={{ width: 48, height: 48, borderRadius: 10 }} resizeMode="cover" />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>{item.name}</Text>
                        {item.itemType === 'service' && (item as any).scheduledDate && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <IconSymbol name="calendar" size={10} color={colors.muted} />
                            <Text style={{ fontSize: 11, color: colors.muted }}>{(item as any).scheduledDate}</Text>
                          </View>
                        )}
                        {item.itemType === 'product' && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
                            <Pressable
                              onPress={() => item.quantity <= 1 ? removeFromCart(item.id) : updateQty(item.id, item.quantity - 1)}
                              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                            >
                              <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 15, color: item.quantity <= 1 ? colors.error : colors.foreground, lineHeight: 20 }}>{item.quantity <= 1 ? '×' : '−'}</Text>
                              </View>
                            </Pressable>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground, minWidth: 20, textAlign: 'center' }}>{item.quantity}</Text>
                            <Pressable
                              onPress={() => updateQty(item.id, item.quantity + 1)}
                              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                            >
                              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 15, color: 'white', lineHeight: 20 }}>+</Text>
                              </View>
                            </Pressable>
                          </View>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>₹{item.price * item.quantity}</Text>
                        <Pressable onPress={() => removeFromCart(item.id)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                          <IconSymbol name="trash.fill" size={14} color={colors.error} />
                        </Pressable>
                      </View>
                    </View>
                    {index < walletItems.length - 1 && (
                      <View style={{ height: 1, marginHorizontal: 14, backgroundColor: colors.border }} />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Order summary */}
          {hasItems && (
            <View style={{ borderRadius: 16, borderWidth: 1, overflow: 'hidden', backgroundColor: colors.surface, borderColor: colors.border }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>Order Summary</Text>
              </View>
              {[
                { label: 'Subtotal', value: `₹${subtotal}` },
                { label: 'Delivery', value: `₹${delivery}` },
              ].map(row => (
                <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 13, color: colors.muted }}>{row.label}</Text>
                  <Text style={{ fontSize: 13, color: colors.foreground }}>{row.value}</Text>
                </View>
              ))}
              <View style={{ height: 1, marginHorizontal: 16, backgroundColor: colors.border }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Total</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>₹{total}</Text>
              </View>
            </View>
          )}

          {/* Insufficient funds */}
          {hasItems && !hasEnoughFunds && (
            <View style={{
              backgroundColor: colors.error + '15', borderRadius: 12, padding: 12,
              flexDirection: 'row', gap: 8, alignItems: 'center',
              borderWidth: 1, borderColor: colors.error + '30',
            }}>
              <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.error} />
              <Text style={{ fontSize: 12, flex: 1, color: colors.error, lineHeight: 17 }}>
                Insufficient funds. Top up your wallet from the Account screen.
              </Text>
            </View>
          )}

          {/* CTA */}
          <Pressable
            onPress={handleCheckout}
            disabled={!hasItems || !hasEnoughFunds}
            style={({ pressed }) => [{ opacity: (pressed || !hasItems || !hasEnoughFunds) ? 0.5 : 1 }]}
          >
            <View style={{
              backgroundColor: hasItems && hasEnoughFunds ? colors.primary : colors.surface,
              borderRadius: 16, paddingVertical: 16, alignItems: 'center',
              borderWidth: 1, borderColor: hasItems && hasEnoughFunds ? colors.primary : colors.border,
            }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: hasItems && hasEnoughFunds ? 'white' : colors.muted }}>
                {hasItems ? (hasEnoughFunds ? `Pay ₹${total}` : 'Insufficient Funds') : 'No items to checkout'}
              </Text>
            </View>
          </Pressable>

          {/* Purchased items */}
          {purchasedItems.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Purchased</Text>
              <View style={{ borderRadius: 16, borderWidth: 1, overflow: 'hidden', backgroundColor: colors.surface, borderColor: colors.border }}>
                {purchasedItems.map((item, index) => (
                  <View key={item.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 }}>
                      <Image source={{ uri: item.image }} style={{ width: 40, height: 40, borderRadius: 8, opacity: 0.6 }} resizeMode="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: colors.muted }} numberOfLines={1}>{item.name}</Text>
                        {item.ventureName && <Text style={{ fontSize: 11, color: colors.muted }}>{item.ventureName}</Text>}
                      </View>
                      <View style={{ backgroundColor: colors.success + '20', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.success }}>Purchased</Text>
                      </View>
                    </View>
                    {index < purchasedItems.length - 1 && (
                      <View style={{ height: 1, marginHorizontal: 14, backgroundColor: colors.border }} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          <Text style={{ fontSize: 11, textAlign: 'center', color: colors.muted }}>
            By placing this order, you agree to community cleanup rules.
          </Text>
        </ScrollView>
      ) : (
        /* Order History Tab */
        <FlatList
          data={STATIC_ORDER_HISTORY}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
              Recent Orders
            </Text>
          }
          renderItem={({ item }) => {
            const isComplete = item.status === 'Delivered' || item.status === 'Completed';
            return (
              <View style={{
                borderRadius: 16, borderWidth: 1,
                backgroundColor: colors.surface, borderColor: colors.border,
                overflow: 'hidden',
              }}>
                {/* Order header row */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 16, paddingVertical: 12,
                  borderBottomWidth: 1, borderColor: colors.border,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: isComplete ? colors.success + '20' : colors.warning + '20',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <IconSymbol
                        name={isComplete ? "checkmark.circle.fill" : "clock.fill"}
                        size={16}
                        color={isComplete ? colors.success : colors.warning}
                      />
                    </View>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>{item.date}</Text>
                      <Text style={{ fontSize: 11, color: colors.muted }}>{item.wallet}</Text>
                    </View>
                  </View>
                  <View style={{
                    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                    backgroundColor: isComplete ? colors.success + '18' : colors.warning + '18',
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isComplete ? colors.success : colors.warning }}>
                      {item.status}
                    </Text>
                  </View>
                </View>
                {/* Order body */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: colors.muted, flex: 1, marginRight: 12 }} numberOfLines={2}>{item.items}</Text>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.primary }}>₹{item.total}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}
