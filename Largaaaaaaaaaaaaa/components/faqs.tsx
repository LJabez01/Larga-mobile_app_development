// FAQs Screen - displays the frequently asked questions content.
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

type Props = {
  onBack: () => void;
};

const faqs = [
  {
    question: "How does Larga Work?",
    answer:
      "Larga uses real-time GPS and crowd-sourced data to provide you with the most accurate and up-to-date routes. Simply enter your destination and the app will calculate the fastest path based on current traffic conditions.",
  },
  {
    question: "Can I use Larga offline?",
    answer:
      "Yes! You can download maps for specific regions to use offline. Go to Settings > Map Style > Offline Maps to download your preferred areas.",
  },
  {
    question: "How is my data used?",
    answer:
      "Your data is used solely to improve your navigation experience. We do not sell your personal data to third parties. Please read our Privacy Policy for full details.",
  },
  {
    question: "How do I report an issue?",
    answer:
      "You can report issues directly through the app by tapping the flag icon on the map, or by emailing us at support@larga.app. We review all reports within 24 hours.",
  },
];

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={[styles.faqHeader, isOpen && styles.faqHeaderOpen]}
        onPress={onToggle}
        activeOpacity={0.85}
      >
        <Text style={styles.faqQuestion}>{question}</Text>
        <Feather
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color="#ffffff"
        />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.faqBody}>
          <Text style={styles.faqAnswer}>{answer}</Text>
        </View>
      )}
    </View>
  );
}

export default function FAQsScreen({ onBack }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQs</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Frequently Asked Questions</Text>

        <View style={styles.faqList}>
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </View>

        {/* Talk to Us card */}
        <View style={styles.talkCard}>
          <Text style={styles.talkTitle}>Talk to Us!</Text>
          <Text style={styles.talkSubtitle}>
            If you have some questions that can't be answered in our FAQs,
            please email us your concern or problems. Thank you!
          </Text>
          <TouchableOpacity
            style={styles.emailBtn}
            activeOpacity={0.85}
            onPress={() => Linking.openURL("mailto:support@larga.app")}
          >
            <Text style={styles.emailBtnText}>Email Us</Text>
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
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginTop: 24,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  faqList: {
    gap: 10,
  },
  faqItem: {
    borderRadius: 12,
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#158251",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  faqHeaderOpen: {
    backgroundColor: "#158251",
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    marginRight: 10,
  },
  faqBody: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: "#158251",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  faqAnswer: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
  },
  talkCard: {
    marginTop: 24,
    backgroundColor: "#158251",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },
  talkTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  talkSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
  },
  emailBtn: {
    backgroundColor: "#4ade80",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emailBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#14532d",
  },
});
