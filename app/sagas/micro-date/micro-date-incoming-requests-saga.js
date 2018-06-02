import { call, take, put, takeEvery, select, cancel, fork } from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import firebase from 'react-native-firebase';

import { Actions } from '../../navigators/navigator-actions';
import GeoUtils from '../../utils/geo-utils';
import { MICRO_DATES_COLLECTION } from '../../constants';

export default function* microDateIncomingRequestsSaga() {
  try {
    const myUid = yield select((state) => state.auth.uid);
    const pendingViewMicroDate = yield getPendingViewFinishedMicroDate(myUid);

    if (pendingViewMicroDate) {
      const finishTask = yield fork(incomingMicroDateFinishedSaga, pendingViewMicroDate);
      yield* incomingMicroDateUpdatedSaga(pendingViewMicroDate);
      cancel(finishTask);
    }

    const incomingMicroDateRequestsChannel = yield call(createChannelForIncomingMicroDateRequests, myUid);

    while (true) {
      const nextMicroDate = yield take(incomingMicroDateRequestsChannel);

      if (nextMicroDate.error) {
        throw new Error(nextMicroDate.error);
      }

      const microDateChannel = yield call(createChannelToMicroDate, nextMicroDate.id);
      const microDateUpdatesTask = yield takeEvery(microDateChannel, incomingMicroDateUpdatedSaga);

      const task1 = yield fork(incomingMicroDateRequestSaga, nextMicroDate);
      const task2 = yield fork(incomingMicroDateAcceptSaga, nextMicroDate);

      const task3 = yield fork(incomingMicroDateDeclineByMeSaga, nextMicroDate);
      const task4 = yield fork(incomingMicroDateCancelSaga, nextMicroDate);
      const task5 = yield fork(incomingMicroDateStopByMeSaga, nextMicroDate);
      const task6 = yield fork(incomingMicroDateStopByTargetSaga);

      const task7 = yield fork(incomingMicroDateSelfieUploadedByTargetSaga);
      const task8 = yield fork(incomingMicroDateSelfieUploadedByMeSaga);

      const task9 = yield fork(incomingMicroDateSelfieDeclineByMeSaga, nextMicroDate);
      const task10 = yield fork(incomingMicroDateSelfieAcceptByMeSaga, nextMicroDate);

      const task11 = yield fork(incomingMicroDateFinishedSaga, nextMicroDate);

      const stopAction = yield take([
        'MICRO_DATE_INCOMING_REMOVE',
        'MICRO_DATE_INCOMING_DECLINED_BY_ME',
        'MICRO_DATE_INCOMING_CANCELLED',
        'MICRO_DATE_INCOMING_STOPPED_BY_ME',
        'MICRO_DATE_INCOMING_STOPPED_BY_TARGET',
        'MICRO_DATE_INCOMING_APPROVED_SELFIE',
      ]);
      console.log('Cancelling tasks');

      yield microDateChannel.close();
      yield cancel(microDateUpdatesTask, task1, task2, task3, task4, task5, task6, task7, task8, task9, task10, task11);

      if (stopAction.type === 'MICRO_DATE_INCOMING_REMOVE') {
        yield put({ type: 'UI_MAP_PANEL_HIDE_FORCE' });
      }
    }
  } catch (error) {
    yield put({ type: 'MICRO_DATE_INCOMING_ERROR', payload: error });
  }
}

function* incomingMicroDateUpdatedSaga(microDate) {
  try {
    if (microDate.error) {
      throw new Error(microDate.error);
    }

    if (microDate.hasNoData) {
      yield put({ type: 'MICRO_DATE_INCOMING_REMOVE' });
      return;
    }

    switch (microDate.status) {
      case 'REQUEST':
        yield put({ type: 'MICRO_DATE_INCOMING_REQUEST', payload: microDate });
        break;
      case 'ACCEPT':
        yield put({ type: 'MICRO_DATE_INCOMING_ACCEPT' });
        break;
      case 'CANCEL_REQUEST':
        yield put({ type: 'MICRO_DATE_INCOMING_CANCEL' });
        break;
      case 'STOP':
        if (microDate.stopBy !== microDate.requestFor) {
          yield put({ type: 'MICRO_DATE_INCOMING_STOP_BY_TARGET', payload: microDate });
        }
        break;
      case 'SELFIE_UPLOADED':
        if (microDate.selfie.uploadedBy === microDate.requestBy) {
          yield put({ type: 'MICRO_DATE_INCOMING_SELFIE_UPLOADED_BY_TARGET', payload: microDate });
        } else if (microDate.selfie.uploadedBy === microDate.requestFor) {
          yield put({ type: 'MICRO_DATE_INCOMING_SELFIE_UPLOADED_BY_ME', payload: microDate });
        }
        break;
      case 'FINISHED':
        yield put({ type: 'MICRO_DATE_INCOMING_FINISHED', payload: microDate });
        break;
      default:
        console.log(microDate);
        yield put({
          type: 'MICRO_DATE_UPDATED_SAGA_UNKNOWN_STATUS_ERROR',
          payload: `Unknown microDate status: ${microDate.status}`,
        });
        break;
    }
  } catch (error) {
    yield put({ type: 'MICRO_DATE_UPDATED_SAGA_ERROR', payload: error });
  }
}

