// Registration Screen - creates commuter accounts for self-service signup.
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import FormErrorText from '../../components/FormErrorText';
import { getDefaultAppPath, useAppSession } from '@/components/providers/AppSessionProvider';
import styles from './registration.styles';
import { validateRegistrationForm } from '../../validations/validation';

const PRIMARY_COLOR = '#10B981';
const ERROR_COLOR = '#EF4444';

export default function CreateAccountScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { register, session, status } = useAppSession();

  const validation = useMemo(
    () =>
      validateRegistrationForm({
        username,
        email,
        password,
        confirmPassword,
        selectedRole: 'Commuter',
        agreed,
      }),
    [username, email, password, confirmPassword, agreed]
  );

  if (status === 'signedIn' && session) {
    return <Redirect href={getDefaultAppPath(session.role)} />;
  }

  const handleCreateAccount = async () => {
    setSubmitted(true);

    if (!validation.isValid) {
      return;
    }

    setAuthError(null);
    setIsSubmitting(true);

    try {
      await register({
        email,
        password,
        displayName: username,
      });
      router.push('/guideline');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="person-add-outline" size={40} color="#fff" />
            </View>
          </View>
          <Text style={styles.headerText}>Create Your Account</Text>
          <Text style={styles.headerSubtext}>Public signup creates a commuter account.</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View>
              <View
                style={[
                  styles.inputRow,
                  submitted && validation.fieldErrors?.username && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                ]}
              >
                <Ionicons name="person-circle-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#9CA3AF"
                  value={username}
                  onChangeText={setUsername}
                  onBlur={() => setTouched({ ...touched, username: true })}
                  autoCapitalize="none"
                />
              </View>
              {submitted && <FormErrorText error={validation.fieldErrors?.username} />}
            </View>

            <View>
              <View
                style={[
                  styles.inputRow,
                  submitted && validation.fieldErrors?.email && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                ]}
              >
                <MaterialCommunityIcons name="email-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  onBlur={() => setTouched({ ...touched, email: true })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {submitted && <FormErrorText error={validation.fieldErrors?.email} />}
            </View>

            <View>
              <View
                style={[
                  styles.inputRow,
                  submitted && validation.fieldErrors?.password && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  onBlur={() => setTouched({ ...touched, password: true })}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color={PRIMARY_COLOR} />
                </TouchableOpacity>
              </View>
              {submitted && <FormErrorText error={validation.fieldErrors?.password} />}
            </View>

            <View>
              <View
                style={[
                  styles.inputRow,
                  submitted && validation.fieldErrors?.confirmPassword && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onBlur={() => setTouched({ ...touched, confirmPassword: true })}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color={PRIMARY_COLOR} />
                </TouchableOpacity>
              </View>
              {submitted && <FormErrorText error={validation.fieldErrors?.confirmPassword} />}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Type</Text>
            <View style={[styles.inputRow, styles.inputRowActive]}>
              <MaterialCommunityIcons name="account-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
              <Text style={styles.input}>Commuter</Text>
            </View>
            <Text style={{ color: '#6B7280', fontSize: 13, lineHeight: 20 }}>
              Driver and admin accounts are assigned through a trusted operator path after verification.
            </Text>
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreed(!agreed)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsLink}>Terms and Conditions</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
            {submitted && <FormErrorText error={validation.fieldErrors?.agreed} />}
          </View>

          <TouchableOpacity style={styles.signUpButton} activeOpacity={0.85} onPress={handleCreateAccount}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.signUpText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
          <FormErrorText error={authError ?? undefined} />

          <View style={styles.signInContainer}>
            <Text style={styles.signInPrompt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.signInLink}>Sign in here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
