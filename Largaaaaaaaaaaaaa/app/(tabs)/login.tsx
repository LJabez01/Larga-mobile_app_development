import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';

import FormErrorText from '../../components/FormErrorText';
import { getDefaultAppPath, useAppSession } from '@/components/providers/AppSessionProvider';
import { validateLoginForm } from '../../validations/validation';

const PRIMARY = '#10B981';
const ACCENT = '#059669';
const BG_LIGHT = '#F0FDF4';
const TEXT = '#111827';
const ERROR_COLOR = '#EF4444';

function getFriendlyAuthError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { isMockMode, session, signIn, startDemoSession, status } = useAppSession();

  const validation = useMemo(
    () => validateLoginForm({ email, password }),
    [email, password]
  );

  if (status === 'signedIn' && session) {
    return <Redirect href={getDefaultAppPath(session.role)} />;
  }

  const handleLogin = async () => {
    setSubmitted(true);

    if (!validation.isValid) {
      return;
    }

    setAuthError(null);
    setIsSubmitting(true);

    try {
      await signIn({ email, password });
      router.push('/guideline');
    } catch (error) {
      setAuthError(getFriendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartDemo = async (role: 'commuter' | 'driver') => {
    setAuthError(null);

    try {
      await startDemoSession(role);
      router.push('/guideline');
    } catch (error) {
      setAuthError(getFriendlyAuthError(error));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Ionicons name="people-outline" size={36} color="#fff" />
          </View>
        </View>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Sign in to continue to your account
        </Text>
      </View>

      <View style={styles.form}>
        {isMockMode ? (
          <View style={styles.devCard}>
            <Text style={styles.devTitle}>Developer Testing Mode</Text>
            <Text style={styles.devText}>
              Mock mode is active. Use the tester entry for fast role switching, or sign in with any valid-looking email.
            </Text>
            <View style={styles.devButtons}>
              <TouchableOpacity
                style={[styles.devButton, styles.devButtonPrimary]}
                onPress={() => router.push('/roleselection')}
              >
                <Text style={styles.devButtonPrimaryText}>Open Tester Entry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => handleStartDemo('commuter')}
              >
                <Text style={styles.devButtonText}>Demo Commuter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => handleStartDemo('driver')}
              >
                <Text style={styles.devButtonText}>Demo Driver</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          {submitted && <FormErrorText error={validation.fieldErrors?.email} />}
          <View
            style={[
              styles.inputRow,
              submitted && validation.fieldErrors?.email && { borderColor: ERROR_COLOR, borderWidth: 1.5 },
            ]}
          >
            <MaterialCommunityIcons name="email-outline" size={20} color={PRIMARY} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              onBlur={() => setTouched({ ...touched, email: true })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          {submitted && <FormErrorText error={validation.fieldErrors?.password} />}
          <View
            style={[
              styles.inputRow,
              submitted && validation.fieldErrors?.password && { borderColor: ERROR_COLOR, borderWidth: 1.5 },
            ]}
          >
            <Ionicons name="lock-closed-outline" size={20} color={PRIMARY} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onBlur={() => setTouched({ ...touched, password: true })}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((showing) => !showing)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color={PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.forgotRow} onPress={() => router.push('/forgot-password')}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} activeOpacity={0.85}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.loginText}>Sign In</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
        <FormErrorText error={authError ?? undefined} />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/registration')}>
            <Text style={styles.footerLink}>Create one</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: PRIMARY,
    paddingTop: 64,
    paddingBottom: 36,
    alignItems: 'center',
  },
  logoWrap: { marginBottom: 18 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: '#D1FAE5', fontSize: 13, fontWeight: '600' },
  form: { paddingHorizontal: 20, paddingTop: 28 },
  devCard: {
    marginBottom: 20,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  devTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 6,
  },
  devText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#166534',
  },
  devButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  devButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  devButtonPrimary: {
    backgroundColor: PRIMARY,
  },
  devButtonText: {
    color: '#166534',
    fontWeight: '700',
    fontSize: 13,
  },
  devButtonPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E6F4EA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    backgroundColor: BG_LIGHT,
  },
  icon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: TEXT, fontWeight: '500' },
  forgotRow: { alignItems: 'flex-end', marginBottom: 18 },
  forgot: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  loginButton: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  loginText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, alignItems: 'center' },
  footerText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  footerLink: { color: PRIMARY, fontSize: 14, fontWeight: '800' },
});