function* incomingMicroDateRequestSaga(microDate) {
  yield take('MICRO_DATE_INCOMING_REQUEST');
  const myCoords = yield select((state) => state.location.coords);
  const userSnap = yield microDate.requestByRef.get();
  const targetUser = {
    id: userSnap.id,
    shortId: userSnap.id.substring(0, 4),
    ...userSnap.data(),
  };

  yield put({
    type: 'UI_MAP_PANEL_SHOW',
    payload: {
      mode: 'incomingMicroDateRequest',
      targetUser,
      distance: GeoUtils.distance(userSnap.data().geoPoint, myCoords),
      canHide: false,
      microDateId: microDate.id,
    },
  });
}

function* incomingMicroDateAcceptSaga(microDate) {
  while (true) {
    const action = yield take('MICRO_DATE_INCOMING_ACCEPT');
    const { acceptType } = action.payload ? action.payload : {};

    const myCoords = yield select((state) => state.location.coords);
    const userSnap = yield microDate.requestByRef.get();
    const targetUser = {
      id: userSnap.id,
      shortId: userSnap.id.substring(0, 4),
      ...userSnap.data(),
    };

    if (acceptType === 'acceptButtonPressed') {
      yield firebase.firestore()
        .collection(MICRO_DATES_COLLECTION)
        .doc(microDate.id)
        .update({
          status: 'ACCEPT',
          startDistance: GeoUtils.distance(userSnap.data().geoPoint, myCoords),
          requestForGeoPoint: new firebase.firestore.GeoPoint(myCoords.latitude, myCoords.longitude),
          requestByGeoPoint: userSnap.data().geoPoint,
          acceptTS: firebase.firestore.FieldValue.serverTimestamp(),
        });
    }

    yield put({
      type: 'MICRO_DATE_INCOMING_START',
      payload: {
        targetUser,
        myCoords,
        distance: GeoUtils.distance(userSnap.data().geoPoint, myCoords),
        microDateId: microDate.id,
      },
    });

    yield put({
      type: 'UI_MAP_PANEL_SHOW',
      payload: {
        canClose: true,
        mode: 'activeMicroDate',
        distance: GeoUtils.distance(userSnap.data().geoPoint, myCoords),
      },
    });
  }
}

function* incomingMicroDateCancelSaga(microDate) {
  yield take('MICRO_DATE_INCOMING_CANCEL');
  yield put({
    type: 'UI_MAP_PANEL_SHOW',
    payload: {
      mode: 'incomingMicroDateCancelled',
      canHide: true,
      microDate,
    },
  });
  yield put({ type: 'MICRO_DATE_INCOMING_CANCELLED' });
}

function* incomingMicroDateDeclineByMeSaga(microDate) {
  yield take('MICRO_DATE_INCOMING_DECLINE_BY_ME');
  yield firebase.firestore()
    .collection(MICRO_DATES_COLLECTION)
    .doc(microDate.id)
    .update({
      status: 'DECLINE',
      declineTS: firebase.firestore.FieldValue.serverTimestamp(),
      active: false,
    });
  yield put({ type: 'MICRO_DATE_INCOMING_DECLINED_BY_ME' });
}

function* incomingMicroDateStopByMeSaga(microDate) {
  yield take('MICRO_DATE_STOP');
  yield firebase.firestore()
    .collection(MICRO_DATES_COLLECTION)
    .doc(microDate.id)
    .update({
      status: 'STOP',
      active: false,
      stopBy: microDate.requestFor,
      stopTS: firebase.firestore.FieldValue.serverTimestamp(),
    });
  yield put({ type: 'MICRO_DATE_INCOMING_STOPPED_BY_ME' });
}

function* incomingMicroDateStopByTargetSaga() {
  const action = yield take('MICRO_DATE_INCOMING_STOP_BY_TARGET');
  const microDate = action.payload;

  yield put({
    type: 'UI_MAP_PANEL_SHOW',
    payload: {
      mode: 'microDateStopped',
      canHide: true,
      microDate,
    },
  });
  yield put({ type: 'MICRO_DATE_INCOMING_STOPPED_BY_TARGET' });
}

