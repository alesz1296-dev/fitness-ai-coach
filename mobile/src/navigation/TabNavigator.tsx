import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";

// Screens — placeholders until Phase 4
import { DashboardScreen }  from "../screens/main/DashboardScreen";
import { WorkoutsScreen }   from "../screens/main/WorkoutsScreen";
import { NutritionScreen }  from "../screens/main/NutritionScreen";
import { ChatScreen }       from "../screens/main/ChatScreen";
import { MoreScreen }       from "../screens/main/MoreScreen";

export type TabParamList = {
  Dashboard: undefined;
  Workouts:  undefined;
  Nutrition: undefined;
  Chat:      undefined;
  More:      undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const BRAND = "#16a34a";
const MUTED = "#9ca3af";

const icon = (emoji: string, focused: boolean) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
);

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   BRAND,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          backgroundColor: "#111827",
          borderTopColor:  "#1f2937",
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, marginBottom: 2 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ focused }) => icon("⊞",  focused) }}
      />
      <Tab.Screen
        name="Workouts"
        component={WorkoutsScreen}
        options={{ tabBarIcon: ({ focused }) => icon("🏋️", focused) }}
      />
      <Tab.Screen
        name="Nutrition"
        component={NutritionScreen}
        options={{ tabBarIcon: ({ focused }) => icon("🥗", focused) }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: "AI Coach",
          tabBarIcon: ({ focused }) => icon("🤖", focused),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{ tabBarIcon: ({ focused }) => icon("⋯",  focused) }}
      />
    </Tab.Navigator>
  );
}
