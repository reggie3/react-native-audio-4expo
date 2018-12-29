import React, { Component } from 'react';
import {
  TouchableHighlight,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  Slider
} from 'react-native';
import { Text } from 'native-base';
import { Audio, FileSystem, Permissions } from 'expo';
import PropTypes from 'prop-types';
import * as styles from './styles';
import PlayTimeStamp from './PlayTimeStamp';
import RecordTimeStamp from './RecordTimeStamp';

const formattedSeconds = (millis) => {
  let sec = millis / 1000;
  return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
};

const initialState = {
  playStatus: 'NO_SOUND_FILE_AVAILABLE',
  recordStatus: 'NOT_STARTED',

  // legacy
  durationMillis: 0,
  playbackMillis: 0,
  positionMillis: 0,
  recordingInformation: {},
  recordingDuration: 0,
  soundDuration: 0,
  maxSliderValue: 0,
  currentSliderValue: 0,
  soundFileInfo: 'make a recording to see its information',
  debugStatements: 'debug info will appear here'
};
export default class AudioRecorder extends Component {
  constructor(props) {
    super(props);
    this.sound = null;
    this.recording = null;
    this.state = {
      isRecording: false,
      error: null,
      hasPermissions: false,
      showRecorder: false,
      secondsElapsed: 0,
      audioInfo: {},
      debugStatements: 'debug info will appear here'
    };
  }

  componentDidMount = async () => {
    // check if permissions have already been granted
    const permissionsRes = await Permissions.getAsync(
      Permissions.AUDIO_RECORDING
    );

    if (permissionsRes.status !== 'granted') {
      //ask for permissions
      this.askForPermissions();
    } else if (permissionsRes.status === 'granted') {
      this.setState({ hasPermissions: true, showRecorder: true });
    } else {
      this.props.onError({
        hasError: true,
        message: 'Error: checking permissions'
      });
    }
  };

  componentWillUnmount = () => {
    if (this.sound) {
      this.sound.setOnPlaybackStatusUpdate(null);
    }
    if (this.recording) {
      this.recording.setOnRecordingStatusUpdate(null);
    }
  };

  addDebugStatement = (statement) => {
    this.setState({
      debugStatements: this.state.debugStatements.concat(`- ${statement}\n`)
    });
  };

  async askForPermissions() {
    Permissions.askAsync(Permissions.AUDIO_RECORDING)
      .then((res) => {
        console.log({ res });
        if (res.status === 'granted') {
          // update the permissions in app state so that the callback
          // can reference the correct values next time it is called
          this.setState({ hasPermissions: true, showRecorder: true });
          this.props.permissionsRetrievedCallback
            ? this.props.permissionsRetrievedCallback(res)
            : null;
        } else {
          this.showPermissionsAlert();
        }
      })
      .catch((err) => {
        console.log({ err });
        this.showPermissionsAlert();
      });
  }

  showPermissionsAlert = () => {
    Alert.alert(
      this.props.permissionsAlert.title,
      this.props.permissionsAlert.message,
      [
        {
          text: this.props.permissionsAlert.tryAgainText,
          onPress: () => {
            this.askForPermissions();
          }
        },
        {
          text: this.props.permissionsAlert.doNotTryAgainText,
          onPress: () => {
            this.props.denyPermissionRequestCallback();
          }
        }
      ],
      { cancelable: true }
    );
  };

  // TODO: fix this function being called
  // after the component has been unmounted
  updateScreenForSoundStatus = (status) => {
    console.log({ 'updateScreenForSoundStatus: ': status });
    if (status.isLoaded) {
      let updatedPlaybackStatus = undefined;
      if (status.isPlaying) {
        updatedPlaybackStatus = 'playing';
      } else if (!status.isPlaying) {
        updatedPlaybackStatus = 'stopped';
      } else if (status.isBuffering === true) {
        updatedPlaybackStatus = 'buffering';
      } else {
        this.addDebugStatement('unknown status in updateScreenForSoundStatus');
      }

      this.addDebugStatement(`status.positionMillis: ${status.positionMillis}`);
      this.setState({
        maxSliderValue: status.durationMillis,
        positionMillis: status.positionMillis,
        currentSliderValue: status.positionMillis,
        shouldPlay: status.shouldPlay,
        isPlaying: status.isPlaying,
        rate: status.rate,
        muted: status.isMuted,
        volume: status.volume,
        shouldCorrectPitch: status.shouldCorrectPitch,
        isPlaybackAllowed: true,
        playbackStatus: updatedPlaybackStatus
      });
    } else {
      this.setState({
        soundDuration: null,
        isPlaybackAllowed: false
      });

      if (status.error) {
        this.addDebugStatement(`FATAL PLAYER ERROR: ${status.error}`);
      }
    }
    //  }
  };

