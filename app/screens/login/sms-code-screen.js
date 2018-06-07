import React, { Component } from 'react';
import { connect, Dispatch } from 'react-redux';
import {
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';

import DaterTextInput from '../../components/ui-kit/atoms/dater-text-input';
import DaterModal from '../../components/ui-kit/dater-modal';
import DaterButton from '../../components/ui-kit/atoms/dater-button';
import { H2 } from '../../components/ui-kit/typography';

const smsCodeIcon = require('../../assets/icons/sms-code/sms-code.png');

const mapStateToProps = () => ({
});

type State = {
  isCodeValid: boolean,
}

type Props = {
  navigation: any,
  dispatch: Dispatch,
};

class SmsCodeScreen extends Component<Props, State> {
  smsCode: string;

  constructor(props) {
    super(props);

    this.state = {
      isCodeValid: false,
    };
  }

  isCodeValid() {
    return this.smsCode.length === 6;
  }

  onChangeInput = (smsCode) => {
    this.smsCode = smsCode;
    this.setState({
      isCodeValid: this.isCodeValid(),
    });
  }

  onSmsCodeSubmit = () => {
    this.smsCode = this.smsCode.replace(/\D/g, ''); // remove non numbers
    this.props.dispatch({
      type:
        'AUTH_PHONE_NUMBER_SMS_CODE_SUBMITTED',
      payload: {
        smsCode: this.smsCode,
      },
    });
  }

  onInvalidCodeSubmit = () => {
    Alert.alert(
      'Неверный код',
      'Введи корректный код из СМС, 6 цифр',
      [
        { text: 'Исправлюсь!' },
      ],
    );
  }

  render() {
    return (
      <DaterModal
        fullscreen
        backButton
        backButtonPress={() => this.props.navigation.goBack()}
        style={styles.modal}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          scrollEnabled={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContainer}
        >
          <Image
            source={smsCodeIcon}
            style={styles.topImage}
          />
          <H2 style={styles.header}>Введи код из SMS</H2>
          <DaterTextInput
            placeholder="XXXXXX"
            keyboardType="numeric"
            returnKeyType="go"
            style={styles.input}
            onChangeText={this.onChangeInput}
            maxLength={6}
          />
          <DaterButton
            onPress={this.onSmsCodeSubmit}
            disabled={!this.state.isCodeValid}
            onDisabledPress={this.onInvalidCodeSubmit}
          >
            Далее
          </DaterButton>
        </ScrollView>
      </DaterModal>
    );
  }
}

const styles = StyleSheet.create({
  modal: {
  },
  scrollView: {
    alignSelf: 'center',
  },
  scrollViewContainer: {
    alignItems: 'center',
  },
  topImage: {
    marginTop: 64,
  },
  header: {
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    textAlign: 'center',
  },
});

export default connect(mapStateToProps)(SmsCodeScreen);
