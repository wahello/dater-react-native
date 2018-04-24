import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

const spacingForLetterIndex = (letters, index, spacing) => (letters.length - 1 === index) ? 0 : spacing; // eslint-disable-line no-confusing-arrow

const TextWithLetterSpacing = (props) => {
  const {
    children,
    spacing,
    viewStyle,
    textStyle,
  } = props;
  const letters = children.split('');

  return (
    <View style={[styles.container, viewStyle]}>
      {letters.map((letter, index) =>
        (
          <Letter
            key={index} // eslint-disable-line react/no-array-index-key
            spacing={spacingForLetterIndex(letters, index, spacing)}
            textStyle={textStyle}
          >
            {letter}
          </Letter>
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
});

const Letter = (props) => {
  const { children, spacing, textStyle } = props;

  const letterStyles = [
    textStyle,
    { paddingRight: spacing },
  ];

  return <Text style={letterStyles} allowFontScaling={false}>{children}</Text>;
};

export default TextWithLetterSpacing;
