import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function SignupLoadingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.title}>Creating your account…</Text>
        <Text style={styles.subtitle}>Please wait while we complete the signup process.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  card: {
    width: "100%",
    maxWidth: 320,
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
  },
});
