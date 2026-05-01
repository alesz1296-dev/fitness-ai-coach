import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "./src/store/authStore";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initialize().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: "#111827", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <RootNavigator />
    </>
  );
}
