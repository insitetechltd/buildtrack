import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  OwnerOpsError,
  searchOwnerUsers,
  type OwnerSearchUser,
} from "../../lib/fetchOwnerOpsRead";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "UserSearch">;

export default function UserSearchScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [users, setUsers] = useState<OwnerSearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const onSearch = async () => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      setUsers(await searchOwnerUsers(supabase, email.trim()));
    } catch (err) {
      setUsers([]);
      setError(err instanceof OwnerOpsError ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-user-search__root">
      <View style={s.header}>
        <Pressable
          testID="owner-user-search__back"
          onPress={() => navigation.goBack()}
          style={s.back}
        >
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <Text style={s.title}>Find user</Text>
        <View style={s.backSpacer} />
      </View>
      <FlatList
        contentContainerStyle={s.scroll}
        data={users}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <View style={s.banner}>
              <Text style={s.bannerText}>
                Email exact match only (full address). Wildcards not allowed.
              </Text>
            </View>
            <TextInput
              testID="owner-user-search__email"
              style={s.search}
              placeholder="user@company.com"
              placeholderTextColor="#8AA3AD"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={() => void onSearch()}
              returnKeyType="search"
            />
            <Pressable
              testID="owner-user-search__submit"
              onPress={() => void onSearch()}
              style={[s.retry, { marginBottom: 12, alignSelf: "stretch", alignItems: "center" }]}
            >
              <Text style={s.retryText}>Search</Text>
            </Pressable>
            {loading ? (
              <View style={s.center}>
                <ActivityIndicator size="large" color="#0A556B" />
              </View>
            ) : null}
            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}
            {searched && !loading && !error && users.length === 0 ? (
              <Text style={s.meta} testID="owner-user-search__empty">
                No users matched.
              </Text>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            style={s.card}
            testID={`owner-user-search__row_${item.id}`}
            onPress={() => {
              if (!item.companyId) return;
              navigation.navigate("UserDetail", {
                companyId: item.companyId,
                companyName: item.companyName ?? "Company",
                userId: item.id,
                userName: item.name,
              });
            }}
          >
            <Text style={s.cardTitle}>{item.name}</Text>
            <Text style={s.cardSub}>{item.email}</Text>
            <Text style={s.rowMeta}>
              {item.companyName ?? "No company"} · {item.role}
              {!item.isActive ? " · inactive" : ""}
              {item.isPending ? " · pending" : ""}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
