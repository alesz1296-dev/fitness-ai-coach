import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { authApi } from "../../api";
import { useAuthStore } from "../../store/authStore";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type Nav = NativeStackNavigationProp<AuthStackParamList, "Login">;

export function LoginScreen() {
  const navigation        = useNavigation<Nav>();
  const { setAuth }       = useAuthStore();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const submit = async () => {
    if (!email.trim() || !password) { setError("Email and password are required."); return; }
    setLoading(true); setError("");
    try {
      const res = await authApi.login({ email: email.trim().toLowerCase(), password });
      await setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      // RootNavigator will automatically switch to TabNavigator on isAuthenticated change
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? "Login failed. Check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={s.logoRow}>
          <View style={s.logoBox}>
            <Text style={s.logoLetter}>F</Text>
          </View>
          <Text style={s.appName}>FitAI Coach</Text>
        </View>

        <Text style={s.heading}>Welcome back</Text>
        <Text style={s.sub}>Sign in to continue</Text>

        {/* Error */}
        {!!error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* Inputs */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={s.fieldWrap}>
          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoComplete="current-password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            returnKeyType="go"
          />
        </View>

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [s.btn, pressed && s.btnPressed, loading && s.btnDisabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Sign In</Text>
          }
        </Pressable>

        {/* Register link */}
        <Pressable style={s.linkRow} onPress={() => navigation.navigate("Register")}>
          <Text style={s.linkText}>
            Don't have an account?{" "}
            <Text style={s.linkAccent}>Create one</Text>
          </Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BRAND   = "#16a34a";
const BG      = "#111827";
const SURFACE = "#1f2937";
const BORDER  = "#374151";

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: BG },
  scroll:    { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 48 },

  logoRow:   { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 32 },
  logoBox:   { width: 40, height: 40, backgroundColor: BRAND, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoLetter:{ color: "#fff", fontWeight: "700", fontSize: 20 },
  appName:   { color: "#fff", fontWeight: "700", fontSize: 22 },

  heading:   { color: "#f9fafb", fontWeight: "700", fontSize: 28, marginBottom: 6 },
  sub:       { color: "#9ca3af", fontSize: 15, marginBottom: 28 },

  errorBox:  { backgroundColor: "#450a0a", borderWidth: 1, borderColor: "#7f1d1d", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  errorText: { color: "#fca5a5", fontSize: 13 },

  fieldWrap: { marginBottom: 16 },
  label:     { color: "#d1d5db", fontSize: 13, fontWeight: "500", marginBottom: 6 },
  input:     { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: "#f9fafb", fontSize: 15 },

  btn:        { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  btnPressed: { backgroundColor: "#15803d" },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { color: "#fff", fontWeight: "700", fontSize: 16 },

  linkRow:   { marginTop: 24, alignItems: "center" },
  linkText:  { color: "#6b7280", fontSize: 14 },
  linkAccent:{ color: BRAND, fontWeight: "600" },
});
