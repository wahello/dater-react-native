import React, { Component } from 'react';
import { StyleSheet, Text, Button } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { connect } from 'react-redux';
import 'moment/locale/ru';
import Moment from 'react-moment';

import { geoActionCreators } from '../redux';
import PersonMaker from './PersonMaker';
import { listenForUsersAround } from '../services/geoQuery';
import MyLocationMapMarker from './MyLocationMapMarker';

const mapStateToProps = (state) => ({
  coords: state.geo.coords,
  usersAround: state.usersAround,
  mapView: state.geo.mapView,
});

const GEO_OPTIONS = {
  useSignificantChanges: false,
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 1000,
};

class DaterMapView extends Component {
  watchId;
  unsubscribeFromUsersAround;

  constructor(props) {
    super(props);
    this.routeTo = this.routeTo.bind(this);
  }

  async componentDidMount() {
    // navigator.geolocation.requestAuthorization();
    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        await this.props.dispatch(geoActionCreators.geoUpdated(position.coords));
        const queryArea = {
          center: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          radius: 25,
        };
        if (!this.unsubscribeFromUsersAround) {
          console.log('Attach a listener for users around');
          this.unsubscribeFromUsersAround = listenForUsersAround(queryArea, this.props.dispatch);
        }
      },
      (error) => this.props.dispatch(geoActionCreators.geoDenied(error)),
      GEO_OPTIONS,
    );
  }

  componentWillUnmount() {
    navigator.geolocation.clearWatch(this.watchId);
    this.unsubscribeFromUsersAround();
  }

  routeTo = async (user) => {
    console.log(`Creating route to user: ${user.id}`);
  }

  onRegionChangeComplete = (region) => {
    this.props.dispatch(geoActionCreators.geoMapViewUpdated(region));
  }

  onRegionChange = (region) => {
    console.log('Region updated');
    console.log(region);
  }

  renderUsersAround() {
    return this.props.usersAround.map((user) => (
      <Marker
        coordinate={{
          latitude: user.geoPoint.latitude,
          longitude: user.geoPoint.longitude,
        }}
        style={styles.maker}
        key={user.id}
        zIndex={1}
      >
        <PersonMaker title={user.shortId} />
        <Callout style={styles.makerCallout}>
          <Text>Расстояние: {user.distance} м</Text>
          <Text>Обновлено:{' '}
            <Moment locale="ru" element={Text} fromNow>{user.timestamp}</Moment>
          </Text>
          <Button title="Маршрут" onPress={() => this.routeTo(user)} />
        </Callout>
      </Marker>
    ));
  }

  render() {
    return (
      <MapView
        style={styles.mapView}
        region={{
          latitude: this.props.coords.latitude,
          longitude: this.props.coords.longitude,
          latitudeDelta: this.props.mapView.latitudeDelta,
          longitudeDelta: this.props.mapView.longitudeDelta,
        }}
        onRegionChangeComplete={this.onRegionChangeComplete}
        // onRegionChange={this.onRegionChange}
        provider="google"
        showsIndoors
        showsTraffic={false}
        showsBuildings={false}
        showsMyLocationButton={false}
        scrollEnabled={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        mapType="standard"
      >
        <MyLocationMapMarker
          coordinate={this.props.coords}
          heading={this.props.coords.heading}
        />
        {this.renderUsersAround()}
      </MapView>
    );
  }
}

const styles = StyleSheet.create({
  mapView: {
    flex: 1,
  },
  makerCallout: {
    width: 150,
  },
});

export default connect(mapStateToProps)(DaterMapView);
