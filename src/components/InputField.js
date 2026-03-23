import {View, Text, TextInput, TouchableOpacity} from "react-native";
import React from "react";

import {theme} from "../constants";
import {svg} from "../svg";

const InputField = ({
  title,
  placeholder,
  icon,
  containerStyle,
  secureTextEntry,
  keyboardType,
  check,
  eyeOffSvg = false,
}) => {
  return (
    <View
      style={{
        paddingStart: 30,
        height: 50,
        width: "100%",
        borderWidth: 1,
        borderColor: theme.COLORS.lightBlue1,
        borderRadius: 50,
        justifyContent: "center",
        flexDirection: "row",
        alignItems: "center",
        ...containerStyle,
      }}
    >
      <TextInput
        style={{
          flex: 1,
          height: "100%",
          width: "100%",
          flexDirection: "row",
          justifyContent: "space-between",
          ...theme.FONTS.Mulish_400Regular,
          fontSize: 16,
        }}
        keyboardType={keyboardType}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        placeholderTextColor={theme.COLORS.lightGray}
      />
      {title && (
        <View
          style={{
            position: "absolute",
            top: -12,
            start: 20,
            paddingHorizontal: 10,
            backgroundColor: theme.COLORS.white,
          }}
        >
          <Text
            style={{
              ...theme.FONTS.Mulish_600SemiBold,
              fontSize: 12,
              textTransform: "uppercase",
              color: theme.COLORS.gray1,
              lineHeight: 12 * 1.7,
            }}
          >
            {title}
          </Text>
        </View>
      )}
      {check && <View style={{paddingHorizontal: 20}}>{<svg.CheckSvg />}</View>}
      {eyeOffSvg && (
        <TouchableOpacity style={{paddingHorizontal: 20}}>
          <svg.EyeOffSvg />
        </TouchableOpacity>
      )}
      {icon && (
        <TouchableOpacity
          style={{
            paddingHorizontal: 20,
            paddingVertical: 10,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {icon}
        </TouchableOpacity>
      )}
    </View>
  );
};

export default InputField;
