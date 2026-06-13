import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LegalDocument } from '@/lib/legal/legal-content';

const PRIMARY_COLOR = '#10B981';
const LIGHT_COLOR = '#ECFDF5';

interface LegalDocumentModalProps {
  document: LegalDocument;
  visible: boolean;
  onClose: () => void;
}

export default function LegalDocumentModal({ document, visible, onClose }: LegalDocumentModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel={`Close ${document.title}`}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{document.title}</Text>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView
          style={styles.modalContent}
          contentContainerStyle={styles.modalContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.legalMetadataCard}>
            <Text style={styles.legalMetadataText}>Effective Date: {document.effectiveDate}</Text>
            <Text style={styles.legalVersionText}>{document.version}</Text>
          </View>

          {document.introduction.map((paragraph) => (
            <Text key={paragraph} style={styles.modalText}>{paragraph}</Text>
          ))}

          {document.sections.map((section) => (
            <View key={section.title} style={styles.legalSection}>
              <Text style={styles.modalSectionTitle}>{section.title}</Text>
              {section.paragraphs?.map((paragraph) => (
                <Text key={paragraph} style={styles.modalText}>{paragraph}</Text>
              ))}
              {section.bullets?.map((bullet) => (
                <View key={bullet} style={styles.legalBulletRow}>
                  <Text style={styles.legalBullet}>{'\u2022'}</Text>
                  <Text style={styles.legalBulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          ))}

          <TouchableOpacity style={styles.legalCloseButton} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.legalCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  modalContentContainer: {
    paddingBottom: 48,
  },
  legalMetadataCard: {
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY_COLOR,
    backgroundColor: LIGHT_COLOR,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  legalMetadataText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  legalVersionText: {
    marginTop: 3,
    fontSize: 12,
    color: '#6B7280',
  },
  legalSection: {
    marginBottom: 4,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    marginBottom: 12,
    marginTop: 20,
  },
  modalText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
  },
  legalBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingRight: 4,
  },
  legalBullet: {
    width: 20,
    fontSize: 15,
    lineHeight: 22,
    color: PRIMARY_COLOR,
    fontWeight: '800',
  },
  legalBulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },
  legalCloseButton: {
    marginTop: 20,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  legalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
