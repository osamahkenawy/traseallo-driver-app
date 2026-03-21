import { View, Text } from "react-native";
import React from "react";

import { theme } from "../constants";

const TrackCategory = ({ line, performed, status, comment }) => {
  return (
    <View style={{ flexDirection: "row", marginBottom: 6 }}>
      <View style={{ alignItems: "center", marginRight: 24 }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderWidth: 2,
            borderColor: theme.COLORS.lightBlue1,
            borderRadius: 15,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 7,
          }}
        >
          {performed && (
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: theme.COLORS.black,
              }}
            />
          )}
        </View>
        {line && (
          <View
            style={{
              width: 1,
              height: 30,
              backgroundColor: theme.COLORS.black,
            }}
          />
        )}
      </View>
      <View>
        <Text
          style={{
            ...theme.FONTS.H5,
            color: theme.COLORS.black,
            marginBottom: 6,
          }}
        >
          {status}
        </Text>
        <Text
          style={{
            ...theme.FONTS.Mulish_400Regular,
            fontSize: 12,
            color: theme.COLORS.gray1,
            lineHeight: 12 * 1.5,
          }}
        >
          {comment}
        </Text>
      </View>
    </View>
  );
};

export default TrackCategory;
