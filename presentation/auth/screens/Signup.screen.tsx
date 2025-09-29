import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Link, useRouter } from "expo-router";

import { AuthRepositoryImpl } from "@data/auth/repositories/AuthRepository.impl";
import { SignupWithPassword } from "@domain/auth/usecases/SignupWithPassword.usecase";

import { useSignupViewModel } from "@presentation/auth/viewmodels/useSignup.viewmodel";
import { useNetwork } from "@/hooks/useNetwork";

import { SignupFailureScreen } from "./SignupFailure.screen";
import { SignupLoadingScreen } from "./SignupLoading.screen";
import { SignupSuccessScreen } from "./SignupSuccess.screen";

export default function SignupScreen() {
  const router = useRouter();
  const vm = useSignupViewModel({
    signupUC: new SignupWithPassword(new AuthRepositoryImpl()),
  });
  const network = useNetwork();
  const isOffline = !network.isOnline;

  if (vm.status === "loading") {
    return <SignupLoadingScreen />;
  }

  if (vm.status === "success" && vm.user) {
    return (
      <SignupSuccessScreen
        user={vm.user}
        onContinue={() => {
          vm.reset();
          router.replace("/(tabs)/login");
        }}
      />
    );
  }

  if (vm.status === "error") {
    return <SignupFailureScreen message={vm.error ?? "Signup failed"} onRetry={vm.reset} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>Create an account</Text>
        <Text style={styles.subtitle}>Enter your email and password to get started.</Text>

        <TextInput
          placeholder="Email"
          value={vm.email}
          onChangeText={vm.setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          keyboardAppearance="default"
        />
        <TextInput
          placeholder="Password"
          value={vm.password}
          secureTextEntry
          onChangeText={vm.setPassword}
          style={styles.input}
          returnKeyType="done"
          keyboardAppearance="default"
        />

        <Pressable
          onPress={vm.submit}
          disabled={isOffline}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            isOffline && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>Sign up</Text>
        </Pressable>

        {isOffline && <Text style={styles.offlineText}>You are offline. Connect to continue.</Text>}
        <Text style={styles.helperText}>
          Already have an account? {" "}
          <Link href="/(tabs)/login" style={styles.linkText}>
            Log in
          </Link>
        </Text>
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
    maxWidth: 380,
    gap: 12,
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    fontSize: 16,
  },
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  helperText: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 8,
  },
  offlineText: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 4,
  },
  linkText: {
    color: "#111827",
    fontWeight: "600",
  },
});
