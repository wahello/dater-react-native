import React, { Component } from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { connect } from 'react-redux';

import { DaterMapView } from '../components';
import { initUserAuth, signOutUser } from '../services/auth';
import watchGeoPosition from '../services/geoDevice';

const mapStateToProps = (state) => ({
  auth: state.auth,
  coords: state.geo.coords,
});

type Props = {
  dispatch: any,
};

class Main extends Component<Props> {
  authUnsubscribe;
  geoWatchID: number;

  componentWillMount() {
    this.authUnsubscribe = initUserAuth(this.props.dispatch);
    this.geoWatchID = watchGeoPosition(this.props.dispatch);
  }

  componentWillUnmount() {
    navigator.geolocation.clearWatch(this.geoWatchID);
    this.authUnsubscribe();
  }

  signOut = async () => {
    this.authUnsubscribe();
    await signOutUser(this.props.dispatch);
  }

  render() {
    return (
      <View style={styles.mainContainer}>
        {/* <FirebaseSetup /> */}
        {/* <View style={styles.button}>
          <Button title='Выйти' color='blue' onPress={this.signOut}/>
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
  debugText: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    zIndex: 2,
    opacity: 0.8,
  },
});

export default connect(mapStateToProps)(Main);