  // update the status and progress of recording
  updateRecordingStatus = (status) => {
    console.log({ 'updateRecordingStatus: ': status });
    //
    if (!status.isRecording) {
      this.setState({
        recordStatus: 'NOT_RECORDING',
        isRecording: false
      });
      this.addDebugStatement(`NOT_RECORDING: ${status.durationMillis}`);
    } else if (status.isRecording) {
      this.setState({
        recordStatus: 'RECORDING',
        recordingDuration: status.durationMillis,
        currentSliderValue: status.durationMillis,
        isRecording: true
      });
      this.addDebugStatement(`RECORDING: ${status.durationMillis}`);
    } else if (status.isDoneRecording) {
      this.setState({
        recordStatus: 'RECORDING_COMPLETE',
        recordingDuration: status.durationMillis,
        isRecording: false
      });
      this.addDebugStatement(`isDoneRecording: ${status.durationMillis}`);

      /* if (!this.state.isLoading) {
        this.stopRecordingAndEnablePlayback();
      } */
    }
  };

  toggleRecord = () => {
    if (this.state.isRecording) {
      this.stopRecordingAndEnablePlayback();
    } else {
      this.stopPlaybackAndBeginRecording();
    }
  };

  /*
  Record sound
   */
  stopPlaybackAndBeginRecording = async () => {
    this.setState({
      isLoading: true
    });
    if (this.sound !== null) {
      try {
        await this.sound.unloadAsync();
        this.sound.setOnPlaybackStatusUpdate(null);
        this.sound = null;
      } catch (error) {
        console.log({ 'unloadAsync error: ': error });
        this.setState({
          recordStatus: 'ERROR'
        });
      }
    }

    try {
      await Audio.setAudioModeAsync(this.props.audioMode);
    } catch (error) {
      console.log({ 'setAudioModeAsync error: ': error });
    }

    if (this.recording !== null) {
      this.recording.setOnRecordingStatusUpdate(null);
      this.recording = null;
    }

    const recording = new Audio.Recording();
    try {
      await recording.prepareToRecordAsync(
        JSON.parse(JSON.stringify(this.props.recordingSettings))
      );
      recording.setOnRecordingStatusUpdate(this.updateScreenForRecordingStatus);
      this.recording = recording;
    } catch (error) {
      console.log({ 'prepareToRecordAsync error: ': error });
    }

    console.log({ 'this.recording': this.recording });
    try {
      await this.recording.startAsync(); // Will call this._updateScreenForRecordingStatus to update the screen.
      this.setState({
        isLoading: false,
        isRecording: true
      });
    } catch (error) {
      console.log({ 'recording.startAsync error: ': error });
    }

    /* // check to see if there is already a sound object loaded and unload if it
    // if there is
    console.log('recording');
    if (this.sound !== null) {
      try {
        this.sound.setOnPlaybackStatusUpdate(null);
        await this.sound.unloadAsync().then(() => {
          this.addDebugStatement('******** sound unloaded ********');
        });
      } catch (error) {
        this.addDebugStatement(`Error: unloadAsync ${error}`);
      }
      this.sound.setOnPlaybackStatusUpdate(null);
      this.sound = null;
    }

    // check to see if there is already a recording object loaded and unload if it
    // if there is
    try {
      await Audio.setAudioModeAsync(this.props.audioMode);
      if (this.recording !== null) {
        this.recording.setOnRecordingStatusUpdate(null);
        this.recording = null;
      }
    } catch (error) {
      this.addDebugStatement(`Error: setAudioModeAsync ${error}`);
    }

    // create a new recording object
    const recording = new Audio.Recording();
    try {
      await recording.prepareToRecordAsync(this.props.recordingSettings);
      recording.setOnRecordingStatusUpdate(
        this.updateRecordingStatus.bind(this)
      );

      // await recording.setProgressUpdateInterval(100);

      await recording.startAsync();

      this.setState({
        recordStatus: 'RECORDING',
        maxSliderValue: this.props.maxFileSize
      });
      this.recording = recording;
    } catch (error) {
      if (error.includes) console.log(`Error: startAsync: ${error}`);
      this.addDebugStatement(`Error: startAsync: ${error}`);
      this.setState({ recordStatus: 'ERROR' });
    } */
  };

