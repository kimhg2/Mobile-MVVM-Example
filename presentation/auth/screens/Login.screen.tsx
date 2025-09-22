import React from "react";
import { Button, Text, TextInput, View } from "react-native";

import { AuthRepositoryImpl } from "@data/auth/repositories/AuthRepository.impl";
import { LoginWithPassword } from "@domain/auth/usecases/LoginWithPassword.usecase";
import { useLoginViewModel } from "../viewmodels/useLogin.viewmodel";

export default function LoginScreen() {
  // 간단 DI (Composition Root에서 주입 권장)
  const vm = useLoginViewModel({
    loginUC: new LoginWithPassword(new AuthRepositoryImpl()),
  });

  return (
    <View>
      <TextInput placeholder="email" value={vm.email} onChangeText={vm.setEmail} />
      <TextInput placeholder="password" value={vm.password} secureTextEntry onChangeText={vm.setPassword} />
      <Button title={vm.loading ? "..." : "Login"} onPress={vm.submit} />
      {!!vm.error && <Text>{vm.error}</Text>}
    </View>
  );
}
