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

type Nav = NativeStackNavigationProp<AuthStackParamList, "Register">;

export function RegisterScreen() {
  const navigation  = useNavigation<Nav>();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", username: "", password: "", confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = (key: keyof typeof form) => (val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const submit = async () => {
    if (!form.email || !form.username || !form.password) {
      setError("Email, username and password are required."); return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match."); return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters."); return;
    }
    setLoading(true); setError("");
    try {
      const res = await authApi.register({
        email:     form.email.trim().toLowerCase(),
        username:  form.username.trim(),
        password:  form.password,
        firstName: form.firstName.trim() || undefined,
        lastName:  form.lastName.trim()  || undefined,
      });
      await setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    } catch (e: any) {
      const details = e?.response?.data?.details;
      const msg     = details?.length
        ? details.map((d: any) => d.message).join(" · ")
        : (e?.response?.data?.error ?? "Registration failed.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const F = ({ label, field, ...props }: { label: string; field: keyof typeof form } & any) => (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        placeholderTextColor="#9ca3af"
        value={form[field]}
        onChangeText={set(field)}
        {...props}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <View style={s.logoRow}>
          <View style={s.logoBox}><Text style={s.logoLetter}>F</Text></View>
          <Text style={s.appName}>FitAI Coach</Text>
        </View>

        <Text style={s.heading}>Create account</Text>
        <Text style={s.sub}>Start your fitness journey</Text>

        {!!error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <F label="First name" field="firstName" placeholder="Alex" autoCapitalize="words" />
          </View>
          <View style={{ flex: 1 }}>
            <F label="Last name"  field="lastName"  placeholder="Smith" autoCapitalize="words" />
          </View>
        </View>

        <F label="Email"     field="email"    placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <F label="Username"  field="username" placeholder="alexsmith"       autoCapitalize="none" />
        <F label="Password"  field="password" placeholder="••••••••"         secureTextEntry autoComplete="new-password" />
        <F label="Confirm password" field="confirm" placeholder="••••••••"  secureTextEntry returnKeyType="go" onSubmitEditing={submit} />

        <Pressable
          style={({ pressed }) => [s.btn, pressed && s.btnPressed, loading && s.btnDisabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Create Account</Text>
          }
        </Pressable>

        <Pressable style={s.linkRow} onPress={() => navigation.navigate("Login")}>
          <Text style={s.linkText}>
            Already have an account? <Text style={s.linkAccent}>Sign in</Text>
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
  root:       { flex: 1, backgroundColor: BG },
  scroll:     { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 48 },
  row:        { flexDirection: "row", gap: 12 },

  logoRow:    { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 32 },
  logoBox:    { width: 40, height: 40, backgroundColor: BRAND, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoLetter: { color: "#fff", fontWeight: "700", fontSize: 20 },
  appName:    { color: "#fff", fontWeight: "700", fontSize: 22 },

  heading:    { color: "#f9fafb", fontWeight: "700", fontSize: 28, marginBottom: 6 },
  sub:        { color: "#9ca3af", fontSize: 15, marginBottom: 28 },

  errorBox:   { backgroundColor: "#450a0a", borderWidth: 1, borderColor: "#7f1d1d", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  errorText:  { color: "#fca5a5", fontSize: 13 },

  fieldWrap:  { marginBottom: 16, flex: 1 },
  label:      { color: "#d1d5db", fontSize: 13, fontWeight: "500", marginBottom: 6 },
  input:      { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: "#f9fafb", fontSize: 15 },

  btn:        { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  btnPressed: { backgroundColor: "#15803d" },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { color: "#fff", fontWeight: "700", fontSize: 16 },

  linkRow:    { marginTop: 24, alignItems: "center" },
  linkText:   { color: "#6b7280", fontSize: 14 },
  linkAccent: { color: BRAND, fontWeight: "600" },
});
