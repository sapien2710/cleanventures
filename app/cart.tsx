import { useCallback, useMemo, useState } from "react";
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

// ─── Order History Item ───────────────────────────────────────────────────────
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

  // Group pending items by wallet destination
  const pendingItems = items.filter(i => i.status === 'pending');
  const purchasedItems = items.filter(i => i.status === 'purchased');

  // Build wallet options: personal + ventures where user is buyer or co-owner
  const myVentures = useMemo(() => {
    if (!cartAuthUser) return [];
    return ventures.filter(v => {
      if (v.status !== 'proposed' && v.status !== 'ongoing') return false;
      const member = getMemberForUser(v.id, cartAuthUser.username);
      // Legacy fallback: check ownerName contains username
      const isLegacyOwner = !member &&
        (v.ownerName === cartAuthUser.displayName ||
         v.ownerName?.toLowerCase().includes(cartAuthUser.username.toLowerCase()));
      if (isLegacyOwner) return true;
      return member?.privilege === 'co-owner' || member?.privilege === 'buyer' || member?.isOwner;
    });
  }, [ventures, cartAuthUser, getMemberForUser]);

  // Compute venture wallet balance from transactions (not stale currentFunding field)
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

  // Items for the selected wallet
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
            const itemNames = walletItems.slice(0, 2).map(i => i.name).join(', ');
            const moreItems = itemCount > 2 ? ` +${itemCount - 2} more` : '';
            if (selectedWalletKey === 'personal') {
              if (cartAuthUser) deductPersonal(cartAuthUser.username, total, 'Cart Checkout');
              checkoutPersonal();
              addNotification({
                type: 'general',
                title: 'Order Placed',
                body: `₹${total} paid from Personal Wallet for ${itemNames}${moreItems}.`,
              });
            } else {
              // Deduct from venture wallet by adding a negative transaction
              addVentureTx(selectedWalletKey, {
                id: `tx-cart-${Date.now()}`,
                ventureId: selectedWalletKey,
                type: 'purchase',
                amount: -total,
                description: 'Supplies purchase',
                timestamp: new Date().toISOString(),
                username: cartAuthUser?.displayName ?? 'Unknown',
              });
              checkoutVenture(selectedWalletKey);
              const ventureName = selectedWallet?.label ?? 'venture';
              addNotification({
                type: 'general',
                title: 'Order Placed',
                body: `₹${total} paid from ${ventureName} wallet for ${itemNames}${moreItems}.`,
                ventureId: selectedWalletKey,
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
      <View className="flex-row items-center px-4 py-3 gap-3 border-b" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-lg font-bold flex-1" style={{ color: colors.foreground }}>Cart</Text>
        {pendingCount > 0 && (
          <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: colors.primary }}>
            <Text className="text-xs font-bold" style={{ color: 'white' }}>{pendingCount} pending</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View className="flex-row border-b" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        {(['checkout', 'history'] as CartTab[]).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flex: 1 }]}
          >
            <View style={{ paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === tab ? colors.primary : 'transparent' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', textTransform: 'capitalize', color: activeTab === tab ? colors.primary : colors.muted }}>
                {tab === 'checkout' ? 'Checkout' : 'Order History'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {activeTab === 'checkout' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>

          {/* Success banner */}
          {checkedOut && (
            <View style={{ backgroundColor: colors.success + '18', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.success + '40' }}>
              <IconSymbol name="checkmark.circle.fill" size={28} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.success }}>Order Placed!</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Items marked as Purchased in Supplies tab.</Text>
              </View>
            </View>
          )}

          {/* Wallet selector */}
          <View className="gap-3">
            <Text className="text-base font-bold" style={{ color: colors.foreground }}>Pay From Wallet</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {walletOptions.map(wallet => (
                <Pressable
                  key={wallet.key}
                  onPress={() => setSelectedWalletKey(wallet.key)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[
                    { minWidth: 160, padding: 14, borderRadius: 16, borderWidth: 1.5, gap: 6 },
                    selectedWalletKey === wallet.key
                      ? { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                      : { borderColor: colors.border, backgroundColor: colors.surface },
                  ]}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: selectedWalletKey === wallet.key ? colors.primary : colors.foreground }} numberOfLines={1}>
                      {wallet.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted }} numberOfLines={1}>{wallet.sublabel}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: wallet.balance > 0 ? colors.success : colors.error }} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: wallet.balance > 0 ? colors.success : colors.error }}>
                        ₹{wallet.balance.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Items for selected wallet */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold" style={{ color: colors.foreground }}>
                {selectedWallet?.label} Items
              </Text>
              <Text className="text-xs" style={{ color: colors.muted }}>{walletItems.length} item{walletItems.length !== 1 ? 's' : ''}</Text>
            </View>

            {walletItems.length === 0 ? (
              <View className="rounded-2xl border p-8 items-center gap-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <IconSymbol name="cart.fill" size={32} color={colors.muted} />
                <Text className="text-sm text-center" style={{ color: colors.muted }}>No pending items for this wallet.</Text>
                <Text className="text-xs text-center" style={{ color: colors.muted }}>Add products or services from the Market tab.</Text>
              </View>
            ) : (
              <View className="rounded-2xl border overflow-hidden" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                {walletItems.map((item, index) => (
                  <View key={item.id}>
                    <View className="flex-row items-center px-4 py-3 gap-3">
                      <Image source={{ uri: item.image }} style={{ width: 44, height: 44, borderRadius: 10 }} resizeMode="cover" />
                      <View className="flex-1 gap-0.5">
                        <Text className="text-sm font-semibold" style={{ color: colors.foreground }} numberOfLines={1}>{item.name}</Text>
                        {item.itemType === 'service' && (item as any).scheduledDate && (
                          <View className="flex-row items-center gap-1">
                            <IconSymbol name="calendar" size={10} color={colors.muted} />
                            <Text className="text-xs" style={{ color: colors.muted }}>{(item as any).scheduledDate}</Text>
                          </View>
                        )}
                        {/* Quantity stepper */}
                        {item.itemType === 'product' && (
                          <View className="flex-row items-center gap-2 mt-1">
                            <Pressable
                              onPress={() => item.quantity <= 1 ? removeFromCart(item.id) : updateQty(item.id, item.quantity - 1)}
                              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                            >
                              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 14, color: item.quantity <= 1 ? colors.error : colors.foreground, lineHeight: 18 }}>{item.quantity <= 1 ? '×' : '−'}</Text>
                              </View>
                            </Pressable>
                            <Text className="text-xs font-bold" style={{ color: colors.foreground }}>{item.quantity}</Text>
                            <Pressable
                              onPress={() => updateQty(item.id, item.quantity + 1)}
                              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                            >
                              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 14, color: 'white', lineHeight: 18 }}>+</Text>
                              </View>
                            </Pressable>
                          </View>
                        )}
                      </View>
                      <View className="items-end gap-1">
                        <Text className="text-sm font-bold" style={{ color: colors.foreground }}>₹{item.price * item.quantity}</Text>
                        <Pressable onPress={() => removeFromCart(item.id)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                          <IconSymbol name="trash.fill" size={14} color={colors.error} />
                        </Pressable>
                      </View>
                    </View>
                    {index < walletItems.length - 1 && <View className="h-px mx-4" style={{ backgroundColor: colors.border }} />}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Order summary */}
          {hasItems && (
            <View className="rounded-2xl border overflow-hidden" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <View className="px-4 py-2.5 border-b" style={{ borderColor: colors.border }}>
                <Text className="text-sm font-bold" style={{ color: colors.foreground }}>Order Summary</Text>
              </View>
              {[
                { label: 'Subtotal', value: `₹${subtotal}` },
                { label: 'Delivery', value: `₹${delivery}` },
              ].map(row => (
                <View key={row.label} className="flex-row justify-between px-4 py-2.5">
                  <Text className="text-sm" style={{ color: colors.muted }}>{row.label}</Text>
                  <Text className="text-sm" style={{ color: colors.foreground }}>{row.value}</Text>
                </View>
              ))}
              <View className="h-px mx-4" style={{ backgroundColor: colors.border }} />
              <View className="flex-row justify-between px-4 py-3">
                <Text className="text-base font-bold" style={{ color: colors.foreground }}>Total</Text>
                <Text className="text-base font-bold" style={{ color: colors.primary }}>₹{total}</Text>
              </View>
            </View>
          )}

          {/* Insufficient funds warning */}
          {hasItems && !hasEnoughFunds && (
            <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.error} />
              <Text className="text-xs flex-1" style={{ color: colors.error }}>Insufficient funds. Top up your wallet from the Account screen.</Text>
            </View>
          )}

          {/* CTA */}
          <Pressable
            onPress={handleCheckout}
            disabled={!hasItems || !hasEnoughFunds}
            style={({ pressed }) => [{ opacity: (pressed || !hasItems || !hasEnoughFunds) ? 0.5 : 1 }]}
          >
            <View style={{ backgroundColor: hasItems && hasEnoughFunds ? colors.primary : colors.border, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: hasItems && hasEnoughFunds ? 'white' : colors.muted }}>
                {hasItems ? `Pay ₹${total}` : 'No items to checkout'}
              </Text>
            </View>
          </Pressable>

          {/* Purchased items section */}
          {purchasedItems.length > 0 && (
            <View className="gap-3">
              <Text className="text-base font-bold" style={{ color: colors.foreground }}>Purchased Items</Text>
              <View className="rounded-2xl border overflow-hidden" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                {purchasedItems.map((item, index) => (
                  <View key={item.id}>
                    <View className="flex-row items-center px-4 py-3 gap-3">
                      <Image source={{ uri: item.image }} style={{ width: 40, height: 40, borderRadius: 8, opacity: 0.7 }} resizeMode="cover" />
                      <View className="flex-1">
                        <Text className="text-sm" style={{ color: colors.muted }} numberOfLines={1}>{item.name}</Text>
                        {item.ventureName && <Text className="text-xs" style={{ color: colors.muted }}>{item.ventureName}</Text>}
                      </View>
                      <View style={{ backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text className="text-xs font-semibold" style={{ color: colors.success }}>Purchased</Text>
                      </View>
                    </View>
                    {index < purchasedItems.length - 1 && <View className="h-px mx-4" style={{ backgroundColor: colors.border }} />}
                  </View>
                ))}
              </View>
            </View>
          )}

          <Text className="text-xs text-center" style={{ color: colors.muted }}>
            By placing this order, you agree to community cleanup rules.
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={STATIC_ORDER_HISTORY}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View className="rounded-2xl p-4 border gap-2" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold" style={{ color: colors.foreground }}>{item.date}</Text>
                <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: (item.status === 'Delivered' || item.status === 'Completed') ? 'rgba(34,197,94,0.15)' : 'rgba(245,166,35,0.15)' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: (item.status === 'Delivered' || item.status === 'Completed') ? colors.success : colors.warning }}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text className="text-sm" style={{ color: colors.muted }}>{item.items}</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs" style={{ color: colors.muted }}>{item.wallet}</Text>
                <Text className="text-base font-bold" style={{ color: colors.primary }}>₹{item.total}</Text>
              </View>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}
