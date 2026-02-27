import React, { useState } from "react";
import { FlatList, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { DatePicker } from "@/components/ui/date-picker";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BadgeChip } from "@/components/ui/badge-chip";
import { useColors } from "@/hooks/use-colors";
import { MOCK_PRODUCTS, MOCK_SERVICES, type Product, type Service } from "@/lib/mock-data";
import { useCart } from "@/lib/cart-store";
import { useVentures } from "@/lib/ventures-store";
import { useAuth } from "@/lib/auth-store";
import { useNotifications } from "@/lib/notifications-store";
import { can } from "@/lib/permissions";

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  const colors = useColors();
  return (
    <View className="bg-surface rounded-2xl overflow-hidden border border-border" style={{ width: '48%' }}>
      <View className="relative">
        <Image source={{ uri: product.image }} className="w-full h-28" resizeMode="cover" />
        {!product.inStock && (
          <View className="absolute inset-0 bg-black/40 items-center justify-center">
            <Text className="text-white text-xs font-bold">Out of Stock</Text>
          </View>
        )}
        {product.canRent && (
          <View className="absolute top-2 left-2">
            <BadgeChip label="Rentable" variant="custom" customColor="#3B82F6" customBg="#EFF6FF" />
          </View>
        )}
      </View>
      <View className="p-2.5 gap-1.5">
        <Text className="text-sm font-semibold text-foreground" numberOfLines={2}>{product.name}</Text>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-base font-bold text-primary">₹{product.price}</Text>
            {product.canRent && (
              <Text className="text-xs text-muted">Rent: ₹{product.rentPrice}/day</Text>
            )}
          </View>
          <Pressable
            onPress={onAddToCart}
            disabled={!product.inStock}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View className={`rounded-lg p-1.5 ${product.inStock ? 'bg-primary' : 'bg-border'}`}>
              <IconSymbol name="plus" size={16} color={product.inStock ? "white" : colors.muted} />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Service Card ─────────────────────────────────────────────────────────────
function ServiceCard({ service, onAddToCart }: { service: Service; onAddToCart: () => void }) {
  const colors = useColors();
  return (
    <View className="bg-surface rounded-2xl overflow-hidden border border-border flex-row">
      <Image source={{ uri: service.image }} className="w-20 h-20" resizeMode="cover" />
      <View className="flex-1 p-3 justify-between">
        <View>
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{service.name}</Text>
          <Text className="text-xs text-muted mt-0.5" numberOfLines={2}>{service.description}</Text>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <View>
            <Text className="text-sm font-bold text-primary">₹{service.price}</Text>
            <Text className="text-xs text-muted">{service.unit}</Text>
          </View>
          <Pressable
            onPress={onAddToCart}
            disabled={!service.available}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View className={`rounded-lg px-3 py-1.5 ${service.available ? 'bg-primary' : 'bg-border'}`}>
              <Text className={`text-xs font-semibold ${service.available ? 'text-white' : 'text-muted'}`}>
                {service.available ? 'Book' : 'Unavailable'}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Add to Cart Bottom Sheet ─────────────────────────────────────────────────
type PendingItem = {
  itemId: string;
  itemType: 'product' | 'service';
  name: string;
  image: string;
  price: number;
} | null;

const TIME_SLOTS = ['7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];

function AddToCartSheet({
  visible,
  item,
  onClose,
}: {
  visible: boolean;
  item: PendingItem;
  onClose: () => void;
}) {
  const colors = useColors();
  const { addToCart } = useCart();
  const { ventures, getMemberForUser } = useVentures();
  const { user: authUser } = useAuth();
  const { addNotification } = useNotifications();
  const [selectedVentureId, setSelectedVentureId] = useState<string | 'personal'>('personal');
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [serviceDate, setServiceDate] = useState('');
  const [serviceDateDisplay, setServiceDateDisplay] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [serviceTimeSlot, setServiceTimeSlot] = useState('');

  // Only ventures where user has PURCHASE_SUPPLIES permission (co-owner or buyer)
  const eligibleVentures = ventures.filter(v => {
    if (v.status !== 'proposed' && v.status !== 'ongoing') return false;
    if (!authUser) return false;
    const membership = getMemberForUser(v.id, authUser.username);
    if (!membership) return false;
    const isOwnerOrCoOwner = membership.isOwner || membership.privilege === 'co-owner';
    return can(membership.privilege, 'PURCHASE_SUPPLIES', isOwnerOrCoOwner);
  });

  const handleAdd = () => {
    if (!item) return;
    const venture = eligibleVentures.find(v => v.id === selectedVentureId);
    const scheduledLabel = serviceDate && serviceTimeSlot ? `${serviceDate} at ${serviceTimeSlot}` : serviceDate || undefined;
    addToCart({
      itemId: item.itemId,
      itemType: item.itemType,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.itemType === 'product' ? quantity : 1,
      ventureId: selectedVentureId === 'personal' ? null : selectedVentureId,
      ventureName: selectedVentureId === 'personal' ? null : (venture?.name ?? null),
      ...(scheduledLabel ? { scheduledDate: scheduledLabel } : {}),
    } as any);
    // Emit notification for cart add
    const qty = item.itemType === 'product' ? quantity : 1;
    const destination = selectedVentureId === 'personal' ? 'your personal cart' : `${venture?.name ?? 'venture'} cart`;
    addNotification({
      type: 'general',
      title: 'Added to Cart',
      body: `${qty}× ${item.name} (₹${item.price * qty}) added to ${destination}.`,
      ...(selectedVentureId !== 'personal' ? { ventureId: selectedVentureId } : {}),
    });
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setSelectedVentureId('personal');
      setQuantity(1);
      setServiceDate('');
      setServiceDateDisplay('');
      setServiceTimeSlot('');
      onClose();
    }, 1000);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 }}>
          {/* Handle */}
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 16 }} />

          {added ? (
            <View style={{ padding: 32, alignItems: 'center', gap: 12 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                <IconSymbol name="checkmark.circle.fill" size={36} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground }}>Added to Cart!</Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>
                {selectedVentureId === 'personal' ? 'Added to your personal cart' : `Added to venture supplies`}
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 20, gap: 18 }}>
              {/* Item preview */}
              {item && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.background, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border }}>
                  <Image source={{ uri: item.image }} style={{ width: 52, height: 52, borderRadius: 10 }} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{item.name}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 2 }}>₹{item.price}{item.itemType === 'product' && quantity > 1 ? ` × ${quantity} = ₹${item.price * quantity}` : ''}</Text>
                  </View>
                </View>
              )}

              {/* Quantity stepper (products only) */}
              {item?.itemType === 'product' && (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>Quantity</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <Pressable
                      onPress={() => setQuantity(q => Math.max(1, q - 1))}
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 20, color: colors.foreground, lineHeight: 24 }}>−</Text>
                      </View>
                    </Pressable>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, minWidth: 32, textAlign: 'center' }}>{quantity}</Text>
                    <Pressable
                      onPress={() => setQuantity(q => q + 1)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 20, color: 'white', lineHeight: 24 }}>+</Text>
                      </View>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Date + time slot (services only) */}
              {item?.itemType === 'service' && (
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>Schedule</Text>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: serviceDate ? colors.primary : colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: colors.background, gap: 8 }}>
                      <IconSymbol name="calendar" size={16} color={serviceDate ? colors.primary : colors.muted} />
                      <Text style={{ flex: 1, fontSize: 14, color: serviceDate ? colors.foreground : colors.muted }}>
                        {serviceDateDisplay || 'Select a date'}
                      </Text>
                      {serviceDate ? (
                        <Pressable onPress={() => { setServiceDate(''); setServiceDateDisplay(''); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                          <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
                        </Pressable>
                      ) : (
                        <IconSymbol name="chevron.right" size={14} color={colors.muted} />
                      )}
                    </View>
                  </Pressable>
                  <DatePicker
                    visible={showDatePicker}
                    value={serviceDate}
                    onConfirm={(iso, display) => { setServiceDate(iso); setServiceDateDisplay(display); setShowDatePicker(false); }}
                    onCancel={() => setShowDatePicker(false)}
                    minDate={new Date()}
                  />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Time Slot</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {TIME_SLOTS.map(slot => (
                      <Pressable
                        key={slot}
                        onPress={() => setServiceTimeSlot(slot)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View style={[
                          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
                          serviceTimeSlot === slot
                            ? { backgroundColor: colors.primary, borderColor: colors.primary }
                            : { backgroundColor: colors.background, borderColor: colors.border },
                        ]}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: serviceTimeSlot === slot ? 'white' : colors.foreground }}>{slot}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Cart destination */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>Add to</Text>

                {/* Personal cart option */}
                <Pressable
                  onPress={() => setSelectedVentureId('personal')}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[
                    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5 },
                    selectedVentureId === 'personal'
                      ? { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                      : { borderColor: colors.border, backgroundColor: colors.background },
                  ]}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
                      <IconSymbol name="person.fill" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: selectedVentureId === 'personal' ? colors.primary : colors.foreground }}>Personal Cart</Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>Billed to your personal wallet</Text>
                    </View>
                    <View style={[
                      { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
                      { borderColor: selectedVentureId === 'personal' ? colors.primary : colors.border },
                    ]}>
                      {selectedVentureId === 'personal' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
                    </View>
                  </View>
                </Pressable>

                {/* Venture options */}
                {eligibleVentures.length > 0 && (
                  <>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>
                      Venture Supplies
                    </Text>
                    {eligibleVentures.map(v => (
                      <Pressable
                        key={v.id}
                        onPress={() => setSelectedVentureId(v.id)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View style={[
                          { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5 },
                          selectedVentureId === v.id
                            ? { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                            : { borderColor: colors.border, backgroundColor: colors.background },
                        ]}>
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                            <IconSymbol name="leaf.fill" size={18} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: selectedVentureId === v.id ? colors.primary : colors.foreground }} numberOfLines={1}>{v.name}</Text>
                            <Text style={{ fontSize: 12, color: colors.muted }}>{v.location}</Text>
                          </View>
                          <View style={[
                            { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
                            { borderColor: selectedVentureId === v.id ? colors.primary : colors.border },
                          ]}>
                            {selectedVentureId === v.id && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </>
                )}
              </View>

              {/* Add button */}
              <Pressable
                onPress={handleAdd}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Add to Cart</Text>
                </View>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Market Screen ───────────────────────────────────────────────────────
export default function MarketScreen() {
  const colors = useColors();
  const router = useRouter();
  const { pendingCount } = useCart();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [pendingItem, setPendingItem] = useState<PendingItem>(null);

  const categories = ['All', 'Safety', 'Tools', 'Disposal', 'Sanitation', 'Beautify'];

  const filteredProducts = activeCategory === 'All'
    ? MOCK_PRODUCTS
    : MOCK_PRODUCTS.filter(p => p.category === activeCategory);

  const handleAddProduct = (product: Product) => {
    setPendingItem({
      itemId: product.id,
      itemType: 'product',
      name: product.name,
      image: product.image,
      price: product.price,
    });
  };

  const handleAddService = (service: Service) => {
    setPendingItem({
      itemId: service.id,
      itemType: 'service',
      name: service.name,
      image: service.image,
      price: service.price,
    });
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
          <View>
            <Text className="text-2xl font-bold text-foreground">Marketplace</Text>
            <Text className="text-sm text-muted">Supplies for your cleanup</Text>
          </View>
          <Pressable
            onPress={() => router.push('/cart' as any)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View className="relative">
              <View className="bg-surface rounded-full p-2.5 border border-border">
                <IconSymbol name="cart.fill" size={22} color={colors.primary} />
              </View>
              {pendingCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-error rounded-full w-5 h-5 items-center justify-center">
                  <Text className="text-white text-xs font-bold">{pendingCount}</Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
        >
          {categories.map(cat => (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <View className={`rounded-full px-4 py-2 border ${activeCategory === cat ? 'bg-primary border-primary' : 'bg-surface border-border'}`}>
                <Text className={`text-sm font-semibold ${activeCategory === cat ? 'text-white' : 'text-muted'}`}>
                  {cat}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Products section */}
        <View className="px-4">
          <Text className="text-lg font-bold text-foreground mb-3">Products</Text>
          <View className="flex-row flex-wrap gap-3">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => handleAddProduct(product)}
              />
            ))}
          </View>
        </View>

        {/* Services section */}
        <View className="px-4 mt-6">
          <Text className="text-lg font-bold text-foreground mb-3">Services</Text>
          <View className="gap-3">
            {MOCK_SERVICES.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                onAddToCart={() => handleAddService(service)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Add to Cart bottom sheet */}
      <AddToCartSheet
        visible={pendingItem !== null}
        item={pendingItem}
        onClose={() => setPendingItem(null)}
      />
    </ScreenContainer>
  );
}