  /*
  Stop recording, enable playback, and write sound file information to redux store
   */
  async stopRecordingAndEnablePlayback() {
    this.setState({
      playStatus: 'LOADING',
      recordStatus: 'BUFFERING'
    });
    // stop and unload ongoing recording
    try {
      await this.recording.stopAndUnloadAsync();
      this.recording.setOnRecordingStatusUpdate(null);
      this.addDebugStatement(' +++ unloading recording before playing +++');
      this.setState({
        playStatus: 'STOPPED',
        recordStatus: 'RECORDING_COMPLETE',
        isRecording: false
      });
    } catch (error) {
      console.log({ 'stopAndUnloadAsync error: ': error });
      this.setState({
        recordStatus: 'ERROR',
        isRecording: false
      });
    }

    // get the file info
    let audioInfo;
    try {
      audioInfo = await FileSystem.getInfoAsync(this.recording.getURI());
      this.setState({ audioInfo });
    } catch (error) {
      console.log({ 'FileSystem.getInfoAsync error:': error });

      this.setState({
        recordStatus: 'ERROR'
      });
    }
    console.log({ audioInfo });

    try {
      await Audio.setAudioModeAsync(this.props.audioMode);
      this.setState({
        recordStatus: 'RECORDING_COMPLETE'
      });
    } catch (error) {
      console.log({ 'Error: Audio.setAudioModeAsync': error });
      this.setState({
        recordStatus: 'ERROR'
      });
    }

    // now that recording is complete, create and load a new sound object
    // to save to component state so that it can be played back later
    try {
      const { sound, status } = await this.recording.createNewLoadedSoundAsync(
        null,
        this.onPlaybackStatusUpdate
      );
      this.setState({
        audioInfo: { ...audioInfo, durationMillis: status.durationMillis }
      });

      this.setState({
        positionMillis: status.positionMillis,
        durationMillis: status.durationMillis,
        maxSliderValue: status.durationMillis,
        currentSliderValue: 0
      });
      this.sound = sound;
    } catch (error) {
      console.log({ 'Error: createNewLoadedSound': error });
    }
    this.setState({
      playStatus: 'STOPPED',
      recordStatus: 'RECORDING_COMPLETE'
    });
  }

  /*
  Function used to update the UI during playback
  */
  onPlaybackStatusUpdate = (playbackStatus) => {
    console.log({ onPlaybackStatusUpdate: playbackStatus });
    if (this.state.recordStatus !== 'RECORDING') {
      if (!playbackStatus.isLoaded) {
        // Update your UI for the unloaded state
        if (playbackStatus.error) {
          this.addDebugStatement(
            `Encountered a fatal error during playback: ${playbackStatus.error}
          Please report this error as an issue.  Thank you!`
          );
          // Send Expo team the error on Slack or the forums so we can help you debug!
          this.setState({
            playStatus: 'ERROR'
          });
        }
      } else {
        // Update the UI for the loaded state
        if (playbackStatus.isPlaying) {
          this.addDebugStatement(
            `playbackStatus.positionMillis (here): ${
              playbackStatus.positionMillis
            }`
          );

          // Update  UI for the playing state
          this.setState({
            playStatus: 'PLAYING',
            positionMillis: playbackStatus.positionMillis,
            currentSliderValue: playbackStatus.positionMillis
          });
        } else {
          if (
            this.state.playStatus !== 'STOPPED' &&
            this.state.playStatus !== 'BUFFERING' &&
            this.state.playStatus !== 'LOADING' &&
            this.state.playStatus !== 'NO_SOUND_FILE_AVAILABLE' &&
            this.state.playStatus !== 'PLAYING'
          ) {
            // Update your UI for the paused state
            this.addDebugStatement('playStatus is paused');
            this.setState({
              positionMillis: playbackStatus.positionMillis,
              currentSliderValue: playbackStatus.positionMillis,
              durationMillis: playbackStatus.durationMillis
            });
          }
        }

        if (playbackStatus.isBuffering) {
          // Update your UI for the buffering state
          this.addDebugStatement('playbackStatus is buffering');
          this.setState({ playStatus: 'BUFFERING' });
        }

        if (playbackStatus.didJustFinish && !playbackStatus.isLooping) {
          this.addDebugStatement('playbackStatus is stopped');
          this.setState({
            positionMillis: playbackStatus.durationMillis,
            currentSliderValue: playbackStatus.durationMillis,
            durationMillis: playbackStatus.durationMillis,
            playStatus: 'STOPPED',
            isPlaying: false
          });
        }
      }
    }
  };

