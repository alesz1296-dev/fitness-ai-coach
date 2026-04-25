import { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  Alert, ActivityIndicator, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useAuthStore } from "../../store/authStore";
import { usersApi } from "../../api";
import type { User } from "@shared/types";

// ── Menu row ──────────────────────────────────────────────────────────────────
function MenuRow({ icon, label, sub, onPress, danger }: {
  icon: string; label: string; sub?: string; onPress: () => void; danger?: boolean;
}) {
  return (
    <Pressable style={s.menuRow} onPress={onPress}>
      <View style={[s.menuIcon, danger && { backgroundColor: "#450a0a" }]}>
        <Text style={s.menuIconText}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.menuLabel, danger && { color: "#ef4444" }]}>{label}</Text>
        {sub && <Text style={s.menuSub}>{sub}</Text>}
      </View>
      <Text style={[s.menuArrow, danger && { color: "#ef4444" }]}>›</Text>
    </Pressable>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────
function EditProfileModal({ user, visible, onClose, onSaved }: {
  user: User; visible: boolean; onClose: () => void; onSaved: (u: User) => void;
}) {
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName,  setLastName]  = useState(user.lastName  ?? "");
  const [weight,    setWeight]    = useState(user.weight?.toString()  ?? "");
  const [height,    setHeight]    = useState(user.height?.toString()  ?? "");
  const [age,       setAge]       = useState(user.age?.toString()     ?? "");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const save = async () => {
    setSaving(true); setError("");
    try {
      const res = await usersApi.updateProfile({
        firstName: firstName.trim() || undefined,
        lastName:  lastName.trim()  || undefined,
        weight:    weight  ? parseFloat(weight)  : undefined,
        height:    height  ? parseFloat(height)  : undefined,
        age:       age     ? parseInt(age)        : undefined,
      });
      onSaved(res.data.user);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modal} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={s.modalHeader}>
          <Pressable onPress={onClose}>
            <Text style={s.modalClose}>Cancel</Text>
          </Pressable>
          <Text style={s.modalTitle}>Edit Profile</Text>
          <Pressable onPress={save} disabled={saving}>
            {saving
              ? <ActivityIndicator color={BRAND} size="small" />
              : <Text style={s.modalSave}>Save</Text>
            }
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}
          {[
            { label: "First Name",  value: firstName, set: setFirstName, placeholder: "Alex",  kb: "default" as const },
            { label: "Last Name",   value: lastName,  set: setLastName,  placeholder: "Smith", kb: "default" as const },
            { label: "Weight (kg)", value: weight,    set: setWeight,    placeholder: "80",    kb: "numeric"  as const },
            { label: "Height (cm)", value: height,    set: setHeight,    placeholder: "175",   kb: "numeric"  as const },
            { label: "Age",         value: age,       set: setAge,       placeholder: "28",    kb: "numeric"  as const },
          ].map((f) => (
            <View key={f.label}>
              <Text style={s.fieldLabel}>{f.label}</Text>
              <TextInput
                style={s.fieldInput}
                placeholder={f.placeholder}
                placeholderTextColor="#6b7280"
                keyboardType={f.kb}
                value={f.value}
                onChangeText={f.set}
              />
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export function MoreScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const [showEdit,   setShowEdit]   = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <Text style={s.headerTitle}>More</Text>
        </View>

        {/* ── Profile card ───────────────────────────────────────────────── */}
        <View style={s.profileCard}>
          <View style={s.profileAvatar}>
            <Text style={s.profileAvatarText}>
              {(user?.firstName ?? user?.username ?? "?")[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>
              {user?.firstName
                ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
                : user?.username ?? "—"}
            </Text>
            <Text style={s.profileEmail}>{user?.email}</Text>
            {user?.username && (
              <Text style={s.profileUsername}>@{user.username}</Text>
            )}
          </View>
          <Pressable style={s.editBtn} onPress={() => setShowEdit(true)}>
            <Text style={s.editBtnText}>Edit</Text>
          </Pressable>
        </View>

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        {(user?.weight || user?.height || user?.age) && (
          <View style={s.statsRow}>
            {user.weight && (
              <View style={s.statItem}>
                <Text style={s.statVal}>{user.weight}kg</Text>
                <Text style={s.statLabel}>Weight</Text>
              </View>
            )}
            {user.height && (
              <View style={s.statItem}>
                <Text style={s.statVal}>{user.height}cm</Text>
                <Text style={s.statLabel}>Height</Text>
              </View>
            )}
            {user.age && (
              <View style={s.statItem}>
                <Text style={s.statVal}>{user.age}</Text>
                <Text style={s.statLabel}>Age</Text>
              </View>
            )}
            {user.fitnessLevel && (
              <View style={s.statItem}>
                <Text style={s.statVal} numberOfLines={1}>{user.fitnessLevel}</Text>
                <Text style={s.statLabel}>Level</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Fitness section ────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Fitness</Text>
        <View style={s.menuCard}>
          <MenuRow icon="🏋️" label="Workouts"  sub="Log and view training sessions"  onPress={() => {}} />
          <MenuRow icon="🥗" label="Nutrition"  sub="Track daily food and macros"      onPress={() => {}} />
          <MenuRow icon="🎯" label="Goals"      sub="Active calorie and weight goals"  onPress={() => {}} />
          <MenuRow icon="📊" label="Progress"   sub="Weight trend and stats"           onPress={() => {}} />
        </View>

        {/* ── Account section ────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Account</Text>
        <View style={s.menuCard}>
          <MenuRow icon="👤" label="Edit Profile"  sub="Update your personal info"       onPress={() => setShowEdit(true)} />
          <MenuRow icon="🔔" label="Notifications" sub="Manage reminders"                onPress={() => {}} />
          <MenuRow icon="⚙️" label="Preferences"   sub="Units, display settings"         onPress={() => {}} />
        </View>

        {/* ── Sign out ────────────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Session</Text>
        <View style={s.menuCard}>
          <MenuRow
            icon="🚪"
            label="Sign Out"
            sub={user?.email}
            onPress={handleLogout}
            danger
          />
        </View>

        {/* App version */}
        <Text style={s.version}>FitAI Coach · v1.0.0</Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {loggingOut && (
        <View style={s.logoutOverlay}>
          <ActivityIndicator color={BRAND} size="large" />
        </View>
      )}

      <EditProfileModal
        user={user!}
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={(updated) => {
          updateUser(updated);
          setShowEdit(false);
        }}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const BRAND   = "#16a34a";
const BG      = "#111827";
const SURFACE = "#1f2937";
const BORDER  = "#374151";

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: BG },
  scroll:       { flex: 1 },
  scrollContent:{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },

  header:       { marginBottom: 20 },
  headerTitle:  { color: "#f9fafb", fontSize: 22, fontWeight: "700" },

  profileCard:  { backgroundColor: SURFACE, borderRadius: 18, padding: 16,
                  flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  profileAvatar:{ width: 52, height: 52, backgroundColor: BRAND, borderRadius: 26,
                  alignItems: "center", justifyContent: "center" },
  profileAvatarText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  profileName:  { color: "#f9fafb", fontSize: 16, fontWeight: "700" },
  profileEmail: { color: "#6b7280", fontSize: 13, marginTop: 2 },
  profileUsername:{ color: "#4b5563", fontSize: 12, marginTop: 1 },
  editBtn:      { backgroundColor: "#374151", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  editBtnText:  { color: "#d1d5db", fontSize: 13, fontWeight: "600" },

  statsRow:     { flexDirection: "row", backgroundColor: SURFACE, borderRadius: 18,
                  padding: 16, marginBottom: 14, justifyContent: "space-around" },
  statItem:     { alignItems: "center" },
  statVal:      { color: "#f9fafb", fontSize: 15, fontWeight: "700" },
  statLabel:    { color: "#6b7280", fontSize: 11, marginTop: 3 },

  sectionTitle: { color: "#4b5563", fontSize: 12, fontWeight: "600", textTransform: "uppercase",
                  letterSpacing: 0.8, marginBottom: 8, marginLeft: 4, marginTop: 8 },
  menuCard:     { backgroundColor: SURFACE, borderRadius: 18, marginBottom: 14, overflow: "hidden" },
  menuRow:      { flexDirection: "row", alignItems: "center", gap: 12,
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderBottomWidth: 1, borderBottomColor: BG },
  menuIcon:     { width: 36, height: 36, backgroundColor: "#374151", borderRadius: 10,
                  alignItems: "center", justifyContent: "center" },
  menuIconText: { fontSize: 18 },
  menuLabel:    { color: "#f9fafb", fontSize: 15, fontWeight: "500" },
  menuSub:      { color: "#6b7280", fontSize: 12, marginTop: 2 },
  menuArrow:    { color: "#4b5563", fontSize: 18 },

  version:      { color: "#374151", fontSize: 12, textAlign: "center", marginTop: 8 },

  logoutOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)",
                  alignItems: "center", justifyContent: "center" },

  modal:        { flex: 1, backgroundColor: BG },
  modalHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
                  borderBottomWidth: 1, borderBottomColor: BORDER },
  modalClose:   { color: "#6b7280", fontSize: 14, fontWeight: "600" },
  modalTitle:   { color: "#f9fafb", fontSize: 16, fontWeight: "700" },
  modalSave:    { color: BRAND, fontSize: 14, fontWeight: "700" },
  modalContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },

  errorBox:     { backgroundColor: "#450a0a", borderWidth: 1, borderColor: "#7f1d1d",
                  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  errorText:    { color: "#fca5a5", fontSize: 13 },
  fieldLabel:   { color: "#d1d5db", fontSize: 13, fontWeight: "500", marginBottom: 6, marginTop: 16 },
  fieldInput:   { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 13, color: "#f9fafb", fontSize: 15 },
});
