import React from "react";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import CompanyWorkModeTopBar from "../components/CompanyWorkModeTopBar";
import AppHeader from "../../../shared/layout/AppHeader";

const ROLES = [
  {
    id: "owner",
    name: "المالك",
    nameEn: "Owner",
    color: "#f59e0b",
    icon: "star" as const,
    perms: [
      "إدارة كاملة للمساحة",
      "إعداد السياسات والصلاحيات",
      "إدارة الفوترة والاشتراكات",
      "تعيين المشرفين والمدراء",
      "حذف الشركة",
    ],
  },
  {
    id: "admin",
    name: "المشرف",
    nameEn: "Admin",
    color: "#ef4444",
    icon: "shield-checkmark" as const,
    perms: [
      "إدارة أعضاء الفريق",
      "اعتماد الطلبات والموافقات",
      "إدارة الخدمات والإعدادات",
      "الاطلاع على التقارير الكاملة",
    ],
  },
  {
    id: "manager",
    name: "المدير",
    nameEn: "Manager",
    color: "#8b5cf6",
    icon: "people" as const,
    perms: [
      "إدارة المشاريع والمهام",
      "متابعة تسليمات الفريق",
      "تعيين المهام لأعضاء القسم",
      "مراجعة التقدم اليومي",
    ],
  },
  {
    id: "employee",
    name: "الموظف",
    nameEn: "Employee",
    color: "#3b82f6",
    icon: "person" as const,
    perms: [
      "تنفيذ المهام المسندة",
      "رفع تقارير العمل",
      "التواصل مع الفريق",
      "الوصول لمساحة العمل الخاصة",
    ],
  },
  {
    id: "member",
    name: "العضو",
    nameEn: "Member",
    color: "#6b7280",
    icon: "person-outline" as const,
    perms: [
      "عرض الملف التشغيلي",
      "التواصل مع الفريق",
      "المشاركة في المهام المفتوحة",
    ],
  },
];

export default function RolesScreen() {
  const { colors: c } = useAppTheme();

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#0b0b0b" }}>
      <CompanyWorkModeTopBar />
      <AppHeader title="الأدوار والصلاحيات" leftButton="back" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* Subtitle */}
        <AppText style={{ color: "#666", fontSize: 13, marginBottom: 20, lineHeight: 20 }}>
          يحدد الدور مستوى الوصول والصلاحيات داخل مساحة العمل. المالك هو الأعلى في التسلسل الهرمي.
        </AppText>

        {ROLES.map((role, idx) => (
          <View key={role.id} style={{ marginBottom: 14 }}>
            {/* Hierarchy connector */}
            {idx > 0 && (
              <View style={{ alignItems: "center", marginBottom: 2 }}>
                <View style={{ width: 1.5, height: 10, backgroundColor: "#222" }} />
                <Ionicons name="chevron-down" size={12} color="#333" />
              </View>
            )}

            <View style={{
              backgroundColor: "#151515",
              borderRadius: 18,
              borderWidth: 1.5,
              borderColor: role.color + "33",
              overflow: "hidden",
            }}>
              {/* Role header */}
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                padding: 16,
                backgroundColor: role.color + "0e",
              }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: role.color + "22",
                  borderWidth: 1.5, borderColor: role.color + "55",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name={role.icon} size={20} color={role.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <AppText style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>{role.name}</AppText>
                    <View style={{ backgroundColor: role.color + "22", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <AppText style={{ color: role.color, fontSize: 10, fontWeight: "700" }}>{role.nameEn}</AppText>
                    </View>
                  </View>
                  <AppText style={{ color: "#666", fontSize: 11, marginTop: 2 }}>
                    {role.perms.length} صلاحية
                  </AppText>
                </View>
              </View>

              {/* Permissions list */}
              <View style={{ padding: 14, gap: 8 }}>
                {role.perms.map((perm) => (
                  <View key={perm} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: role.color }} />
                    <AppText style={{ color: "#aaa", fontSize: 12 }}>{perm}</AppText>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