  onReset = () => {
    this.resetRecordingState();
  };

  resetRecordingState = () => {
    this.sound = null;
    this.recording = null;
    this.setState({
      ...initialState
    });
  };

  // perform this action when the user presses the "done" key
  onComplete = async () => {
    // need to check if sound has been set to null in case the user
    // has recorded something, then did a reset, and then clicks the finish button
    if (this.sound !== null) {
      try {
        await this.sound.unloadAsync().then(() => {
          this.addDebugStatement('******** sound unloaded ********');
          this.props.onComplete(this.state.soundFileInfo);
        });
      } catch (error) {
        this.addDebugStatement(`Error: unloadAsync ${error}`);
      }
      // clear the status update object if the sound hasn't already been set to null
      if (this.sound.hasOwnProperty('setOnPlaybackStatusUpdate')) {
        this.sound.setOnPlaybackStatusUpdate(null);
      }
      this.sound = null;
    } else {
      // only get here if the user has never tried to click record or
      // did a reset
      this.props.onComplete(this.state.soundFileInfo);
    }
  };

  onSliderValueChange = (value) => {
    // set the postion of the actual sound object
    this.addDebugStatement(`onSliderValueChange: ${value}`);
    this.sound.setPositionAsync(value);
  };

  onStartRecordingPress = () => {
    this.stopPlaybackAndBeginRecording();
  };

  onStopRecordingPress = () => {
    this.stopRecordingAndEnablePlayback();
  };

  onPlayPress = () => {
    if (this.state.playStatus === 'PAUSED') {
      this.sound.playAsync().then(() => {
        this.setState({ playStatus: 'PLAYING' });
      });
    } else if (this.state.playStatus === 'STOPPED') {
      // check to see if the entire audio has finished playing, and if so
      // reset to the beginning and play it
      if (this.state.positionMillis === this.state.durationMillis) {
        this.sound.stopAsync().then(() => {
          this.sound.playAsync().then(() => {
            this.setState({ playStatus: 'PLAYING' });
          });
        });
      } else {
        // just play from wherever we are
        this.sound.playAsync().then(() => {
          this.setState({ playStatus: 'PLAYING' });
        });
      }
    } else {
      this.addDebugStatement(
        `Error onPlayPress: unexpected state.playStatus ${
          this.state.playStatus
        }`
      );
    }
  };

  onPausePress = () => {
    if (this.sound != null) {
      if (this.state.playStatus === 'PLAYING') {
        this.sound.pauseAsync().then(() => {
          this.setState({ playStatus: 'PAUSED' });
        });
      }
    }
  };

  renderTimer = () => {
    return this.props.timerComponent({
      value: formattedSeconds(this.state.positionMillis || 0),
      isRecording: this.state.isRecording
    });
  };

  renderTimeStamp = () => {
    if (this.state.playStatus === 'PLAYING') {
      return (
        <PlayTimeStamp
          playStatus={this.state.playStatus}
          recordStatus={this.state.recordStatus}
          sound={this.sound}
          positionMillis={this.state.positionMillis}
          durationMillis={this.state.durationMillis}
          timeStampStyle={this.props.timeStampStyle}
        />
      );
    } else if (this.state.recordStatus === 'RECORDING') {
      return (
        <RecordTimeStamp
          recordStatus={this.state.recordStatus}
          playStatus={this.state.playStatus}
          sound={this.sound}
          timeStampStyle={this.props.timeStampStyle}
          recordingDuration={this.state.recordingDuration}
        />
      );
    }
    return <Text style={this.props.timeStampStyle}> </Text>;
  };

