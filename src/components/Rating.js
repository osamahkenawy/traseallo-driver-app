import {Text, TouchableOpacity} from "react-native";
import React from "react";
import {useNavigation} from "@react-navigation/native";

import {svg} from "../svg";
import {theme, names} from "../constants";

const Rating = ({item}) => {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
      }}
      onPress={() =>
        navigation.navigate(names.Reviews, {
          reviews: item.reviews,
        })
      }
    >
      <svg.RatingSvg rating={item.rating} />
      <Text
        style={{
          ...theme.FONTS.Mulish_400Regular,
          fontSize: 12,
          color: theme.COLORS.gray1,
          lineHeight: 12 * 1.7,
          marginLeft: 4,
        }}
      >
        ({item.reviews.length})
      </Text>
    </TouchableOpacity>
  );
};

export default Rating;
