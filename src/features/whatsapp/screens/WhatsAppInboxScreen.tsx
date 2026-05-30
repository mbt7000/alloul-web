/**
 * WhatsAppInboxScreen — WhatsApp Business Integration
 * Feature flag: WHATSAPP_INTEGRATION
 * Connects to alloul-platform whatsapp-mcp service (port 8207).
 * Displays conversation list and message thread view.
 */
import React, { useCallback, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { apiFetch } from "../../../api/client";

interface Conversation {
  phone_number: string;
  display_name: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export default function WhatsAppInboxScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: c } = useAppTheme();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch<Conversation[]>("/whatsapp/conversations").catch(() => []);
      setConversations(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = conversations.filter(c =>
    !search.trim() ||
    (c.display_name ?? c.phone_number).toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("WhatsAppThread", { phone: item.phone_number, name: item.display_name ?? item.phone_number })}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        gap: 12,
      }}
    >
      <View style={{
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: "#25D366" + "22",
        alignItems: "center", justifyContent: "center",
      }}>
        <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ color: c.textPrimary, fontSize: 15, fontWeight: "700" }}>
          {item.display_name ?? item.phone_number}
        </AppText>
        <AppText style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
          {item.last_message}
        </AppText>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <AppText style={{ color: c.textMuted, fontSize: 11 }}>
          {new Date(item.last_message_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
        </AppText>
        {item.unread_count > 0 && (
          <View style={{
            backgroundColor: "#25D366",
            borderRadius: 10,
            paddingHorizontal: 6,
            paddingVertical: 2,
            minWidth: 20,
            alignItems: "center",
          }}>
            <AppText style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
              {item.unread_count}
            </AppText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        gap: 10,
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText style={{ color: c.textPrimary, fontSize: 16, fontWeight: "700" }}>
            WhatsApp Business
          </AppText>
          <AppText style={{ color: c.textMuted, fontSize: 11 }}>صندوق الوارد</AppText>
        </View>
        <View style={{
          paddingHorizontal: 8, paddingVertical: 3,
          borderRadius: 8, backgroundColor: "#25D366" + "22",
        }}>
          <AppText style={{ color: "#25D366", fontSize: 10, fontWeight: "700" }}>
            $99/شهر
          </AppText>
        </View>
      </View>

      {/* Search */}
      <View style={{
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: c.border,
      }}>
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 8,
          backgroundColor: c.bgCard, borderRadius: 12,
          paddingHorizontal: 12, paddingVertical: 8,
        }}>
          <Ionicons name="search" size={16} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="بحث في المحادثات..."
            placeholderTextColor={c.textMuted}
            style={{ flex: 1, color: c.textPrimary, fontSize: 14 }}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.accentBlue} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Ionicons name="logo-whatsapp" size={48} color="#25D366" style={{ marginBottom: 16 }} />
          <AppText style={{ color: c.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>
            لا توجد محادثات بعد
          </AppText>
          <AppText style={{ color: c.textMuted, fontSize: 13, textAlign: "center" }}>
            ستظهر هنا رسائل WhatsApp Business الواردة من عملائك
          </AppText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.phone_number}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(true); }}
              tintColor={c.accentBlue}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
