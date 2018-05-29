import { call, take, put, takeLatest, select, cancel, actionChannel } from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import firebase from 'react-native-firebase';
import GeoUtils from '../../utils/geo-utils';

import { MICRO_DATES_COLLECTION } from '../../constants';

export default function* microDateOutgoingRequestsSaga() {
  let microDateChannel;
  let microDateUpdatesTask;

  try {
    const requestsChannel = yield actionChannel([
      'MICRO_DATE_OUTGOING_REQUEST',
      'MICRO_DATE_OUTGOING_REQUEST_PENDING',
    ]);
    const myUid = yield select((state) => state.auth.uid);
    const pendingMicroDate = yield getPendingOutgoingMicroDate(myUid);

    if (pendingMicroDate) {
      const targetUserSnap = yield pendingMicroDate.requestForRef.get();

      yield put({
        type: 'MICRO_DATE_OUTGOING_REQUEST_PENDING',
        payload: {
          user: {
            id: targetUserSnap.id,
            shortId: targetUserSnap.id.substring(0, 4),
            ...targetUserSnap.data(),
          },
          microDate: pendingMicroDate,
        },
      });
    }

    while (true) {
      let microDate: any = {};
      let microDateRef = {};

      const action = yield take(requestsChannel);
      const targetUser = action.payload.user;

      if (action.type === 'MICRO_DATE_OUTGOING_REQUEST') {
        microDateRef = yield firebase.firestore()
          .collection(MICRO_DATES_COLLECTION).doc();
        microDate = {
          status: 'REQUEST',
          requestBy: myUid,
          requestFor: targetUser.uid,
          requestByRef: firebase.firestore().collection('geoPoints').doc(myUid),
          requestForRef: firebase.firestore().collection('geoPoints').doc(targetUser.uid),
          requestTS: firebase.firestore.FieldValue.serverTimestamp(),
          active: true,
          id: microDateRef.id,
        };
        yield microDateRef.set(microDate);
      } else if (action.type === 'MICRO_DATE_OUTGOING_REQUEST_PENDING') {
        microDate = action.payload.microDate; // eslint-disable-line
      }

      microDateChannel = yield call(createChannelToMicroDate, microDate.id || microDateRef.id);
      microDateUpdatesTask = yield takeLatest(microDateChannel, handleOutgoingRequestsSaga);

      const nextAction = yield take([
        'MICRO_DATE_OUTGOING_CANCEL',
        'MICRO_DATE_OUTGOING_DECLINED_BY_TARGET',
        'MICRO_DATE_STOPPED_BY_TARGET',
        'MICRO_DATE_STOP',
        'MICRO_DATE_OUTGOING_REMOVE',
      ]);

      if (nextAction.type === 'MICRO_DATE_OUTGOING_REMOVE') {
        yield* handleRemoveRequest(microDateChannel, microDateUpdatesTask);
      } else if (nextAction.type === 'MICRO_DATE_OUTGOING_CANCEL') {
        yield* handleCancelRequest(microDateChannel, microDateUpdatesTask, microDate.id);
      } else if (nextAction.type === 'MICRO_DATE_STOP') {
        yield* handleStopRequest(microDateChannel, microDateUpdatesTask, microDate);
      } else {
        yield* cancelMicroDateTaskAndChannel(microDateChannel, microDateUpdatesTask);
      }
    }
  } catch (error) {
    yield put({ type: 'MICRO_DATE_OUTGOING_ERROR', payload: error });
  }

  function* handleOutgoingRequestsSaga(microDate) {
    if (microDate.error) {
      throw new Error(microDate.error);
    }

    if (microDate.hasNoData) {
      yield put({ type: 'MICRO_DATE_OUTGOING_REMOVE' });
      return;
    }

    const myCoords = yield select((state) => state.location.coords);
    const userSnap = yield microDate.requestForRef.get();
    const user = {
      id: userSnap.id,
      shortId: userSnap.id.substring(0, 4),
      ...userSnap.data(),
    };

    switch (microDate.status) {
      case 'REQUEST':
        yield put({
          type: 'UI_MAP_PANEL_SHOW',
          payload: {
            mode: 'outgoingMicroDateAwaitingAccept',
            canHide: false,
            microDate: {
              id: microDate.id,
              requestFor: microDate.requestFor,
              requestTS: microDate.requestTS,
            },
          },
        });

        yield put({ type: 'MICRO_DATE_OUTGOING_REQUESTED' });

        break;
      case 'DECLINE':
        yield put({
          type: 'UI_MAP_PANEL_SHOW',
          payload: {
            mode: 'outgoingMicroDateDeclined',
            canHide: true,
            microDate: {
              id: microDate.id,
              requestFor: microDate.requestFor,
              declineTS: microDate.declineTS,
            },
          },
        });

        yield put({ type: 'MICRO_DATE_OUTGOING_DECLINED_BY_TARGET' });

        break;
      case 'ACCEPT':
        yield put({
          type: 'MICRO_DATE_OUTGOING_START',
          payload: {
            user,
            myCoords,
            distance: GeoUtils.distance(userSnap.data().geoPoint, myCoords),
            microDateId: microDate.id,
          },
        });

        yield put({
          type: 'UI_MAP_PANEL_SHOW',
          payload: {
            mode: 'activeMicroDate',
            canHide: true,
            distance: GeoUtils.distance(userSnap.data().geoPoint, myCoords),
          },
        });
        break;
      case 'STOP':
        if (microDate.stopBy !== microDate.requestBy) {
          yield put({
            type: 'UI_MAP_PANEL_SHOW',
            payload: {
              mode: 'microDateStopped',
              canHide: true,
              microDate,
            },
          });

          yield put({ type: 'MICRO_DATE_STOPPED_BY_TARGET' });
        }
        break;
      case 'SELFIE_UPLOADED':
        if (microDate.selfie.uploadedBy === microDate.requestBy) {
          yield put({
            type: 'UI_MAP_PANEL_SHOW',
            payload: {
              mode: 'selfieUploadedByMe',
              canHide: false,
              microDate,
            },
          });
          // yield put({
          //   type: 'MICRO_DATE_OUTGOING_START',
          //   payload: {
          //     user,
          //     myCoords,
          //     distance: GeoUtils.distance(userSnap.data().geoPoint, myCoords),
          //     microDateId: microDate.id,
          //   },
          // });

          yield put({ type: 'MICRO_DATE_OUTGOING_SELFIE_UPLOADED_BY_ME' });
        } else if (microDate.selfie.uploadedBy !== microDate.requestBy) {
          yield put({
            type: 'UI_MAP_PANEL_SHOW',
            payload: {
              mode: 'selfieUploadedByTarget',
              canHide: false,
              microDate,
            },
          });
          yield put({ type: 'MICRO_DATE_OUTGOING_SELFIE_UPLOADED_BY_TARGET' });
          const nextAction = yield take([
            'MICRO_DATE_DECLINE_SELFIE_BY_ME',
            'MICRO_DATE_INCOMING_ACCEPT_SELFIE',
          ]);
          if (nextAction.type === 'MICRO_DATE_DECLINE_SELFIE_BY_ME') {
            yield firebase.firestore()
              .collection(MICRO_DATES_COLLECTION)
              .doc(microDate.id)
              .update({
                status: 'ACCEPT',
              });
          }
        }
        break;
      default:
        console.log('Request removed');
        break;
    }
  }
}

