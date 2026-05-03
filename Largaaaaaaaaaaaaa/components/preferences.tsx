import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Props = {
  onBack: () => void;
};

export default function PreferencesScreen({ onBack }: Props) {
  const [appearance, setAppearance] = useState<"dark" | "light">("dark");

  const notificationItems = [
    {
      icon: "bell" as const,
      label: "Notification Settings",
      subtitle: "Mute or Unmute the notification",
    },
    {
      icon: "volume-2" as const,
      label: "Notification sound",
      subtitle: "Change your notification sound",
    },
    {
      icon: "clock" as const,
      label: "Notification Time",
      subtitle: "Change the interval of your notification",
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Notification Section */}
        <Text style={styles.sectionLabel}>Notification</Text>

        <View style={styles.card}>
          {notificationItems.map((item, index) => (
            <View key={item.label}>
              <TouchableOpacity style={styles.row} activeOpacity={0.7}>
                <View style={styles.iconWrap}>
                  <Feather name={item.icon} size={20} color="#158251" />
                </View>
                <View style={styles.textWrap}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#9ca3af" />
              </TouchableOpacity>
              {index < notificationItems.length - 1 && (
                <View style={styles.rowDivider} />
              )}
            </View>
          ))}
        </View>

        {/* Appearance Section */}
        <Text style={styles.sectionLabel}>Appearance</Text>

        <View style={styles.appearanceRow}>
          <TouchableOpacity
            style={[
              styles.appearanceBtn,
              appearance === "dark" && styles.appearanceBtnActive,
            ]}
            onPress={() => setAppearance("dark")}
            activeOpacity={0.8}
          >
            {appearance === "dark" && (
              <View style={styles.checkBadge}>
                <Feather name="check" size={11} color="#158251" />
              </View>
            )}
            <Feather
              name="moon"
              size={18}
              color={appearance === "dark" ? "#158251" : "#9ca3af"}
              style={styles.appearanceIcon}
            />
            <Text
              style={[
                styles.appearanceBtnText,
                appearance === "dark" && styles.appearanceBtnTextActive,
              ]}
            >
              Dark Mode
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.appearanceBtn,
              appearance === "light" && styles.appearanceBtnActive,
            ]}
            onPress={() => setAppearance("light")}
            activeOpacity={0.8}
          >
            {appearance === "light" && (
              <View style={styles.checkBadge}>
                <Feather name="check" size={11} color="#158251" />
              </View>
            )}
            <Feather
              name="sun"
              size={18}
              color={appearance === "light" ? "#158251" : "#9ca3af"}
              style={styles.appearanceIcon}
            />
            <Text
              style={[
                styles.appearanceBtnText,
                appearance === "light" && styles.appearanceBtnTextActive,
              ]}
            >
              Light Mode
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 36,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  rowSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#f9fafb",
    marginLeft: 50,
  },
  appearanceRow: {
    flexDirection: "row",
    gap: 12,
  },
  appearanceBtn: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    position: "relative",
  },
  appearanceBtnActive: {
    borderColor: "#158251",
    backgroundColor: "#f0fdf4",
  },
  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  appearanceIcon: {
    marginBottom: 6,
  },
  appearanceBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
  },
  appearanceBtnTextActive: {
    color: "#158251",
  },
});