import React from "react";
import { View, Modal, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FifaCardDisplay } from "./FifaCardDisplay";

interface FifaPlayerCardModalProps {
  visible: boolean;
  onClose: () => void;
  user: any;
  walletBalance?: number;
  totalBookings?: number;
  rating?: number;
}

export function FifaPlayerCardModal({
  visible,
  onClose,
  user,
  walletBalance,
  totalBookings,
  rating,
}: FifaPlayerCardModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/90 items-center justify-center p-4">
        {/* Close Action Button */}
        <TouchableOpacity
          onPress={onClose}
          className="absolute top-12 right-6 z-20 h-10 w-10 rounded-full bg-slate-900/90 border border-white/20 items-center justify-center shadow-xl"
        >
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* Card Component replicating Mbappe_231747-1.png with Bookings & Ratings */}
        <FifaCardDisplay
          user={user}
          walletBalance={walletBalance}
          totalBookings={totalBookings}
          rating={rating}
        />
      </View>
    </Modal>
  );
}
