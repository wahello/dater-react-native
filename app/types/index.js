
// import firebase from 'react-native-firebase';

export type GeoCoordinates = {
  accuracy: number,
  altitude: number,
  heading: number,
  speed: number,
  latitude: number,
  longitude: number,
};

export type GeoCompass = {
  heading: number,
  enabled: boolean,
  error: string,
};

export type LngLat = [
  number, number
];

export type MicroDate = {
  id: string,
  acceptTS: Date,
  finishTS: Date,
  active: boolean,
  requestBy: string,
  requestFor: string,
  requestByRef: string,
  requestForRef: string,
  requestByGeoPoint: FireStoreGeoPoint,
  requestForGeoPoint: FireStoreGeoPoint,
  selfieGeoPoint: FireStoreGeoPoint,
  selfie: PhotoSelfie,
  startDistance: number,
}

export type FireStoreGeoPoint = {
  // ...firebase.firestore.GeoPoint,
  latitude: number,
  longitude: number,
}

export type PhotoSelfie = {
  cloudinaryUrl: string,
  width: number,
  height: number,
  version: number,
  format: string,
  timestamp: Date,
  uploadedBy: string,
  storageUrl: string,
};

export type CloudinaryPhoto = {
  public_id: string,
  version: number,
}
