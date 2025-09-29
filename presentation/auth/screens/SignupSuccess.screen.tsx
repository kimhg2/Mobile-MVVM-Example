import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { User } from "@domain/auth/entities/User.entity";

export function SignupSuccessScreen({ user, onContinue }: { user: User; onContinue(): void }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>🎉</Text>
        <Text style={styles.title}>Welcome aboard!</Text>
        <Text style={styles.subtitle}>
          {`Signup complete for ${user.email.value}. You can now log in with your new account.`}
        </Text>
        <Pressable onPress={onContinue} style={styles.button}>
          <Text style={styles.buttonText}>Go to login</Text>
        </Pressable>
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
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
    paddingHorizontal: 24,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
