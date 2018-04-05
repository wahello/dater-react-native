import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Button,
} from 'react-native';
import { connect, Dispatch } from 'react-redux';
import { type NavigationScreenProp, type NavigationStateRoute } from 'react-navigation';

import { DaterMapView } from '../components';
import listenForUsersAround from '../services/geo-query';
import { GeoCoordinates } from '../types';

const mapStateToProps = (state) => ({
  auth: state.auth,
  location: state.location,
});

type Props = {
  dispatch: Dispatch,
  location: {
    coords: GeoCoordinates,
  },
  navigation: NavigationScreenProp<NavigationStateRoute>,
};

class Main extends Component<Props> {
  unsubscribeFromUsersAround;

  componentWillUnmount() {
    this.unsubscribeFromUsersAround();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.coords && !this.unsubscribeFromUsersAround) {
      const queryArea = {
        center: {
          latitude: nextProps.location.coords.latitude,
          longitude: nextProps.location.coords.longitude,
        },
        radius: 25,
      };
      console.log('Attach a listener for users around');
      this.unsubscribeFromUsersAround = listenForUsersAround(queryArea, this.props.dispatch);
    }
  }

  signOut = async () => {
    this.props.dispatch({
      type: 'AUTH_SIGNOUT',
    });
  }

  render() {
    return (
      <View style={styles.mainContainer}>
        {/* <FirebaseSetup /> */}
        {/* <View style={styles.button}>
          <Button title="Выйти" color="blue" onPress={this.signOut} />
        </View> */}
        <View style={styles.loginButton}>
          <Button title="Вход" color="blue" onPress={() => this.props.navigation.navigate('Login')} />
        </View>
        {/* <View style={styles.button}>
          <Button title="Typography" color="blue" onPress={() => this.props.navigation.navigate('Typography')} />
        </View> */}
        <DaterMapView />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: 'gray',
    opacity: 1,
    alignSelf: 'stretch',
    flex: 1,
  },
  button: {
    position: 'absolute',
    zIndex: 2,
    bottom: 50,
    left: 0,
    right: 0,
  },
  loginButton: {
    position: 'absolute',
    zIndex: 2,
    right: 20,
    top: 20,
  },
  debugText: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    zIndex: 2,
    opacity: 0.8,
  },
});

export default connect(mapStateToProps)(Main);
