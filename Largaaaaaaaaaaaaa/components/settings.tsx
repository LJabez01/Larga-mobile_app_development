import Feather from "@expo/vector-icons/Feather";
import { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import AboutUsScreen from "./about";
import AccountScreen from "./account";
import FAQsScreen from "./faqs";
import PreferencesScreen from "./preferences";
import { useRouter } from "expo-router";
import { useAppSession } from '@/components/providers/AppSessionProvider';
import { useLiveData } from '@/components/providers/LiveDataProvider';

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

type ActivePage = "account" | "preferences" | "faqs" | "about" | null;

const menuItems = [
  {
    id: "account" as ActivePage,
    icon: "user" as const,
    label: "Account",
    subtitle: "Profile and Information",
    color: "#16a34a",
  },
  {
    id: "preferences" as ActivePage,
    icon: "settings" as const,
    label: "Preferences",
    subtitle: "Notification and Appearance",
    color: "#0d9488",
  },
  {
    id: "faqs" as ActivePage,
    icon: "help-circle" as const,
    label: "FAQs",
    subtitle: "Frequently Asked Questions",
    color: "#2563eb",
  },
  {
    id: "about" as ActivePage,
    icon: "info" as const,
    label: "About Us",
    subtitle: "Mission, Vission, and Values",
    color: "#7c3aed",
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function SettingsDrawer({ visible, onClose }: Props) {
  const router = useRouter();
  const { isMockMode, session, signOut, resetMockState } = useAppSession();
  const { reset } = useLiveData();
  const [activePage, setActivePage] = useState<ActivePage>(null);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  if (visible) {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActivePage(null);
      onClose();
    });
  };

  if (!visible) return null;

  // If a sub-page is active, render it fullscreen inside a new modal
  if (activePage !== null) {
    return (
      <Modal
        transparent={false}
        visible={visible}
        animationType="slide"
        onRequestClose={() => setActivePage(null)}
      >
        {activePage === "account" && (
          <AccountScreen onBack={() => setActivePage(null)} />
        )}
        {activePage === "preferences" && (
          <PreferencesScreen onBack={() => setActivePage(null)} />
        )}
        {activePage === "faqs" && (
          <FAQsScreen onBack={() => setActivePage(null)} />
        )}
        {activePage === "about" && (
          <AboutUsScreen onBack={() => setActivePage(null)} />
        )}
      </Modal>
    );
  }

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        {/* Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.drawerHeaderTop}>
            <View style={styles.avatarCircle}>
              <Feather name="user" size={26} color="#ffffff" />
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <Text style={styles.drawerUserName}>{session?.displayName ?? 'My Account'}</Text>
          <Text style={styles.drawerUserEmail}>{session?.email ?? 'user@example.com'}</Text>
        </View>

        <View style={styles.drawerDivider} />

        <Text style={styles.drawerSectionTitle}>Settings</Text>

        <ScrollView style={styles.drawerBody} showsVerticalScrollIndicator={false}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuRow}
              onPress={() => setActivePage(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: item.color + "18" }]}>
                <Feather name={item.icon} size={20} color={item.color} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#d1d5db" />
            </TouchableOpacity>
          ))}

          <View style={styles.logoutSection}>
            <TouchableOpacity
              style={styles.logoutBtn}
              activeOpacity={0.8}
              onPress={async () => {
                handleClose();
                await signOut();
                router.replace('/login');
              }}
            >
              <Feather name="log-out" size={18} color="#ef4444" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

            {isMockMode ? (
              <TouchableOpacity
                style={styles.resetBtn}
                activeOpacity={0.8}
                onPress={async () => {
                  await resetMockState();
                  await reset();
                  handleClose();
                  router.replace('/login');
                }}
              >
                <Feather name="refresh-cw" size={18} color="#158251" />
                <Text style={styles.resetText}>Reset Mock State</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 20,
  },
  drawerHeader: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: "#f0fdf4",
  },
  drawerHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#158251",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#158251",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerUserName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
  },
  drawerUserEmail: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
  },
  drawerSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 8,
  },
  drawerBody: {
    flex: 1,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 14,
    backgroundColor: "#ffffff",
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    letterSpacing: -0.2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 1,
  },
  logoutSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#fef2f2",
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ef4444",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#ecfdf5",
    marginTop: 12,
  },
  resetText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#158251",
  },
});