  renderTopControls = () => {
    return (
      <View
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {this.props.showTimer ? this.renderTimer() : null}
        {/* this.props.showRecorderSlider ? this.renderRecorderSlider() : null */}
        {this.props.showPlaybackSlider ? this.renderPlaybackSlider() : null}
      </View>
    );
  };

  /*  
 TODO: need some way to set max recording time.  This is not currently provided by Expo
 renderRecorderSlider=()=>{
    if(this.props.maxFileSize){
    return this.props.recorderSlider({
      minimumValue:0,
      maximumValue:this.props.maxFileSize,
      value: 
      value={renderProps.value}
      onSlidingComplete={renderProps.onSlidingComplete}
      onValueChange={renderProps.onValueChange}
      disabled={renderProps.disabled}
    })
  }
  else{
    return (
      <Text>Infinity</Text>
    )
  }
  } */
  renderPlaybackSlider = () => {};

  renderBottomControls = () => {
    return (
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 5
        }}
      >
        {this.state.isRecording
          ? this.props.stopRecordingButton({
              onPress: () => {
                this.toggleRecord();
              },
              isRecording: this.state.isRecording
            })
          : this.props.startRecordingButton({
              onPress: () => {
                this.toggleRecord();
              },
              isRecording: this.state.isRecording
            })}
        {this.props.closeAudioRecorderButton({
          onPress: () => {},
          audioInfo: this.state.audioInfo,
          isRecording: this.state.isRecording
        })}
      </View>
    );
  };

  render() {
    return (
      <View style={{ flex: 1 }}>
        {this.state.showRecorder ? (
          <>
            {this.renderTopControls()}
            {this.renderBottomControls()}
            {this.props.showDebug ? (
              <ScrollView
                style={{
                  backgroundColor: '#FAFAD2',
                  height: 150,
                  padding: 5,
                  borderWidth: 0.5,
                  borderColor: '#d6d7da'
                }}
              >
                <Text style={{ color: 'darkblue' }}>
                  {this.state.debugStatements}
                </Text>
              </ScrollView>
            ) : null}
          </>
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {this.props.activityIndicator()}
          </View>
        )}
      </View>
      /* {this.props.showTimeStamp ? this.renderTimeStamp() : null}
        <GetRecordButtonByStatus
          onStartRecordingPress={this.onStartRecordingPress.bind(this)}
          onStopRecordingPress={this.onStopRecordingPress.bind(this)}
          recordStatus={this.state.recordStatus}
          playStatus={this.state.playStatus}
        />

        <GetPlayButtonByStatus
          recordStatus={this.state.recordStatus}
          playStatus={this.state.playStatus}
          onPlayPress={this.onPlayPress.bind(this)}
          onPausePress={this.onPausePress.bind(this)}
        />
        {this.props.showPlaybackSlider ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: 5,
              width:'100%'
            }}
            
          >
            {this.props.playbackSlider({
              maximumValue: this.state.maxSliderValue,
              onValueChange: this.onSliderValueChange,
              value: this.state.currentSliderValue,
              onSlidingComplete: this.onSlidingComplete,
            })}
            
          </View>
        ) : null}

        <View style={{ alignSelf: 'stretch' }}>
          {this.props.resetButton({
            onPress: this.onReset
          })}
          {this.props.showBackButton
            ? this.props.recordingCompleteButton({
                onPress: this.onComplete
              })
            : null}
          
        </View>
      </View> */
    );
  }
}

AudioRecorder.propTypes = {
  onComplete: PropTypes.func,
  maxFileSize: PropTypes.number,
  audioMode: PropTypes.object,
  timeStampStyle: PropTypes.object,
  showTimeStamp: PropTypes.bool,
  showPlaybackSlider: PropTypes.bool,
  showRecorderSlider: PropTypes.bool,
  showDebug: PropTypes.bool,
  showBackButton: PropTypes.bool,
  resetButton: PropTypes.func,
  recordingCompleteButton: PropTypes.func,
  playbackSlider: PropTypes.func,
  recorderSlider: PropTypes.func
};