function* incomingMicroDateSelfieUploadedByTargetSaga() {
  while (true) {
    const action = yield take('MICRO_DATE_INCOMING_SELFIE_UPLOADED_BY_TARGET');
    const microDate = action.payload;

    yield put({
      type: 'UI_MAP_PANEL_SHOW',
      payload: {
        mode: 'selfieUploadedByTarget',
        canHide: false,
        microDate,
      },
    });
  }
}

function* incomingMicroDateSelfieUploadedByMeSaga() {
  while (true) {
    const action = yield take('MICRO_DATE_INCOMING_SELFIE_UPLOADED_BY_ME');
    const microDate = action.payload;

    yield put({
      type: 'UI_MAP_PANEL_SHOW',
      payload: {
        mode: 'selfieUploadedByMe',
        canHide: false,
        microDate,
      },
    });
  }
}

function* incomingMicroDateSelfieDeclineByMeSaga(microDate) {
  while (true) {
    yield take('MICRO_DATE_DECLINE_SELFIE_BY_ME');
    yield firebase.firestore()
      .collection(MICRO_DATES_COLLECTION)
      .doc(microDate.id)
      .update({
        status: 'ACCEPT',
      });
    yield put({ type: 'UI_MAP_PANEL_HIDE_FORCE' });
  }
}

function* incomingMicroDateSelfieAcceptByMeSaga(microDate) {
  yield take('MICRO_DATE_APPROVE_SELFIE');
  yield firebase.firestore()
    .collection(MICRO_DATES_COLLECTION)
    .doc(microDate.id)
    .update({
      status: 'FINISHED',
      active: false,
      finishTS: firebase.firestore.FieldValue.serverTimestamp(),
      moderationStatus: 'PENDING',
      [`${microDate.requestBy}_firstAlert`]: false,
      [`${microDate.requestFor}_firstAlert`]: false,
    });

  yield put({ type: 'MICRO_DATE_INCOMING_APPROVED_SELFIE' });
}

function* incomingMicroDateFinishedSaga(microDate) {
  yield take('MICRO_DATE_INCOMING_FINISHED');
  yield firebase.firestore()
    .collection(MICRO_DATES_COLLECTION)
    .doc(microDate.id)
    .update({
      [`${microDate.requestFor}_firstAlert`]: true,
    });
  yield Actions.navigate({ routeName: 'MicroDate', params: { microDate } });
}

function createChannelForIncomingMicroDateRequests(uid) {
  const microDateStartedByOthersQuery = firebase.firestore()
    .collection(MICRO_DATES_COLLECTION)
    .where('requestFor', '==', uid)
    .where('active', '==', true)
    .orderBy('requestTS')
    .limit(1);

  return eventChannel((emit) => {
    const onSnapshotUpdated = (snapshot) => {
      if (snapshot.docs.length > 0 && snapshot.docChanges[0].type === 'added') {
        const microDate = snapshot.docs[0].data();

        emit({
          ...microDate,
          id: snapshot.docs[0].id,
        });
      }
    };

    const onError = (error) => {
      emit({
        error,
      });
    };

    const unsubscribe = microDateStartedByOthersQuery.onSnapshot(onSnapshotUpdated, onError);

    return unsubscribe;
  });
}

function createChannelToMicroDate(microDateId) {
  const microDateQuery = firebase.firestore()
    .collection(MICRO_DATES_COLLECTION)
    .doc(microDateId);

  return eventChannel((emit) => {
    const onSnapshotUpdated = (dataSnapshot) => {
      // console.log('Microdate updated: ', dataSnapshot);
      emit({
        ...dataSnapshot.data(),
        hasNoData: typeof dataSnapshot.data() === 'undefined',
        id: dataSnapshot.id,
      });
    };

    const onError = (error) => {
      emit({
        error,
      });
    };

    const unsubscribe = microDateQuery.onSnapshot(onSnapshotUpdated, onError);

    return unsubscribe;
  });
}


async function getPendingViewFinishedMicroDate(uid) {
  // const microDatesQuery = firebase.firestore()
  //   .collection(MICRO_DATES_COLLECTION)
  //   .where('requestFor', '==', uid)
  //   .where('status', '==', 'FINISHED')
  //   // .where(`${uid}_firstAlert`, '==', false)
  //   .where('active', '==', false);

  // const microDatesSnapshot = await microDatesQuery.get();
  // const microDateSnapshot = microDatesSnapshot.docs[0];
  console.log(uid);
  const microDate = firebase.firestore()
    .collection(MICRO_DATES_COLLECTION)
    .doc('3uloX6P8tvZaxqodH23e');
  const microDateSnapshot = await microDate.get();

  return microDateSnapshot ? microDateSnapshot.data() : null;
}
