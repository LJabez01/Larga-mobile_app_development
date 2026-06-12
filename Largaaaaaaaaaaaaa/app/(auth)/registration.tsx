// Registration Screen - restores the original multi-role form UI while keeping current auth progress unchanged.
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import { Redirect, useRouter, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import ImageCropper from '../../components/ImageCropper';
import FormErrorText from '../../components/FormErrorText';
import { getDefaultAppPath, useAppSession } from '@/components/providers/AppSessionProvider';
import {
  MAX_USERNAME_LENGTH,
  normalizePasswordInput,
  normalizeUsernameInput,
  sanitizeUsernameDraft,
} from '@/lib/domain/auth-inputs';
import styles from './registration.styles';
import { validateRegistrationForm, type RegistrationRole, type VehicleType } from '../../validations/validation';

const PRIMARY_COLOR = '#10B981';
const ERROR_COLOR = '#EF4444';

// Create Account Screen - collects commuter and optional driver registration details.
export default function CreateAccountScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleOpen, setRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RegistrationRole>('');
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('');
  const [plateNumber, setPlateNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [idImage, setIdImage] = useState<string | null>(null);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { register, session, status } = useAppSession();

  const needsDriverFields = selectedRole === 'Driver' || selectedRole === 'Both';

  const validation = useMemo(
    () =>
      validateRegistrationForm({
        username,
        email,
        password,
        confirmPassword,
        selectedRole,
        selectedVehicle,
        plateNumber,
        licenseNumber,
        idImage,
        agreed,
      }),
    [
      username,
      email,
      password,
      confirmPassword,
      selectedRole,
      selectedVehicle,
      plateNumber,
      licenseNumber,
      idImage,
      agreed,
    ],
  );

  if (status === 'signedIn' && session) {
    return <Redirect href={getDefaultAppPath(session) as Href} />;
  }

  // Registration ID Picker - requests media permissions and starts camera or gallery capture for driver IDs.
  async function pickImage() {
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();

    if (galleryStatus !== 'granted' || cameraStatus !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera and photo access to upload your ID.');
      return;
    }

    Alert.alert('Upload ID', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 1,
          });

          if (!result.canceled) {
            setCroppingImage(result.assets[0]?.uri ?? null);
            setShowCropper(true);
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 1,
          });

          if (!result.canceled) {
            setCroppingImage(result.assets[0]?.uri ?? null);
            setShowCropper(true);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // Role Selection Handler - updates the requested role and clears driver-only fields for commuters.
  function handleRoleSelection(role: RegistrationRole) {
    setSelectedRole(role);
    setRoleOpen(false);

    if (role === 'Commuter') {
      setSelectedVehicle('');
      setPlateNumber('');
      setLicenseNumber('');
      setVehicleOpen(false);
      setIdImage(null);
    }
  }

  // Registration ID Crop Complete - stores the cropped driver ID image for submission.
  function handleCropComplete(croppedUri: string) {
    setIdImage(croppedUri);
    setShowCropper(false);
    setCroppingImage(null);
  }

  // Account Creation Submit - validates the form and creates the requested Firebase-backed account.
  const handleCreateAccount = async () => {
    setSubmitted(true);

    if (!validation.isValid) {
      return;
    }

    if (!selectedRole) {
      return;
    }

    setAuthError(null);
    setIsSubmitting(true);

    try {
      await register({
        email,
        password,
        displayName: normalizeUsernameInput(username),
        requestedRole: selectedRole,
        selectedVehicle,
        plateNumber,
        licenseNumber,
        idImageUri: idImage,
      });
      router.push('/guideline');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'We could not create your account. Please try again.');
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
              <Ionicons name="checkmark-done-outline" size={40} color="#fff" />
            </View>
          </View>
          <Text style={styles.headerText}>Create Your Account</Text>
          <Text style={styles.headerSubtext}>Join us today and start your journey</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputGroup}>
              {submitted && <FormErrorText error={validation.fieldErrors?.username} />}
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
                  onChangeText={(value) => setUsername(sanitizeUsernameDraft(value))}
                  onBlur={() => {
                    setUsername((currentValue) => normalizeUsernameInput(currentValue));
                    setTouched({ ...touched, username: true });
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={MAX_USERNAME_LENGTH}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              {submitted && <FormErrorText error={validation.fieldErrors?.email} />}
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
            </View>

            <View style={styles.inputGroup}>
              {submitted && <FormErrorText error={validation.fieldErrors?.password} />}
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
                  onChangeText={(value) => setPassword(normalizePasswordInput(value))}
                  onBlur={() => setTouched({ ...touched, password: true })}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color={PRIMARY_COLOR} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              {submitted && <FormErrorText error={validation.fieldErrors?.confirmPassword} />}
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
                  onChangeText={(value) => setConfirmPassword(normalizePasswordInput(value))}
                  onBlur={() => setTouched({ ...touched, confirmPassword: true })}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color={PRIMARY_COLOR} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Type</Text>

            <View style={styles.inputGroup}>
              {submitted && <FormErrorText error={validation.fieldErrors?.selectedRole} />}
              <TouchableOpacity
                style={[
                  styles.inputRow,
                  roleOpen && styles.inputRowActive,
                  submitted && validation.fieldErrors?.selectedRole && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                ]}
                onPress={() => {
                  setRoleOpen(!roleOpen);
                  setVehicleOpen(false);
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="briefcase-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
                <Text style={[styles.input, !selectedRole && { color: '#9CA3AF' }]}>
                  {selectedRole || 'Select Your Role'}
                </Text>
                <Ionicons name={roleOpen ? 'chevron-up' : 'chevron-down'} size={20} color={PRIMARY_COLOR} />
              </TouchableOpacity>
            </View>

            {roleOpen ? (
              <View style={styles.dropdown}>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => handleRoleSelection('Driver')}>
                  <MaterialCommunityIcons name="steering" size={18} color={PRIMARY_COLOR} />
                  <Text style={styles.dropdownText}>Driver</Text>
                </TouchableOpacity>
                <View style={styles.dropdownDivider} />
                <TouchableOpacity style={styles.dropdownItem} onPress={() => handleRoleSelection('Commuter')}>
                  <Ionicons name="person-outline" size={18} color={PRIMARY_COLOR} />
                  <Text style={styles.dropdownText}>Commuter</Text>
                </TouchableOpacity>
                <View style={styles.dropdownDivider} />
                <TouchableOpacity style={styles.dropdownItem} onPress={() => handleRoleSelection('Both')}>
                  <MaterialCommunityIcons name="account-switch-outline" size={18} color={PRIMARY_COLOR} />
                  <Text style={styles.dropdownText}>Both</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {needsDriverFields ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Driver Information</Text>

              <View style={styles.inputGroup}>
                {submitted && <FormErrorText error={validation.fieldErrors?.selectedVehicle} />}
                <TouchableOpacity
                  style={[
                    styles.inputRow,
                    vehicleOpen && styles.inputRowActive,
                    submitted && validation.fieldErrors?.selectedVehicle && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                  ]}
                  onPress={() => {
                    setVehicleOpen(!vehicleOpen);
                    setRoleOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="bus-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
                  <Text style={[styles.input, !selectedVehicle && { color: '#9CA3AF' }]}>
                    {selectedVehicle || 'Select Vehicle Type'}
                  </Text>
                  <Ionicons name={vehicleOpen ? 'chevron-up' : 'chevron-down'} size={20} color={PRIMARY_COLOR} />
                </TouchableOpacity>
              </View>

              {vehicleOpen ? (
                <View style={styles.dropdown}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedVehicle('Jeepney');
                      setVehicleOpen(false);
                    }}
                  >
                    <MaterialCommunityIcons name="car-door" size={18} color={PRIMARY_COLOR} />
                    <Text style={styles.dropdownText}>Jeepney</Text>
                  </TouchableOpacity>
                  <View style={styles.dropdownDivider} />
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedVehicle('Bus');
                      setVehicleOpen(false);
                    }}
                  >
                    <MaterialCommunityIcons name="bus" size={18} color={PRIMARY_COLOR} />
                    <Text style={styles.dropdownText}>Bus</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                {submitted && <FormErrorText error={validation.fieldErrors?.plateNumber} />}
                <View
                  style={[
                    styles.inputRow,
                    submitted && validation.fieldErrors?.plateNumber && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                  ]}
                >
                  <FontAwesome6 name="id-card" size={18} color={PRIMARY_COLOR} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Plate Number (e.g., ABC1234)"
                    placeholderTextColor="#9CA3AF"
                    value={plateNumber}
                    onChangeText={setPlateNumber}
                    onBlur={() => setTouched({ ...touched, plateNumber: true })}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                {submitted && <FormErrorText error={validation.fieldErrors?.licenseNumber} />}
                <View
                  style={[
                    styles.inputRow,
                    submitted && validation.fieldErrors?.licenseNumber && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="card-account-details-outline"
                    size={20}
                    color={PRIMARY_COLOR}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="License Number (e.g., A12-34-123456)"
                    placeholderTextColor="#9CA3AF"
                    value={licenseNumber}
                    onChangeText={setLicenseNumber}
                    onBlur={() => setTouched({ ...touched, licenseNumber: true })}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={styles.uploadSection}>
                <Text style={styles.uploadLabel}>Upload ID</Text>
                {submitted && <FormErrorText error={validation.fieldErrors?.idImage} />}
                <TouchableOpacity
                  style={[
                    styles.uploadButton,
                    submitted && validation.fieldErrors?.idImage && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                  ]}
                  activeOpacity={0.8}
                  onPress={pickImage}
                >
                  <Ionicons name="cloud-upload-outline" size={32} color={PRIMARY_COLOR} />
                  <View style={styles.uploadTextContainer}>
                    <Text style={styles.uploadTitle}>{idImage ? 'ID Image Selected' : 'Upload ID Image'}</Text>
                    <Text style={styles.uploadSubtext}>
                      {idImage ? 'Tap to change image' : 'Tap to take a photo or choose from gallery'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setShowTerms(true)} activeOpacity={0.8}>
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.termsText}>I agree to the Terms and Conditions and Privacy Policy</Text>
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

      <ImageCropper
        visible={showCropper}
        imageUri={croppingImage || ''}
        onCropComplete={handleCropComplete}
        onCancel={() => {
          setShowCropper(false);
          setCroppingImage(null);
        }}
        aspectRatio={{ width: 85, height: 54 }}
      />

      <Modal visible={showTerms} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowTerms(false);
                setShowPrivacy(true);
              }}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Terms and Conditions</Text>
            <View style={styles.closeBtn} />
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalText}>
              LARGA account creation requires accurate personal information and lawful use of the platform.
              Driver-facing access remains subject to separate review and supporting document verification.
            </Text>
            <Text style={styles.modalText}>
              Users must not impersonate another person, submit forged documents, or attempt to bypass review,
              routing, or role restrictions implemented by the system.
            </Text>
            <Text style={styles.modalText}>
              Continued use of the app means you understand that commuter, driver, and admin access may have
              different activation requirements depending on the current implementation stage.
            </Text>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showPrivacy} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowPrivacy(false);
                setAgreed(true);
              }}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <View style={styles.closeBtn} />
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalText}>
              LARGA collects account, contact, and role-application information needed to authenticate users and
              review protected access requests.
            </Text>
            <Text style={styles.modalText}>
              Uploaded driver identification images are intended for verification workflows and should only be
              submitted when the user understands that driver approval is still controlled separately from public
              account creation.
            </Text>
            <Text style={styles.modalText}>
              By continuing, you acknowledge that stored information may be used to support account safety, role
              review, route operations, and platform support.
            </Text>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
