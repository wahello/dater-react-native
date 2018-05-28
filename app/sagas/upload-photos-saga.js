import { takeEvery, call, put, take, fork, select } from 'redux-saga/effects';
import firebase from 'react-native-firebase';
import { eventChannel } from 'redux-saga';

export default function* uploadPhotosSaga() {
  let uploadTaskId = 0;

  while (true) {
    const nextPhoto = yield take('UPLOAD_PHOTO_START');
    yield fork(uploadPhoto, uploadTaskId, nextPhoto);
    uploadTaskId += 1;
  }
}

function* uploadPhoto(uploadTaskId, action) {
  const uid = yield select((state) => state.auth.uid);
  yield console.log('New upload task: ', uploadTaskId);
  const metadata = {
    contentType: 'image/jpeg',
  };
  const fileName = action.payload.uri.replace(/^.*[\\/]/, '');
  const microDate = yield select((state) => state.microDate);
  const uploadTask = firebase.storage()
    .ref(`microDates/${microDate.id}/${uid}/${fileName}`)
    .put(action.payload.uri, metadata);
  const uploadTaskChannel = yield call(createUploadTaskChannel, uploadTask);

  yield takeEvery(uploadTaskChannel, uploadTaskProgress, uploadTaskId);
  yield take(`UPLOAD_PHOTO_TASK_${uploadTaskId}_SUCCESS`);
  yield uploadTaskChannel.close();
}

function* uploadTaskProgress(uploadTaskId, progress) {
  yield console.log(`uploadTask #: ${uploadTaskId} progress: ${progress.progress}`);
  if (progress.finished === true) {
    yield put({
      type: `UPLOAD_PHOTO_TASK_${uploadTaskId}_SUCCESS`,
      payload: {
        ...progress,
        uploadTaskId,
      },
    });
  }
}

function createUploadTaskChannel(uploadTask) {
  console.log('Upload task submitted: ', uploadTask);
  return eventChannel((emit) => {
    const onTaskProgress = (snapshot) => {
      // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      switch (snapshot.state) {
        case firebase.storage.TaskState.PAUSED: // or 'paused'
          emit({
            progress,
            paused: true,
          });
          break;
        case firebase.storage.TaskState.RUNNING: // or 'running'
          emit({
            progress,
            running: true,
          });
          break;
        default:
          emit({
            progress,
            state: snapshot.state,
          });
          break;
      }
    };

    const onTaskError = (error) => {
      emit({
        error: error.code,
      });
      // A full list of error codes is available at
      // https://firebase.google.com/docs/storage/web/handle-errors
      switch (error.code) {
        case 'storage/unauthorized':
          // User doesn't have permission to access the object
          break;

        case 'storage/canceled':
          // User canceled the upload
          break;
        case 'storage/unknown':
          // Unknown error occurred, inspect error.serverResponse
          break;
        default:
          break;
      }
    };

    const onTaskSuccess = async (finishedTask) => {
      // Upload completed successfully, now we can get the download URL
      emit({
        finished: true,
        progress: 100,
        downloadURL: finishedTask.downloadURL,
        metadata: finishedTask.metadata,
      });
    };

    // Listen for state changes, errors, and completion of the upload.
    uploadTask.on(
      firebase.storage.TaskEvent.STATE_CHANGED,
      onTaskProgress,
      onTaskError,
      onTaskSuccess,
    );

    const unsubscribe = async () => {
      // await uploadTask.ref.delete();
    };
    return unsubscribe;
  });
}