AudioRecorder.propTypes = {
  // permissionsRetrievedCallback: function called when permssions are successfully retrieved
  // receives permssions respons as argument
  permissionsRetrievedCallback: PropTypes.func,

  // denyPermissionRequestCallback: function called if user denies granting permissions
  // when the alert box requests it again
  denyPermissionRequestCallback: PropTypes.func,
  // audioIsAvailableCallback: function called when a recording completes
  audioIsAvailableCallback: PropTypes.func,

  // permissionsAlert: properties controlling alert that pops up if user
  // does not grant required permissions
  permissionsAlert: PropTypes.shape({
    display: PropTypes.bool,
    title: PropTypes.string,
    message: PropTypes.string,
    tryAgainText: PropTypes.string,
    doNotTryAgainText: PropTypes.string,
    doNotTryAgainCallback: PropTypes.func
  }),

  // spinner shown until the the camera is available
  activityIndicator: PropTypes.func,

  // onError: callback that is passed an error object
  onError: PropTypes.func,

  // UI elements
  startRecordingButton: PropTypes.func,
  stopRecordingButton: PropTypes.func,
  closeAudioRecorderButton: PropTypes.func.isRequired,

  // Flash control UI elements
  flashOnButton: PropTypes.func,
  flashOffButton: PropTypes.func,
  flashAutoButton: PropTypes.func,

  // recordingSettings: an object matching Expo.Camera recording options
  // see here: https://docs.expo.io/versions/v31.0.0/sdk/camera#recordasync
  recordingSettings: PropTypes.object,
  audioMode: PropTypes.object,

  // showTimer: show a timer while recording
  showTimer: PropTypes.bool,

  // timer: function returning component to render as timeStamp
  timerComponent: PropTypes.func
};

AudioRecorder.defaultProps = {
  permissionsRetrievedCallback: () => {},
  denyPermissionRequestCallback: () => {
    console.log('request for permissions denied');
  },
  audioIsAvailableCallback: () => {},

  activityIndicator: () => {
    return <ActivityIndicator size="large" color="#0000ff" />;
  },
  onError: (error) => {
    console.log({ error });
  },
  recordingSettings: Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY,
  audioMode: {
    allowsRecordingIOS: true,
    interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
    playsInSilentModeIOS: true,
    playsInSilentLockedModeIOS: true,
    shouldDuckAndroid: true,
    interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
    playThroughEarpieceAndroid: false
  },

  startRecordingButton: ({ onPress }) => {
    return (
      <TouchableHighlight
        style={styles.defaultTouchableHighlight}
        onPress={onPress}
        underlayColor="#E0E0E0"
      >
        <Text style={styles.defaultText}>Record</Text>
      </TouchableHighlight>
    );
  },
  stopRecordingButton: ({ onPress }) => {
    return (
      <TouchableHighlight
        style={styles.defaultTouchableHighlight}
        onPress={onPress}
        underlayColor="#E0E0E0"
      >
        <Text style={styles.defaultText}>Stop Recording</Text>
      </TouchableHighlight>
    );
  },
  closeAudioRecorderButton: ({ onPress }) => {
    return (
      <TouchableHighlight
        style={styles.defaultTouchableHighlight}
        onPress={onPress}
        underlayColor="#E0E0E0"
      >
        <Text style={styles.defaultText}>Go Back</Text>
      </TouchableHighlight>
    );
  },

  showTimer: true,
  timerComponent: ({ value }) => {
    return (
      <View style={{ background: 'rgba(0,0,0,.5' }}>
        <Text style={{ fontSize: 64, color: 'white' }}>{value}</Text>
      </View>
    );
  },
  playbackSlider: (renderProps) => {
    return (
      <Slider
        minimumValue={renderProps.minimumValue}
        maximumValue={renderProps.maximumValue}
        value={renderProps.value}
        onSlidingComplete={renderProps.onSlidingComplete}
        onValueChange={renderProps.onValueChange}
        disabled={renderProps.disabled}
      />
    );
  },
  recorderSlider: (renderProps) => {
    return (
      <Slider
        minimumValue={renderProps.minimumValue}
        maximumValue={renderProps.maximumValue}
        value={renderProps.value}
        onSlidingComplete={renderProps.onSlidingComplete}
        onValueChange={renderProps.onValueChange}
        disabled={renderProps.disabled}
      />
    );
  },
  permissionsAlert: {
    display: true,
    title: 'Permissions Required',
    message:
      'Microphone permissions are required for this app to run properly.',
    tryAgainText: 'Try Again',
    doNotTryAgainText: 'OK',
    doNotTryAgainCallback: () => {
      console.log('permissions denied');
    }
  }
};
