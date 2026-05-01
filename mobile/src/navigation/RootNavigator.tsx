import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import { setSessionExpiredHandler } from "../lib/axios";
import { AuthNavigator } from "./AuthNavigator";
import { TabNavigator } from "./TabNavigator";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated } = useAuthStore();
  const navigationRef = useRef<any>(null);

  // When the axios interceptor detects an expired session it calls this,
  // which navigates to Auth from anywhere in the app.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      navigationRef.current?.reset({ index: 0, routes: [{ name: "Auth" }] });
    });
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
