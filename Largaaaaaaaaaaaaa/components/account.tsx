// Account Screen - displays the signed-in user's profile details and basic account actions.
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAppSession } from '@/components/providers/AppSessionProvider';

type Props = {
  onBack: () => void;
};

const PASSWORD_ROW_MESSAGE = 'Password changes are not wired yet.';
const EMAIL_ROW_MESSAGE = 'Email changes are not wired yet.';

// Account Screen - shows the live session profile and lets the user update only their display name for now.
export default function AccountScreen({ onBack }: Props) {
  const { session, updateProfile } = useAppSession();
  const [fullName, setFullName] = useState(session?.displayName ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFullName(session?.displayName ?? '');
  }, [session?.displayName]);

  const trimmedFullName = fullName.trim();
  const currentDisplayName = session?.displayName ?? '';
  const email = session?.email ?? '';
  const hasNameChange = trimmedFullName.length > 0 && trimmedFullName !== currentDisplayName;

  async function handleSaveChanges() {
    if (!session) {
      Alert.alert('Unavailable', 'Sign in again to update your account details.');
      return;
    }

    if (!trimmedFullName) {
      Alert.alert('Full Name Required', 'Enter your full name before saving.');
      return;
    }

    if (!hasNameChange) {
      Alert.alert('No Changes Yet', 'Update your name first before saving.');
      return;
    }

    try {
      setIsSaving(true);
      await updateProfile(trimmedFullName);
      Alert.alert('Profile Updated', 'Your account name is now updated.');
    } catch (error) {
      Alert.alert(
        'Update Failed',
        error instanceof Error ? error.message : 'We could not update your account right now.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  const infoItems = [
    {
      icon: 'key' as const,
      label: 'Password',
      subtitle: PASSWORD_ROW_MESSAGE,
    },
    {
      icon: 'mail' as const,
      label: 'Email',
      subtitle: EMAIL_ROW_MESSAGE,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Profile</Text>

        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Feather name="user" size={28} color="#158251" />
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.avatarName}>{currentDisplayName || 'LARGA User'}</Text>
              <Text style={styles.avatarEmail}>{email || 'No email available'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isSaving}
              placeholder="Enter your full name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.input, styles.readOnlyInput]}
              value={email}
              editable={false}
              selectTextOnFocus={false}
              placeholder="No email available"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.helperText}>Email is shown from your signed-in account and is read-only for now.</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Information</Text>

        <View style={styles.card}>
          {infoItems.map((item, index) => (
            <View key={item.label}>
              <TouchableOpacity
                style={styles.infoRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert(item.label, item.subtitle)}
              >
                <View style={styles.infoIconWrap}>
                  <Feather name={item.icon} size={20} color="#158251" />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoSubtitle}>{item.subtitle}</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#9ca3af" />
              </TouchableOpacity>
              {index < infoItems.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={styles.deleteBtn}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert(
                'Delete Account',
                'Delete account is not wired yet. Keep this disabled until the real flow exists.',
              )
            }
          >
            <Text style={styles.deleteBtnText}>Delete Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              (!hasNameChange || isSaving) && styles.saveBtnDisabled,
            ]}
            activeOpacity={0.8}
            disabled={!hasNameChange || isSaving}
            onPress={() => {
              void handleSaveChanges();
            }}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
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
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#158251',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: '#f0fdf4',
  },
  avatarInfo: {
    flex: 1,
  },
  avatarName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  avatarEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  readOnlyInput: {
    color: '#6b7280',
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
    marginTop: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  infoSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#f9fafb',
    marginLeft: 50,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  saveBtn: {
    flex: 1,
    minHeight: 50,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#158251',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#158251',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 32,
  },
});
