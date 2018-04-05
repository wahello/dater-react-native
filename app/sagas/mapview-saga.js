import { throttle, takeEvery, call, take, put } from 'redux-saga/effects';
import { delay } from 'redux-saga';

const defaultAnimationDuration = 500;

export default function* mapViewSaga() {
  try {
    const { mapView } = yield take('MAPVIEW_READY');
    // need to wait for the first MAPVIEW_ANIMATE_TO_REGION action first
    // otherwise MAPVIEW_ANIMATE_TO_COORDINATE will interfer with MAPVIEW_ANIMATE_TO_REGION
    // and will not allow correct zoom on map load
    const firstAnimateToRegionAction = yield take('MAPVIEW_ANIMATE_TO_REGION', animateToRegion, mapView);
    yield animateToRegion(mapView, firstAnimateToRegionAction);
    yield call(delay, defaultAnimationDuration);

    yield takeEvery('MAPVIEW_ANIMATE_TO_REGION', animateToRegion, mapView);
    yield takeEvery('MAPVIEW_ANIMATE_TO_COORDINATE', animateToCoordinate, mapView);
    yield throttle(1000, 'MAPVIEW_ANIMATE_TO_BEARING_MANUALLY', animateToBearing, mapView);
    yield throttle(1000, 'MAPVIEW_ANIMATE_TO_BEARING_HEADING', animateToBearing, mapView);
  } catch (error) {
    yield put({ type: 'MAPVIEW_MAINSAGA_ERROR', payload: error });
  }
}

function* animateToBearing(mapView, action) {
  try {
    const { duration, bearingAngle } = action.payload;
    const animationDuration = duration || defaultAnimationDuration;
    yield call(mapView.animateToBearing, bearingAngle, animationDuration);
  } catch (error) {
    yield put({ type: 'MAPVIEW_ANIMATE_TO_BEARING_ERROR', payload: error });
  }
}

function* animateToRegion(mapView, action) {
  try {
    const { region, duration } = action.payload;
    const animationDuration = duration || defaultAnimationDuration;
    yield call(mapView.animateToRegion, region, animationDuration);
  } catch (error) {
    yield put({ type: 'MAPVIEW_ANIMATE_TO_REGION_ERROR', payload: error });
  }
}

function* animateToCoordinate(mapView, action) {
  try {
    const { coords, duration } = action.payload;
    const animationDuration = duration || defaultAnimationDuration;
    yield call(mapView.animateToCoordinate, coords, animationDuration);
  } catch (error) {
    yield put({ type: 'MAPVIEW_ANIMATE_TO_COORDINATE_ERROR', payload: error });
  }
}
