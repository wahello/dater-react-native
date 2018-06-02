import * as React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import MapboxGL from '@mapbox/react-native-mapbox-gl';
import Moment from 'react-moment';

import DaterModal from '../components/ui-kit/dater-modal';
import PastLocationsPath from '../components/map/past-locations-path';
import { MicroDate } from '../types';
import { SCREEN_WIDTH } from '../constants';
import { H2, Body, Caption1 } from '../components/ui-kit/typography';

type Props = {
  navigation: any,
};

export default class TextInputsScreen extends React.Component<Props> {
  mapView: MapboxGL.MapView;
  microDate: MicroDate;
  mapIsReady = false;

  componentWillMount() {
    console.log(this.props.navigation.getParam('microDate'));
    this.microDate = this.props.navigation.getParam('microDate');
  }

  onMapReady = () => {
    this.mapIsReady = true;
    // requestAnimationFrame(() => {
    //   this.mapView.fitBounds(
    //     [
    //       this.microDate.requestByGeoPoint.longitude, this.microDate.requestByGeoPoint.latitude,
    //     ],
    //     [
    //       this.microDate.requestForGeoPoint.longitude, this.microDate.requestForGeoPoint.latitude,
    //     ],
    //     8,
    //     1000,
    //   );
    // });
  }

  render() {
    return (
      <DaterModal
        fullscreen
        closeButton
        closeButtonPress={() => this.props.navigation.goBack()}
        headerTitle="Карточка встречи"
        style={styles.mapViewContainer}
      >
        <ScrollView
          style={styles.scrollViewContainer}
        >
          <MapboxGL.MapView
            centerCoordinate={[
              this.microDate.selfieGeoPoint.longitude,
              this.microDate.selfieGeoPoint.latitude,
            ]}
            ref={(component) => { this.mapView = component; }}
            showUserLocation={false}
            userTrackingMode={0}
            zoomLevel={16}
            style={styles.mapView}
            animated={false}
            logoEnabled={false}
            compassEnabled={false}
            localizeLabels
            // onPress={() => { this.onMapPressed(); }}
            pitch={0}
            onWillStartLoadingMap={this.onMapReady}
            styleURL="mapbox://styles/olegwn/cjggmap8l002u2rmu63wda2nk"
            scrollEnabled={false}
            // zoomEnabled={true}
            rotateEnabled={false}
            pitchEnabled={false}
            minZoomLevel={11}
            maxZoomLevel={18}
          >
            <PastLocationsPath
              uid={this.microDate.requestFor}
              mode="own"
              microDateId={this.microDate.id}
              isLimited={false}
            />
            <PastLocationsPath
              uid={this.microDate.requestBy}
              mode="target"
              microDateId={this.microDate.id}
              isLimited={false}
            />
          </MapboxGL.MapView>
          <H2 style={[styles.subHeader, styles.textBodyPadding]}>Заголовок 2</H2>
          <Body
            style={[styles.bodyText, styles.textBodyPadding]}
          >
            Встреча {this.microDate.id.substring(0, 4)} состоялась{' '}
            <Moment locale="ru" element={Body} fromNow>{this.microDate.finishTS}</Moment>{' '}
            между {this.microDate.requestBy.substring(0, 4)} и {this.microDate.requestFor.substring(0, 4)}{' '}
          </Body>
          <Caption1
            style={[styles.infoItemHeader, styles.textBodyPadding]}
          >
            Время выполнения квеста:
          </Caption1>
          <Body
            style={[styles.infoItemBody, styles.textBodyPadding]}
          >
            15 минут
          </Body>
          <Caption1
            style={[styles.infoItemHeader, styles.textBodyPadding]}
          >
            Добыто монет:
          </Caption1>
          <Body
            style={[styles.infoItemBody, styles.textBodyPadding]}
          >
            1500 coins
          </Body>
          <Caption1
            style={[styles.infoItemHeader, styles.textBodyPadding]}
          >
            Набрано опыта:
          </Caption1>
          <Body
            style={[styles.infoItemBody, styles.textBodyPadding]}
          >
            140 XP
          </Body>
        </ScrollView>
      </DaterModal>
    );
  }
}

const styles = StyleSheet.create({
  mapViewContainer: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  scrollViewContainer: {
    paddingLeft: 8,
    paddingRight: 8,
  },
  mapView: {
    // width: 300,
    height: SCREEN_WIDTH - 16,
    marginBottom: 8,
  },
  subHeader: {
    marginBottom: 8,
  },
  bodyText: {
    marginBottom: 8,
  },
  textBodyPadding: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  infoItemHeader: {
    marginTop: 8,
    marginBottom: 4,
  },
  infoItemBody: {
    marginBottom: 8,
  },
});
