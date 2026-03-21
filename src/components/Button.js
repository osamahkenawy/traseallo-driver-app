import { View, Text, TouchableOpacity } from "react-native";
import React from "react";

import { theme } from "../constants";

const Button = ({ title, onPress, containerStyle }) => {
  return (
    <View style={{ ...containerStyle, width: "100%" }}>
      <TouchableOpacity
        style={{
          width: "100%",
          height: 50,
          borderRadius: 50,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.COLORS.black,
        }}
        onPress={onPress}
      >
        <Text
          style={{
            color: theme.COLORS.white,
            textTransform: "uppercase",
            ...theme.FONTS.Mulish_600SemiBold,
            fontSize: 14,
          }}
        >
          {title}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default Button;
