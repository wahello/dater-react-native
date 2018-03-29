import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  Button,
  View,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { connect, Dispatch } from 'react-redux';
import 'moment/locale/ru';
import Moment from 'react-moment';

import PersonMaker from './person-maker';
import MyLocationMapMarker from './my-location-map-maker';
import MyLocationButton from './my-location-button';
import { GeoCompass, GeoCoordinates } from '../types';

const mapStateToProps = (state) => ({
  location: state.location,
  usersAround: state.usersAround,
  mapView: state.mapView,
  auth: state.auth,
  compass: state.compass,
});

function creatMapViewProxy(mapView: MapView) {
  return {
    animateToBearing: (bearing, duration) => mapView.animateToBearing(bearing, duration),
    animateToRegion: (region, duration) => mapView.animateToRegion(region, duration),
  };
}

function mapDispatchToProps(dispatch) {
  return ({
    animateToRegion: (mapView: MapView, region: GeoCoordinates) => {
      dispatch({
        type: 'MAPVIEW_ANIMATE_TO_REGION',
        payload: {
          mapView: creatMapViewProxy(mapView),
          region,
        },
      });
    },
    onRegionChangeComplete: (newRegion, prevRegion) => {
      if (!prevRegion || !newRegion) return;

      dispatch({
        type: 'MAPVIEW_REGION_UPDATED',
        payload: {
          newRegion,
          prevRegion,
        },
      });
    },
    toggleGeoService: (location) => {
      if (location.enabled) {
        dispatch({
          type: 'GEO_LOCATION_STOP',
        });
      } else {
        dispatch({
          type: 'GEO_LOCATION_START',
        });
      }
    },
    rotateMap: (mapView: MapView, angle: number) => {
      mapView.animateToBearing(angle);
    },
    toggleCompass: (compassStatus) => {
      if (compassStatus) {
        dispatch({
          type: 'GEO_COMPASS_HEADING_STOP',
        });
      } else {
        dispatch({
          type: 'GEO_COMPASS_HEADING_START',
        });
      }
    },
    dispatch: (action) => dispatch(action),
  });
}


type Props = {
  usersAround: Array<mixed>,
  auth: {
    uid: string,
  },
  compass: GeoCompass,
  animateToRegion: any,
  onRegionChangeComplete: (newRegion: GeoCoordinates, prevRegion: GeoCoordinates) => void,
  toggleGeoService: (location: any) => void,
  rotateMap: (mapView: MapView, angle:number) => void,
  toggleCompass: (compassStatus: boolean) => void,
  dispatch: Dispatch,
  location: {
    coords: GeoCoordinates,
    geoUpdates: number,
  },
};

class DaterMapView extends Component<Props> {
  mapView: MapView;

  constructor(props) {
    super(props);
    this.routeTo = this.routeTo.bind(this);
  }

  componentDidMount() {
    this.props.dispatch({
      type: 'GEO_LOCATION_INITIALIZE',
      mapView: creatMapViewProxy(this.mapView),
    });
  }

  onMapReady= () => {
    this.props.dispatch({
      type: 'MAPVIEW_READY',
      mapView: creatMapViewProxy(this.mapView),
    });
  }

  routeTo = async (user) => {
    console.log(`Creating route to user: ${user.id}`);
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
      <View
        style={styles.mapView}
      >
        <MyLocationButton
          toggleGeoService={() => this.props.toggleGeoService(this.props.location)}
          onPress={(region) => this.props.animateToRegion(this.mapView, region)}
          rotateMap={() => this.props.rotateMap(this.mapView, 90)}
          toggleCompass={() => this.props.toggleCompass(this.props.compass.enabled)}
        />
        <MapView
          ref={(component) => { this.mapView = component; }}
          style={styles.mapView}
          onRegionChangeComplete={(region) => this.props.onRegionChangeComplete(region, this.props.location.coords)}
          onMapReady={this.onMapReady}
          // onRegionChange={this.onRegionChange}
          provider="google"
          showsIndoors
          showsTraffic={false}
          showsBuildings={false}
          // scrollEnabled={false}
          toolbarEnabled={false}
          moveOnMarkerPress={false}
          rotateEnabled={false}
          mapType="standard"
        >
          {this.props.location.enabled && this.props.location.coords &&
            <MyLocationMapMarker
              coordinate={this.props.location.coords}
              gpsHeading={this.props.location.coords.heading}
              compassHeading={this.props.compass.heading}
            /> }
          {this.props.location.enabled && this.renderUsersAround()}
        </MapView>
        <Text style={styles.debugText}>
          Accuracy: {this.props.location.coords && Math.floor(this.props.location.coords.accuracy)}{'\n'}
          GPS Heading: {this.props.location.coords && this.props.location.coords.heading}{'\n'}
          Compass Heading: {this.props.compass.heading}{'\n'}
          GeoUpdates: {this.props.location && this.props.location.geoUpdates}{'\n'}
          UID: {this.props.auth.uid && this.props.auth.uid.substring(0, 4)}{'\n'}
        </Text>
      </View>

    );
  }
}

const styles = StyleSheet.create({
  mapView: {
    flex: 1,
    zIndex: -1,
  },
  makerCallout: {
    width: 150,
  },
  debugText: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 2,
    opacity: 0.8,
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(DaterMapView);
