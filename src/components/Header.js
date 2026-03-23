import {View, Text, TouchableOpacity, TextInput} from "react-native";
import React, {useState} from "react";
import {useNavigation} from "@react-navigation/native";
import {useSelector, useDispatch} from "react-redux";
import {useTranslation} from 'react-i18next';
import {setScreen} from "../store/tabSlice";
import {cartIsEmpty} from "../utils/functions";

import {svg} from "../svg";
import {theme, names} from "../constants";
import {components} from "../components";

const Header = ({
  goBack,
  containerStyle,
  border,
  title,
  logo,
  search,
  burgerMenu,
  bag,
}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {t} = useTranslation();
  const list = useSelector((state) => state.cart.list);
  const quantity = list.length;
  const total = useSelector((state) => state.cart.total).toFixed(2);

  const [showModal, setShowModal] = useState(false);

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        height: 42,
        ...containerStyle,
        borderBottomWidth: border ? 1 : 0,
        borderBottomColor: theme.COLORS.lightBlue1,
      }}
    >
      {goBack && (
        <View
          style={{
            position: "absolute",
            start: 0,
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            style={{
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
            onPress={() => navigation.goBack()}
          >
            <svg.GoBackSvg />
          </TouchableOpacity>
        </View>
      )}
      {title && (
        <Text
          style={{
            textAlign: "center",
            textTransform: "capitalize",
            ...theme.FONTS.H4,
            color: theme.COLORS.black,
          }}
        >
          {title}
        </Text>
      )}
      {search && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            width: theme.SIZES.width - 200,
          }}
        >
          <View style={{marginEnd: 7}}>
            <svg.HeaderSearchSvg />
          </View>

          <TextInput
            placeholder={t('common.search')}
            style={{height: "100%", width: "100%"}}
          />
        </View>
      )}
      {logo && (
        <View style={{top: -3}}>
          <svg.LogoSvg />
        </View>
      )}
      {burgerMenu && (
        <View
          style={{
            position: "absolute",
            start: 0,
            alignItems: "center",
            paddingStart: 20,
          }}
        >
          <TouchableOpacity onPress={() => setShowModal(true)}>
            <svg.BurgerMenuSvg />
          </TouchableOpacity>
        </View>
      )}
      {bag && (
        <View
          style={{
            position: "absolute",
            end: 0,
            paddingEnd: 20,
          }}
        >
          <TouchableOpacity
            style={{paddingStart: 20, flexDirection: "row"}}
            onPress={() => {
              list.length > 0
                ? dispatch(setScreen("Order")) &&
                  navigation.navigate(names.TabNavigator)
                : cartIsEmpty();
            }}
          >
            <svg.HeaderBagSvg />
            <View
              style={{
                position: "absolute",
                end: 15,
                bottom: -3,
                backgroundColor: theme.COLORS.accent,
                borderRadius: 30,
                zIndex: 2,
              }}
            >
              <Text
                style={{
                  color: theme.COLORS.white,
                  ...theme.FONTS.Mulish_700Bold,
                  fontSize: 10,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  lineHeight: 10 * 1.5,
                }}
              >
                ${quantity > 0 ? total : 0}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
      <components.BurgerContacts
        showModal={showModal}
        setShowModal={setShowModal}
      />
    </View>
  );
};

export default Header;
