import { View } from "react-native";
import React from "react";

import { theme } from "../constants";

const Line = ({ containerStyle }) => {
  return (
    <View
      style={{
        width: 1,
        height: 30,
        backgroundColor: theme.COLORS.black,
        alignSelf: "center",
        ...containerStyle,
      }}
    />
  );
};

export default Line;
