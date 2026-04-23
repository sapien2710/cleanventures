import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-store";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function SignInScreen() {
  const colors = useColors();
  const router = useRouter();
  const { login, register } = useAuth();

  const [tab, setTab] = useState<"login" | "register">("login");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email/username and password.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      router.replace("/(tabs)");
    } else {
      setError(result.error ?? "Login failed.");
    }
  };

  const handleRegister = async () => {
    if (!regEmail.trim() || !regPassword || !regUsername.trim() || !regFullName.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!regEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await register(regEmail.trim(), regPassword, regUsername.trim(), regFullName.trim());
    setLoading(false);
    if (result.success) {
      router.replace("/(tabs)");
    } else {
      setError(result.error ?? "Registration failed.");
    }
  };

  const inputStyle = (active: boolean) => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    borderWidth: 1.5,
    borderColor: active ? colors.primary : colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.background,
  });

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
        <View style={{ alignItems: "center", marginBottom: 32, gap: 12 }}>
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
          {/* Tab switcher */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: colors.background,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 4,
            }}
          >
            <TouchableOpacity
              onPress={() => { setTab("login"); setError(""); }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: tab === "login" ? colors.primary : "transparent",
              }}
            >
              <Text style={{ fontWeight: "700", fontSize: 14, color: tab === "login" ? "white" : colors.muted }}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setTab("register"); setError(""); }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: tab === "register" ? colors.primary : "transparent",
              }}
            >
              <Text style={{ fontWeight: "700", fontSize: 14, color: tab === "register" ? "white" : colors.muted }}>
                Register
              </Text>
            </TouchableOpacity>
          </View>

          {tab === "login" ? (
            <>
              {/* Email / Username */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
                  Email or Username
                </Text>
                <View style={inputStyle(!!email)}>
                  <IconSymbol name="person.fill" size={18} color={email ? colors.primary : colors.muted} />
                  <TextInput
                    value={email}
                    onChangeText={v => { setEmail(v); setError(""); }}
                    placeholder="Enter your email or username"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
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
                <View style={inputStyle(!!password)}>
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
                  <Pressable onPress={() => setShowPassword(s => !s)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                    <IconSymbol name={showPassword ? "eye.slash.fill" : "eye.fill"} size={18} color={colors.muted} />
                  </Pressable>
                </View>
              </View>

              {/* Error */}
              {error ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.error + "15", borderRadius: 12, padding: 12 }}>
                  <IconSymbol name="exclamationmark.circle.fill" size={16} color={colors.error} />
                  <Text style={{ fontSize: 13, color: colors.error, flex: 1 }}>{error}</Text>
                </View>
              ) : null}

              {/* Sign In button */}
              <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.75} style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, opacity: loading ? 0.75 : 1 }}>
                <IconSymbol name={loading ? "arrow.clockwise" : "arrow.right.circle.fill"} size={18} color="white" />
                <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                  {loading ? "Signing in…" : "Sign In"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Full Name */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>Full Name</Text>
                <View style={inputStyle(!!regFullName)}>
                  <IconSymbol name="person.fill" size={18} color={regFullName ? colors.primary : colors.muted} />
                  <TextInput
                    value={regFullName}
                    onChangeText={v => { setRegFullName(v); setError(""); }}
                    placeholder="Your full name"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="words"
                    returnKeyType="next"
                    style={{ flex: 1, fontSize: 15, color: colors.foreground }}
                  />
                </View>
              </View>

              {/* Username */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>Username</Text>
                <View style={inputStyle(!!regUsername)}>
                  <IconSymbol name="at" size={18} color={regUsername ? colors.primary : colors.muted} />
                  <TextInput
                    value={regUsername}
                    onChangeText={v => { setRegUsername(v.toLowerCase().replace(/\s/g, "")); setError(""); }}
                    placeholder="Choose a username"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    style={{ flex: 1, fontSize: 15, color: colors.foreground }}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>Email</Text>
                <View style={inputStyle(!!regEmail)}>
                  <IconSymbol name="envelope.fill" size={18} color={regEmail ? colors.primary : colors.muted} />
                  <TextInput
                    value={regEmail}
                    onChangeText={v => { setRegEmail(v); setError(""); }}
                    placeholder="your@email.com"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                    style={{ flex: 1, fontSize: 15, color: colors.foreground }}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>Password</Text>
                <View style={inputStyle(!!regPassword)}>
                  <IconSymbol name="lock.fill" size={18} color={regPassword ? colors.primary : colors.muted} />
                  <TextInput
                    value={regPassword}
                    onChangeText={v => { setRegPassword(v); setError(""); }}
                    placeholder="Min. 6 characters"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showRegPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                    style={{ flex: 1, fontSize: 15, color: colors.foreground }}
                  />
                  <Pressable onPress={() => setShowRegPassword(s => !s)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                    <IconSymbol name={showRegPassword ? "eye.slash.fill" : "eye.fill"} size={18} color={colors.muted} />
                  </Pressable>
                </View>
              </View>

              {/* Error */}
              {error ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.error + "15", borderRadius: 12, padding: 12 }}>
                  <IconSymbol name="exclamationmark.circle.fill" size={16} color={colors.error} />
                  <Text style={{ fontSize: 13, color: colors.error, flex: 1 }}>{error}</Text>
                </View>
              ) : null}

              {/* Register button */}
              <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.75} style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, opacity: loading ? 0.75 : 1 }}>
                <IconSymbol name={loading ? "arrow.clockwise" : "person.badge.plus"} size={18} color="white" />
                <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                  {loading ? "Creating account…" : "Create Account"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Google sign-in placeholder */}
        <TouchableOpacity activeOpacity={0.7} onPress={() => {}} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5, borderColor: colors.border, borderRadius: 16, paddingVertical: 14, backgroundColor: colors.surface, marginTop: 16 }}>
          <Text style={{ fontSize: 18 }}>G</Text>
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>Continue with Google</Text>
          <View style={{ backgroundColor: colors.warning + "20", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: colors.warning }}>Coming Soon</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
