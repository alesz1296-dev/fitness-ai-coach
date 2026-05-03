export const APP_EVENTS = {
  nutritionSync: "fitai:nutrition-sync",
  foodLogged: "fitai:food-logged",
  weightLogged: "fitai:weight-logged",
  appPrefsChanged: "fitai:app-prefs-changed",
  dataChanged: "fitai:data-changed",
} as const;

export type NutritionSyncSource =
  | "food"
  | "water"
  | "meal-plan"
  | "dish"
  | "favorite"
  | "custom-food"
  | "supplement"
  | "manual";

export function emitNutritionSync(source: NutritionSyncSource) {
  window.dispatchEvent(
    new CustomEvent(APP_EVENTS.nutritionSync, { detail: { source } }),
  );
  emitDataChanged(source);
  window.dispatchEvent(new Event(APP_EVENTS.foodLogged));
}

export function emitFoodLogged() {
  window.dispatchEvent(new Event(APP_EVENTS.foodLogged));
}

export function emitWeightLogged(weight?: number) {
  if (typeof weight === "number") {
    window.dispatchEvent(
      new CustomEvent(APP_EVENTS.weightLogged, { detail: { weight } }),
    );
    emitDataChanged("weight");
    return;
  }

  window.dispatchEvent(new Event(APP_EVENTS.weightLogged));
  emitDataChanged("weight");
}

export function emitAppPrefsChanged() {
  window.dispatchEvent(new Event(APP_EVENTS.appPrefsChanged));
}

export function emitDataChanged(source: string) {
  window.dispatchEvent(
    new CustomEvent(APP_EVENTS.dataChanged, { detail: { source } }),
  );
}
