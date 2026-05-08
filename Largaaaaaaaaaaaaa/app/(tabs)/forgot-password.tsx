import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import FormErrorText from '../../components/FormErrorText';
import { validateForgotPasswordForm } from '../../validations/validation';

const PRIMARY = '#10B981';
const BG_LIGHT = '#F7FEF8';
const TEXT = '#0F172A';
const ERROR_COLOR = '#EF4444';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const router = useRouter();

  // Real-time validation
  const validation = useMemo(
    () => validateForgotPasswordForm({ email }),
    [email]
  );

  const handleSend = () => {
    setSubmitted(true);
    if (validation.isValid) {
      setSent(true);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="lock-reset" size={36} color="#fff" />
        </View>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>Enter your email to receive reset instructions</Text>
      </View>

      <View style={styles.content}>
        {!sent ? (
          <>
            <View>
              <View
                style={[
                  styles.inputRow,
                  submitted && validation.fieldErrors?.email && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                ]}
              >
                <MaterialCommunityIcons name="email-outline" size={20} color={PRIMARY} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  onBlur={() => setTouched({ ...touched, email: true })}
                  autoCapitalize="none"
                />
              </View>
              {submitted && <FormErrorText error={validation.fieldErrors?.email} />}
            </View>

            <TouchableOpacity style={styles.sendButton} onPress={handleSend} activeOpacity={0.85}>
              <Text style={styles.sendText}>Send Reset Link</Text>
              <Ionicons name="send" size={16} color="#fff" />
            </TouchableOpacity>

            <View style={styles.linksRow}>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.link}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.sentBox}>
            <MaterialCommunityIcons name="check-circle-outline" size={48} color={PRIMARY} />
            <Text style={styles.sentTitle}>Check your inbox</Text>
            <Text style={styles.sentText}>We’ve sent a password reset link to {email || 'your email'}.</Text>
            <TouchableOpacity style={styles.sentButton} onPress={() => router.push('/login')}>
              <Text style={styles.sentButtonText}>Return to Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', paddingTop: 56, paddingBottom: 24, backgroundColor: '#fff' },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 26, fontWeight: '800', color: TEXT, marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 40 },

  content: { paddingHorizontal: 20, paddingTop: 28 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#E6F4EA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    backgroundColor: BG_LIGHT,
    marginBottom: 16,
  },
  icon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: TEXT, fontWeight: '500' },

  sendButton: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sendText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  linksRow: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 6 },
  link: { color: PRIMARY, fontWeight: '700', fontSize: 14 },

  sentBox: { alignItems: 'center', paddingTop: 20 },
  sentTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginTop: 12 },
  sentText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, paddingHorizontal: 28 },
  sentButton: { marginTop: 20, backgroundColor: PRIMARY, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  sentButtonText: { color: '#fff', fontWeight: '700' },
});
