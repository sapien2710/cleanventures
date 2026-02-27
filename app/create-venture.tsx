import React, { useState, useRef, useCallback } from "react";
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform
} from "react-native";
import { DatePicker } from "@/components/ui/date-picker";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LocationPickerMap, type LocationPickerHandle } from "@/components/location-picker-map";
import { useColors } from "@/hooks/use-colors";
import { useVentures, type VentureMember } from "@/lib/ventures-store";
import { MOCK_USER } from "@/lib/mock-data";
import type { Venture } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-store";

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { step: 1, label: 'Info' },
  { step: 2, label: 'Scope' },
  { step: 3, label: 'Budget' },
  { step: 4, label: 'Access' },
];

const CATEGORIES = ['Park', 'Road', 'Beach', 'Waterway', 'Neighbourhood', 'Market', 'Other'];

// Default coordinates: Vadodara, India
const DEFAULT_LAT = 22.3072;
const DEFAULT_LNG = 73.1812;

export default function CreateVentureScreen() {
  const router = useRouter();
  const colors = useColors();
  const { addVenture } = useVentures();
  const { user: authUser } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [launched, setLaunched] = useState(false);
  const locationPickerRef = useRef<LocationPickerHandle>(null);

  // Form state
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [scopeClean, setScopeClean] = useState(true);
  const [scopeBeautify, setScopeBeautify] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startDateDisplay, setStartDateDisplay] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [headcount, setHeadcount] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [budget, setBudget] = useState('');
  const [eac, setEac] = useState('');
  const [openToAll, setOpenToAll] = useState(true);
  const [disclaimer, setDisclaimer] = useState('');

  const canProceed = () => {
    if (step === 1) return name.trim().length > 0 && location.trim().length > 0 && category.length > 0;
    if (step === 2) return (scopeClean || scopeBeautify) && startDate.trim().length > 0 && headcount.trim().length > 0;
    if (step === 3) return isFree || budget.trim().length > 0;
    return true;
  };

  const handleLocationPicked = useCallback((lat: number, lng: number, address: string) => {
    setCoordinates({ lat, lng });
    setLocation(address);
    // Small delay so user can see the pin before modal closes
    setTimeout(() => setShowMapPicker(false), 600);
  }, []);

  const handleLaunch = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const scope: ('clean' | 'beautify')[] = [];
    if (scopeClean) scope.push('clean');
    if (scopeBeautify) scope.push('beautify');

    const newVenture: Venture = {
      id: `v-user-${Date.now()}`,
      name: name.trim(),
      location: location.trim(),
      coordinates,
      description: description.trim() || `A community ${scope.join(' and ')} venture at ${location.trim()}.`,
      status: 'proposed',
      scope,
      category,
      isFree,
      budget: isFree ? 0 : parseInt(budget) || 0,
      currentFunding: 0,
      eac: isFree ? 0 : parseInt(eac) || 0,
      volunteersJoined: 1,
      volunteersRequired: parseInt(headcount) || 10,
      startDate: startDate.trim(),
      endDate: '',
      images: [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
      ],
      tags: [category.toLowerCase(), ...scope],
      ownerName: authUser?.displayName ?? MOCK_USER.name,
      ownerAvatar: authUser?.avatar ?? MOCK_USER.avatar,
      ownerStats: { completed: MOCK_USER.venturesCompleted, rating: 4.8 },
      myRole: 'volunteer',
      myPrivilege: 'co-owner',
    };

    // Build the owner member record so getMemberForUser returns this user as owner
    const ownerMember: VentureMember = {
      id: `owner-${newVenture.id}`,
      username: authUser?.displayName ?? MOCK_USER.name,
      authUsername: authUser?.username ?? 'abhijeet',
      avatar: authUser?.avatar ?? MOCK_USER.avatar,
      role: 'volunteer',
      privilege: 'co-owner',
      isOwner: true,
    };

    addVenture(newVenture, ownerMember);
    setLaunched(true);
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (launched) {
    return (
      <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right"]}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: colors.primaryLight }]}>
            <Text style={{ fontSize: 52 }}>🌿</Text>
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Venture Launched!</Text>
          <Text style={[styles.successSub, { color: colors.muted }]}>
            <Text style={{ fontWeight: '700', color: colors.primary }}>{name}</Text> has been created and is now visible to your community. Share it and start recruiting volunteers!
          </Text>
          <View style={styles.successActions}>
            <Pressable
              onPress={() => router.replace('/(tabs)/ventures' as any)}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={[styles.successBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.successBtnText}>View My Ventures</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.replace('/(tabs)/' as any)}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={[styles.successBtnOutline, { borderColor: colors.border }]}>
                <Text style={[styles.successBtnOutlineText, { color: colors.foreground }]}>Back to Home</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable
          onPress={() => step === 1 ? router.back() : setStep((step - 1) as Step)}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Start a New Venture</Text>
        <Text style={[styles.headerStep, { color: colors.muted }]}>{step}/4</Text>
      </View>

      {/* Step indicator */}
      <View style={[styles.stepBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {STEPS.map(s => (
          <View key={s.step} style={styles.stepItem}>
            <View style={[styles.stepLine, { backgroundColor: step >= s.step ? colors.primary : colors.border }]} />
            <Text style={[styles.stepLabel, { color: step === s.step ? colors.primary : colors.muted }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Step 1: Info ──────────────────────────────────────────────── */}
        {step === 1 && (
          <View style={styles.stepSection}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Venture Details</Text>
            <Text style={[styles.stepSub, { color: colors.muted }]}>Tell us about the place you want to clean.</Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Venture Name *</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Sayaji Park Cleanup"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { color: colors.foreground }]}
                  returnKeyType="done"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Location *</Text>
              <Pressable
                onPress={() => setShowMapPicker(true)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: location ? colors.primary : colors.border }]}>
                  <IconSymbol name="location.fill" size={16} color={location ? colors.primary : colors.muted} />
                  <Text
                    style={[styles.input, { color: location ? colors.foreground : colors.muted, flex: 1 }]}
                    numberOfLines={1}
                  >
                    {location || 'Search or pin on map'}
                  </Text>
                  {location ? (
                    <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
                  ) : (
                    <IconSymbol name="map.fill" size={16} color={colors.primary} />
                  )}
                </View>
              </Pressable>
              <Text style={[styles.fieldHint, { color: colors.muted }]}>Tap to open map and pin the exact location</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Category *</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map(cat => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={[
                      styles.chip,
                      { borderColor: category === cat ? colors.primary : colors.border },
                      category === cat && { backgroundColor: colors.primary },
                    ]}>
                      <Text style={[styles.chipText, { color: category === cat ? 'white' : colors.muted }]}>{cat}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Description</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'flex-start', paddingTop: 12 }]}>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe the site and what needs to be done..."
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { color: colors.foreground, height: 80, textAlignVertical: 'top' }]}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          </View>
        )}

        {/* ── Step 2: Scope ─────────────────────────────────────────────── */}
        {step === 2 && (
          <View style={styles.stepSection}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Scope & Timeline</Text>
            <Text style={[styles.stepSub, { color: colors.muted }]}>Define what you want to achieve and when.</Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Scope *</Text>
              {[
                { key: 'clean' as const, label: '🧹 Clean', desc: 'Remove trash and waste from the area', state: scopeClean, toggle: setScopeClean },
                { key: 'beautify' as const, label: '🌱 Beautify', desc: 'Plant trees, paint walls, add greenery', state: scopeBeautify, toggle: setScopeBeautify },
              ].map(item => (
                <Pressable
                  key={item.key}
                  onPress={() => item.toggle(!item.state)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginBottom: 10 }]}
                >
                  <View style={[
                    styles.toggleCard,
                    { borderColor: item.state ? colors.primary : colors.border, backgroundColor: item.state ? colors.primaryLight : colors.surface }
                  ]}>
                    <View style={[styles.checkbox, { borderColor: item.state ? colors.primary : colors.border, backgroundColor: item.state ? colors.primary : 'transparent' }]}>
                      {item.state && <IconSymbol name="checkmark" size={12} color="white" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.toggleLabel, { color: item.state ? colors.primary : colors.foreground }]}>{item.label}</Text>
                      <Text style={[styles.toggleDesc, { color: colors.muted }]}>{item.desc}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Cleanup Date *</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: startDate ? colors.primary : colors.border }]}>
                  <IconSymbol name="calendar" size={16} color={startDate ? colors.primary : colors.muted} />
                  <Text style={[styles.input, { color: startDate ? colors.foreground : colors.muted, flex: 1 }]}>
                    {startDateDisplay || 'Select cleanup date'}
                  </Text>
                  {startDate ? (
                    <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
                  ) : (
                    <IconSymbol name="chevron.right" size={14} color={colors.muted} />
                  )}
                </View>
              </Pressable>
            </View>

            <DatePicker
              visible={showDatePicker}
              value={startDate}
              onConfirm={(iso, display) => {
                setStartDate(iso);
                setStartDateDisplay(display);
                setShowDatePicker(false);
              }}
              onCancel={() => setShowDatePicker(false)}
            />

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Volunteer Headcount *</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <IconSymbol name="person.2.fill" size={16} color={colors.primary} />
                <TextInput
                  value={headcount}
                  onChangeText={setHeadcount}
                  placeholder="How many volunteers do you need?"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { color: colors.foreground, flex: 1 }]}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>
        )}

        {/* ── Step 3: Budget ────────────────────────────────────────────── */}
        {step === 3 && (
          <View style={styles.stepSection}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Budget & Wallet</Text>
            <Text style={[styles.stepSub, { color: colors.muted }]}>Set up the financial framework for your venture.</Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Venture Type</Text>
              {[
                { key: true, label: '🆓 Free Venture', desc: 'No financial contribution required from participants' },
                { key: false, label: '💰 Funded Venture', desc: 'Participants contribute to a shared project wallet' },
              ].map(item => (
                <Pressable
                  key={String(item.key)}
                  onPress={() => setIsFree(item.key)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginBottom: 10 }]}
                >
                  <View style={[
                    styles.toggleCard,
                    { borderColor: isFree === item.key ? colors.primary : colors.border, backgroundColor: isFree === item.key ? colors.primaryLight : colors.surface }
                  ]}>
                    <View style={[styles.radioOuter, { borderColor: isFree === item.key ? colors.primary : colors.border }]}>
                      {isFree === item.key && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.toggleLabel, { color: isFree === item.key ? colors.primary : colors.foreground }]}>{item.label}</Text>
                      <Text style={[styles.toggleDesc, { color: colors.muted }]}>{item.desc}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>

            {!isFree && (
              <View style={styles.fieldGroup}>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Total Budget (₹)</Text>
                  <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.currencySymbol, { color: colors.muted }]}>₹</Text>
                    <TextInput
                      value={budget}
                      onChangeText={setBudget}
                      placeholder="e.g. 5000"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, { color: colors.foreground, flex: 1 }]}
                      keyboardType="number-pad"
                      returnKeyType="done"
                    />
                  </View>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Expected Average Contribution (EAC)</Text>
                  <Text style={[styles.fieldHint, { color: colors.muted }]}>Suggested amount — participants can contribute more or less.</Text>
                  <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.currencySymbol, { color: colors.muted }]}>₹</Text>
                    <TextInput
                      value={eac}
                      onChangeText={setEac}
                      placeholder="e.g. 250"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, { color: colors.foreground, flex: 1 }]}
                      keyboardType="number-pad"
                      returnKeyType="done"
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Step 4: Access ────────────────────────────────────────────── */}
        {step === 4 && (
          <View style={styles.stepSection}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Access & Disclaimers</Text>
            <Text style={[styles.stepSub, { color: colors.muted }]}>Control who can join your venture.</Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Entry Policy</Text>
              {[
                { key: true, label: '🌍 Open to All', desc: 'Anyone can request to join as any role' },
                { key: false, label: '🔒 Restricted', desc: 'Only contributing volunteers and sponsors can join' },
              ].map(item => (
                <Pressable
                  key={String(item.key)}
                  onPress={() => setOpenToAll(item.key)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginBottom: 10 }]}
                >
                  <View style={[
                    styles.toggleCard,
                    { borderColor: openToAll === item.key ? colors.primary : colors.border, backgroundColor: openToAll === item.key ? colors.primaryLight : colors.surface }
                  ]}>
                    <View style={[styles.radioOuter, { borderColor: openToAll === item.key ? colors.primary : colors.border }]}>
                      {openToAll === item.key && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.toggleLabel, { color: openToAll === item.key ? colors.primary : colors.foreground }]}>{item.label}</Text>
                      <Text style={[styles.toggleDesc, { color: colors.muted }]}>{item.desc}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Disclaimers & Safety Notes</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'flex-start', paddingTop: 12 }]}>
                <TextInput
                  value={disclaimer}
                  onChangeText={setDisclaimer}
                  placeholder="e.g. Wear sturdy shoes. No children under 12."
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { color: colors.foreground, height: 72, textAlignVertical: 'top' }]}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* Summary card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30' }]}>
              <Text style={[styles.summaryTitle, { color: colors.primary }]}>Venture Summary</Text>
              {[
                { label: 'Name', value: name || '—' },
                { label: 'Location', value: location || '—' },
                { label: 'Category', value: category || '—' },
                { label: 'Scope', value: [scopeClean && 'Clean', scopeBeautify && 'Beautify'].filter(Boolean).join(', ') || '—' },
                { label: 'Date', value: startDate || '—' },
                { label: 'Headcount', value: headcount || '—' },
                { label: 'Type', value: isFree ? 'Free' : `Funded (₹${budget})` },
                { label: 'Entry', value: openToAll ? 'Open to All' : 'Restricted' },
              ].map(row => (
                <View key={row.label} style={styles.summaryRow}>
                  <Text style={[styles.summaryKey, { color: colors.muted }]}>{row.label}</Text>
                  <Text style={[styles.summaryVal, { color: colors.foreground }]} numberOfLines={1}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          {step > 1 && (
            <Pressable
              onPress={() => setStep((step - 1) as Step)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flex: 1 }]}
            >
              <View style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.backBtnText, { color: colors.foreground }]}>Back</Text>
              </View>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              if (step < 4) setStep((step + 1) as Step);
              else handleLaunch();
            }}
            disabled={!canProceed()}
            style={({ pressed }) => [{ opacity: (pressed || !canProceed()) ? 0.5 : 1, flex: step > 1 ? 2 : 1 }]}
          >
            <View style={[styles.nextBtn, { backgroundColor: canProceed() ? colors.primary : colors.border }]}>
              <Text style={[styles.nextBtnText, { color: canProceed() ? 'white' : colors.muted }]}>
                {step === 4 ? '🚀 Launch Venture' : 'Continue'}
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Location Picker Modal ──────────────────────────────────────── */}
      <Modal
        visible={showMapPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMapPicker(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <Pressable
              onPress={() => setShowMapPicker(false)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Pin Location</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Map fills the rest */}
          <View style={styles.mapFill}>
            <LocationPickerMap
              ref={locationPickerRef}
              initialLat={coordinates.lat}
              initialLng={coordinates.lng}
              onLocationPicked={handleLocationPicked}
            />
          </View>

          {/* Bottom hint */}
          <View style={[styles.modalFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <IconSymbol name="location.fill" size={14} color={colors.primary} />
            <Text style={[styles.modalFooterText, { color: colors.muted }]}>
              {location ? `Pinned: ${location}` : 'Tap anywhere on the map to pin the cleanup location'}
            </Text>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
  headerStep: { fontSize: 13 },
  stepBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1 },
  stepItem: { flex: 1, alignItems: 'center', gap: 4 },
  stepLine: { height: 3, width: '100%', borderRadius: 2 },
  stepLabel: { fontSize: 10, fontWeight: '600' },
  scrollContent: { padding: 20, gap: 0, paddingBottom: 40 },
  stepSection: { gap: 20 },
  stepTitle: { fontSize: 20, fontWeight: '700' },
  stepSub: { fontSize: 13, marginTop: -14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  fieldHint: { fontSize: 11, marginTop: -2 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  input: { fontSize: 14, flex: 1 },
  currencySymbol: { fontSize: 14, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, backgroundColor: 'transparent' },
  chipText: { fontSize: 13, fontWeight: '600' },
  toggleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  toggleDesc: { fontSize: 12, marginTop: 2 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  summaryCard: { borderRadius: 16, padding: 16, gap: 8, borderWidth: 1 },
  summaryTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryKey: { fontSize: 12, width: 72 },
  summaryVal: { fontSize: 12, fontWeight: '500', flex: 1 },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  backBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1 },
  backBtnText: { fontWeight: '600', fontSize: 15 },
  nextBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { fontWeight: '700', fontSize: 15 },
  // Success screen
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  successTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  successSub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  successActions: { width: '100%', gap: 12, marginTop: 8 },
  successBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  successBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  successBtnOutline: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  successBtnOutlineText: { fontWeight: '600', fontSize: 15 },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalCancel: { fontSize: 15, width: 60 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  mapFill: { flex: 1 },
  modalFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  modalFooterText: { fontSize: 12, flex: 1 },
});
