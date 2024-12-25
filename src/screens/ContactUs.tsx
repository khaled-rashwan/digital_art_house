import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Alert,
  Platform,
} from "react-native";
import * as Clipboard from 'expo-clipboard'; // Correct Clipboard import
import CustomButton from "../components/CustomButton";
import globalStyles from '../styles/globalStyles';
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { faSquareWhatsapp } from '@fortawesome/free-brands-svg-icons';

const ContactUs = () => {
  const whatsappNumber = "+97450540272";
  const email = "marwa.r.rashed@gmail.com";

  const copyToClipboard = (text: string) => {
    Clipboard.setStringAsync(text).then(() => {
      Alert.alert("Copied to Clipboard", `You have copied: ${text}`);
    });
  };

  const gotoWhatsapp = () => {
    const formattedNumber = whatsappNumber.replace("+", "");
    const url =
      Platform.OS === "web"
        ? `https://web.whatsapp.com/send?phone=${formattedNumber}`
        : `https://wa.me/${formattedNumber}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert(
            "Error",
            Platform.OS === "web"
              ? "Cannot open WhatsApp Web. Please check your browser or WhatsApp installation."
              : "WhatsApp is not installed on your device"
          );
        }
      })
      .catch((err) => {
        Alert.alert("Error", "Failed to open WhatsApp");
        console.error(err);
      });
  };

  return (
    <View style={globalStyles.container}>
      {/* Header */}
      <View style={globalStyles.header}>
        <LinearGradient colors={['#FFE864', '#FFE15D']} style={globalStyles.gradient}>
        </LinearGradient>
      </View>

      {/* Overlay Component */}
      <View style={globalStyles.overlayComponent}>
        <Text style={globalStyles.title}>Contact Us</Text>

        {/* Content */}
        <View style={globalStyles.content}>
          {/* WhatsApp Contact */}
          <View style={styles.contactRow}>
            <FontAwesomeIcon style={styles.icon} icon={faSquareWhatsapp} color={'#11AEE3'} size={60} />
            <View style={styles.contactInfo}>
              <Text style={styles.label}>WhatsApp Contact:</Text>
              <Text style={styles.info}>{whatsappNumber}</Text>
            </View>
            <Pressable onPress={() => copyToClipboard(whatsappNumber)} style={styles.copyButton}>
              <FontAwesomeIcon icon={faCopy} size={20} color="#555" />
            </Pressable>
          </View>

          {/* Email */}
          <View style={styles.contactRow}>
            <View style={styles.contactInfo}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.info}>{email}</Text>
            </View>
            <Pressable onPress={() => copyToClipboard(email)} style={styles.copyButton}>
              <FontAwesomeIcon icon={faCopy} size={20} color="#555" />
            </Pressable>
          </View>
        </View>

        {/* Button */}
        <View style={globalStyles.customButton}>
          <CustomButton title="Open WhatsApp" onPress={gotoWhatsapp} variant="filled" />
        </View>
      </View>

      {/* Body */}
      <View style={globalStyles.body} />
    </View>
  );
};

/* =========================
    Styles for ContactUs
========================= */
const styles = StyleSheet.create({
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "#F9F9F9",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  icon: {
    marginRight: 10,
  },
  contactInfo: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  info: {
    fontSize: 16,
    color: "#555",
  },
  copyButton: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E0E0E0",
    borderRadius: 5,
  },
});

export default ContactUs;
