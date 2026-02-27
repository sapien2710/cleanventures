import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-store";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function SignInScreen() {
  const colors = useColors();
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      router.replace("/(tabs)");
    } else {
      setError(result.error ?? "Login failed.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo + branding */}
        <View style={{ alignItems: "center", marginBottom: 40, gap: 12 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 22,
              overflow: "hidden",
              backgroundColor: colors.primaryLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 80, height: 80 }}
              resizeMode="cover"
            />
          </View>
          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground }}>
            CleanVentures
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 }}>
            Join your community. Clean your city.
          </Text>
        </View>

        {/* Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 18,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
            Sign In
          </Text>

          {/* Username */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
              Username
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                borderWidth: 1.5,
                borderColor: username ? colors.primary : colors.border,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: colors.background,
              }}
            >
              <IconSymbol name="person.fill" size={18} color={username ? colors.primary : colors.muted} />
              <TextInput
                value={username}
                onChangeText={v => { setUsername(v); setError(""); }}
                placeholder="Enter your username"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                style={{ flex: 1, fontSize: 15, color: colors.foreground }}
              />
            </View>
          </View>

          {/* Password */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
              Password
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                borderWidth: 1.5,
                borderColor: password ? colors.primary : colors.border,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: colors.background,
              }}
            >
              <IconSymbol name="lock.fill" size={18} color={password ? colors.primary : colors.muted} />
              <TextInput
                value={password}
                onChangeText={v => { setPassword(v); setError(""); }}
                placeholder="Enter your password"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                style={{ flex: 1, fontSize: 15, color: colors.foreground }}
              />
              <Pressable
                onPress={() => setShowPassword(s => !s)}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <IconSymbol
                  name={showPassword ? "eye.slash.fill" : "eye.fill"}
                  size={18}
                  color={colors.muted}
                />
              </Pressable>
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: colors.error + "15",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <IconSymbol name="exclamationmark.circle.fill" size={16} color={colors.error} />
              <Text style={{ fontSize: 13, color: colors.error, flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          {/* Sign In button */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [{ opacity: pressed || loading ? 0.75 : 1 }]}
          >
            <View
              style={{
                backgroundColor: colors.primary,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <IconSymbol name="arrow.clockwise" size={18} color="white" />
              ) : (
                <IconSymbol name="arrow.right.circle.fill" size={18} color="white" />
              )}
              <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                {loading ? "Signing in…" : "Sign In"}
              </Text>
            </View>
          </Pressable>

          {/* Hint */}
          <View
            style={{
              backgroundColor: colors.primaryLight,
              borderRadius: 12,
              padding: 12,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>
              Demo Credentials (all use password: 1234)
            </Text>
            <Text style={{ fontSize: 12, color: colors.primary + "CC" }}>
              <Text style={{ fontWeight: "700" }}>abhijeet</Text> — Owner/Co-owner on most ventures
            </Text>
            <Text style={{ fontSize: 12, color: colors.primary + "CC" }}>
              <Text style={{ fontWeight: "700" }}>priya</Text> — Admin &amp; Viewer on select ventures
            </Text>
            <Text style={{ fontSize: 12, color: colors.primary + "CC" }}>
              <Text style={{ fontWeight: "700" }}>rahul</Text> — Co-owner, Admin &amp; Viewer across ventures
            </Text>
          </View>
        </View>

        {/* Google sign-in placeholder */}
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 16 }]}
          onPress={() => {}}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              borderWidth: 1.5,
              borderColor: colors.border,
              borderRadius: 16,
              paddingVertical: 14,
              backgroundColor: colors.surface,
            }}
          >
            <Text style={{ fontSize: 18 }}>G</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
              Continue with Google
            </Text>
            <View
              style={{
                backgroundColor: colors.warning + "20",
                borderRadius: 8,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "700", color: colors.warning }}>
                Coming Soon
              </Text>
            </View>
          </View>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
