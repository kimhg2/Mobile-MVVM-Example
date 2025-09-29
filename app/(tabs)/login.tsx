import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthRepositoryImpl } from "@data/auth/repositories/AuthRepository.impl";
import { tokenStore } from "@data/auth/stores/TokenStore.secure";
import { LoginWithPassword } from "@domain/auth/usecases/LoginWithPassword.usecase";
import { useLoginViewModel } from "@presentation/auth/viewmodels/useLogin.viewmodel";
import { useNetwork } from "@/hooks/useNetwork";

export default function LoginScreen() {
  // 간단 DI (Composition Root에서 주입 권장)
  const vm = useLoginViewModel({
    loginUC: new LoginWithPassword(new AuthRepositoryImpl()),
  });
  const network = useNetwork();
  const isOffline = !network.isOnline;

  // DEV: SecureStore 저장 여부 확인
  const [storedInfo, setStoredInfo] = React.useState<string>("");
  const checkStored = async () => {
    try {
      const rt = await tokenStore.getRefreshToken();
      console.log(rt)
      if (rt) {
        const masked = rt.length > 12 ? `${rt.slice(0, 4)}…${rt.slice(-4)}` : rt;
        setStoredInfo(`Stored refreshToken: ${masked}`);
      } else {
        setStoredInfo("No refreshToken in SecureStore");
      }
    } catch (e: any) {
      setStoredInfo(`Error reading store: ${e?.message ?? String(e)}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
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
          disabled={vm.loading || isOffline}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            (vm.loading || isOffline) && styles.buttonDisabled,
          ]}
        >
          {vm.loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </Pressable>
        {isOffline && <Text style={styles.offlineText}>You appear to be offline. Check your connection.</Text>}
        {!!vm.error && <Text style={styles.errorText}>{vm.error}</Text>}

        {__DEV__ && (
          <>
            <Pressable onPress={checkStored} style={[styles.button, styles.secondaryButton]}>
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Check SecureStore</Text>
            </Pressable>
            {!!storedInfo && <Text style={styles.helperText}>{storedInfo}</Text>}
          </>
        )}
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
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
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
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 8,
  },
  secondaryButtonText: {
    color: "#111827",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#EF4444",
    marginTop: 4,
    textAlign: "center",
  },
  offlineText: {
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  helperText: {
    color: "#6B7280",
    marginTop: 6,
    fontSize: 12,
    textAlign: "center",
  },
});