function* handleCancelRequest(microDateChannel, microDateUpdatesTask, microDateId) {
  yield* cancelMicroDateTaskAndChannel(microDateChannel, microDateUpdatesTask);
  yield firebase.firestore()
    .collection(MICRO_DATES_COLLECTION)
    .doc(microDateId)
    .update({
      status: 'CANCEL_REQUEST',
      active: false,
      cancelRequestTS: firebase.firestore.FieldValue.serverTimestamp(),
    });
  yield put({ type: 'MICRO_DATE_OUTGOING_CANCELLED' });
}

function* handleStopRequest(microDateChannel, microDateUpdatesTask, microDate) {
  yield* cancelMicroDateTaskAndChannel(microDateChannel, microDateUpdatesTask);
  yield firebase.firestore()
    .collection(MICRO_DATES_COLLECTION)
    .doc(microDate.id)
    .update({
      status: 'STOP',
      active: false,
      stopBy: microDate.requestBy,
      stopTS: firebase.firestore.FieldValue.serverTimestamp(),
    });
  yield put({ type: 'MICRO_DATE_STOPPED' });
}

function* handleRemoveRequest(microDateChannel, microDateUpdatesTask) {
  yield put({ type: 'UI_MAP_PANEL_HIDE_FORCE' });
  yield* cancelMicroDateTaskAndChannel(microDateChannel, microDateUpdatesTask);
  yield put({ type: 'MICRO_DATE_OUTGOING_REMOVED' });
}

function* cancelMicroDateTaskAndChannel(microDateChannel, microDateUpdatesTask) {
  yield cancel(microDateUpdatesTask);
  yield microDateChannel.close();
}

function createChannelToMicroDate(microDateId) {
  const query = firebase.firestore()
    .collection(MICRO_DATES_COLLECTION)
    .doc(microDateId);

  return eventChannel((emit) => {
    const onSnapshotUpdated = (dataSnapshot) => {
      // do not process local updates triggered by local writes
      // if (dataSnapshot.metadata.fromCache === true) {
      //   return;
      // }

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

    const unsubscribe = query.onSnapshot(onSnapshotUpdated, onError);

    return unsubscribe;
  });
}

async function getPendingOutgoingMicroDate(uid) {
  const dateStartedByMeQuery = firebase.firestore()
    .collection(MICRO_DATES_COLLECTION)
    .where('requestBy', '==', uid)
    .where('active', '==', true);
  const dateStartedByMeSnapshot = await dateStartedByMeQuery.get();
  // console.log('Active dates by me: ', dateStartedByMeSnapshot.docs.length);
  const activeDateSnapshot = dateStartedByMeSnapshot.docs[0];

  return activeDateSnapshot ? {
    ...activeDateSnapshot.data(),
    id: activeDateSnapshot.id,
  } : null;
}
