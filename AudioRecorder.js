import React, { Component } from 'react';
import {
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Slider
} from 'react-native';
import { Text } from 'native-base';
import { Audio, FileSystem, Permissions } from 'expo';
import PropTypes from 'prop-types';
import * as styles from './styles';

const formattedSeconds = (millis) => {
  const totalSeconds = millis / 1000;
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor(totalSeconds / 60);

  const padWithZero = (number) => {
    const string = number.toString();
    if (number < 10) {
      return '0' + string;
    }
    return string;
  };
  return padWithZero(minutes) + ':' + padWithZero(seconds);
};

const initialState = {
  playStatus: 'NO_SOUND_FILE_AVAILABLE',
  recordStatus: 'NOT_STARTED',

  // legacy
  durationMillis: 0,
  playbackMillis: 0,
  positionMillis: 0,
  recordingInformation: {},
  recordingDurationMillis: 0,
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
      debugStatements: 'debug info will appear here',
      showRecorderTimer: true,
      showPlaybackTimer: false
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

  componentDidUpdate = (prevProps, prevState) => {
    // toggle state variables to show recording or playback controls
    if (this.state.isRecording && !prevState.isRecording) {
      this.setState({ showRecorderTimer: true, showPlaybackTimer: false });
    }
    if (this.state.isPlaying && !prevState.isPlaying) {
      this.setState({ showRecorderTimer: false, showPlaybackTimer: true });
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

  // update the status and progress of recording
  updateRecordingStatus = (status) => {
    this.props.debug && console.log({ 'updateRecordingStatus: ': status });

    if (!status.isRecording) {
      this.setState({
        recordStatus: 'NOT_RECORDING',
        isRecording: false
      });
    } else if (status.isRecording) {
      this.setState({
        recordStatus: 'RECORDING',
        recordingDurationMillis: status.durationMillis,
        currentSliderValue: status.durationMillis,
        isRecording: true
      });
    } else if (status.isDoneRecording) {
      this.setState({
        recordStatus: 'RECORDING_COMPLETE',
        recordingDurationMillis: status.durationMillis,
        isRecording: false
      });
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
      isLoading: true,
      audioInfo: {}
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
      await recording.prepareToRecordAsync(this.props.recordingSettings);
      recording.setOnRecordingStatusUpdate(this.updateRecordingStatus);
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
        this.onPlaybackStatusUpdate.bind(this)
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
  onPlaybackStatusUpdate = async (playbackStatus) => {
    this.props.debug && console.log({ onPlaybackStatusUpdate: playbackStatus });

    if (playbackStatus.error) {
      this.props.onError && this.props.onError(playbackStatus.error);
      if (playbackStatus.error.includes('AudioTrack init failed')) {
        console.log('reinitializing audio');
        try {
          await this.sound.unloadAsync();
          this.playAudio();
          /* let sound = new Audio.Sound();
          sound.setOnPlaybackStatusUpdate(
            this.onPlaybackStatusUpdate.bind(this)
          );
          debugger;
          await this.sound.unloadAsync();
          let playbackSoundInfo = await sound.loadAsync({
            uri: this.state.audioInfo.uri
          });
          this.props.onError && this.props.onError({ playbackSoundInfo });

          this.sound = sound;
          let playAsyncRes = await sound.playAsync();
          this.props.onError && this.props.onError({ playAsyncRes });
          this.setState({ playbackSoundInfo });
          debugger; */
        } catch (error) {
          console.log({ 'reseting audio error': error });
          debugger;
        }
      } else {
        console.log(playbackStatus.error);
        debugger;
      }
    } else {
      if (this.state.recordStatus !== 'RECORDING') {
        if (!playbackStatus.isLoaded) {
          // Update your UI for the unloaded state
          if (playbackStatus.error) {
            // Send Expo team the error on Slack or the forums so we can help you debug!
            this.setState({
              playStatus: 'ERROR'
            });
          }
        } else {
          // Update the UI for the loaded state
          if (playbackStatus.isPlaying) {
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
              this.setState({
                positionMillis: playbackStatus.positionMillis,
                currentSliderValue: playbackStatus.positionMillis,
                durationMillis: playbackStatus.durationMillis
              });
            }
          }

          if (playbackStatus.isBuffering) {
            // Update your UI for the buffering state
            this.setState({ playStatus: 'BUFFERING' });
          }

          if (playbackStatus.didJustFinish && !playbackStatus.isLooping) {
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
          this.props.onComplete(this.state.soundFileInfo);
        });
      } catch (error) {
        this.props.onError && this.props.onError({ 'Error: unloadAsync': error });
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
    this.sound.setPositionAsync(value);
  };

  onStartRecordingPress = () => {
    this.stopPlaybackAndBeginRecording();
  };

  onStopRecordingPress = () => {
    this.stopRecordingAndEnablePlayback();
  };

  onPlayPress = async () => {
    this.playAudio();
  };

  playAudio = async () => {
    console.log('attempting to play audio');
    let sound = new Audio.Sound();

    try {
      sound.setOnPlaybackStatusUpdate(this.onPlaybackStatusUpdate.bind(this));
      let playbackSoundInfo = await sound.loadAsync({
        uri: this.state.audioInfo.uri
      });
      this.sound = sound;
      this.setState({ playbackSoundInfo });
    } catch (error) {
      console.warn({ 'In playAudio - loadSound error': error });
    }

    try {
      if (this.state.isPaused) {
        let playFromPositionAsyncRes = await this.sound.playFromPositionAsync(
          this.state.pausedPosition
        );
        this.props.debug && console.log({ playFromPositionAsyncRes });
      } else {
        let playAsyncRes = await this.sound.playAsync();
        this.props.debug && console.log({ playAsyncRes });
      }
      this.setState({ isPlaying: true, isPaused: false });
    } catch (error) {
      this.props.onError && this.props.onError({ 'onPlayPress playAsync error': error });
    }
  };

  onPausePress = async () => {
    try {
      let pauseAsyncRes = await this.sound.pauseAsync();
      this.setState({
        isPlaying: false,
        isPaused: true,
        pausedPosition: pauseAsyncRes.positionMillis
      });
      console.log({ pauseAsyncRes });
    } catch (error) {
      console.warn(`pauseAsync error : ${error}`);
    }
  };

  onResetPress = () => {
    if (!this.state.isPlaying && !this.state.isRecording) {
      this.setState({
        audioInfo: {},
        recordingDurationMillis: 0,
        positionMillis: 0
      });
    }
  };

  renderRecorderTimer = () => {
    return this.props.recorderTimerComponent({
      value: formattedSeconds(this.state.recordingDurationMillis || 0),
      isRecording: this.state.isRecording
    });
  };

  renderPlaybackTimer = () => {
    return this.props.playbackTimerComponent({
      currentValue: formattedSeconds(this.state.positionMillis || 0),
      duration: formattedSeconds(this.state.recordingDurationMillis || 0),
      isRecording: this.state.isRecording,
      isPaused: this.state.isPaused
    });
  };

  renderTopControls = () => {
    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: 15
        }}
      >
        {this.state.audioInfo.uri
          ? this.props.resetButton({
              onPress: this.onResetPress,
              isPlaying: this.state.isPlaying,
              isRecording: this.state.isPlaying
            })
          : null}
      </View>
    );
  };

  haltPlaybackForSliderValueChange = async () => {
    try {
      if (!this.state.tempDurationMillis) {
        this.setState({
          tempDurationMillis: this.state.playbackStatus.durationMillis
        });
      }
      let pauseAsyncRes = await this.videoRef.pauseAsync();
      this.props.debug && console.log({ pauseAsyncRes });
    } catch (error) {
      this.props.onError && this.props.onError({ error });
    }
  };

  changePlaybackLocation = async (value) => {
    this.props.debug && console.log({ value });
    this.props.onError &&
      console.log({ tempDurationMillis: this.state.tempDurationMillis });
    try {
      let setStatusAsyncRes = await this.videoRef.setStatusAsync({
        positionMillis: value,
        durationMillis: this.state.tempDurationMillis
      });
      this.props.debug && console.log({ setStatusAsyncRes });
      this.props.debug && console.log(this.state);

      let playAsyncRes = await this.videoRef.playAsync();
      this.props.debug && console.log({ playAsyncRes });

      this.setState({ tempDurationMillis: null });
    } catch (error) {
      this.props.onError && this.props.onError({ error });
    }
  };

  renderPlaybackSlider = () => {
    return (
      <>
        {this.props.playbackSlider({
          minimumValue: 0,
          maximumValue: this.state.playbackSoundInfo.playableDurationMillis,
          value: this.state.playbackSoundInfo.positionMillis,
          onSlidingComplete: this.changePlaybackLocation,
          onValueChange: this.haltPlaybackForSliderValueChange
        })}
      </>
    );
  };

  renderMiddleControls = () => {
    return (
      <View
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {this.props.showRecorderTimer && this.state.showRecorderTimer
          ? this.renderRecorderTimer()
          : null}
        {this.props.showPlaybackTimer && this.state.showPlaybackTimer
          ? this.renderPlaybackTimer()
          : null}
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
        {this.state.audioInfo.uri && !this.state.isPlaying
          ? this.props.playButton({
              onPress: this.onPlayPress
            })
          : null}
        {this.state.audioInfo.uri && this.state.isPlaying
          ? this.props.pauseButton({
              onPress: this.onPausePress
            })
          : null}
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
            {this.renderMiddleControls()}
            {this.renderBottomControls()}    
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
  playButton: PropTypes.func,
  pauseButton: PropTypes.func,
  resetButton: PropTypes.func,



  // recordingSettings: an object matching Expo.Camera recording options
  // see here: https://docs.expo.io/versions/v31.0.0/sdk/camera#recordasync
  recordingSettings: PropTypes.object,
  audioMode: PropTypes.object,

  // booleans controling the display of the timers
  showRecordingTimer: PropTypes.bool,
  showPlaybackTimer: PropTypes.bool,

  // sliders for both recording and playback
  recordingSlider: PropTypes.func,
  playbackSlider: PropTypes.func
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
      <TouchableOpacity
        style={styles.defaultTouchableHighlight}
        onPress={onPress}
        underlayColor="#E0E0E0"
      >
        <Text style={styles.defaultText}>Record</Text>
      </TouchableOpacity>
    );
  },
  stopRecordingButton: ({ onPress }) => {
    return (
      <TouchableOpacity
        style={styles.defaultTouchableHighlight}
        onPress={onPress}
        underlayColor="#E0E0E0"
      >
        <Text style={styles.defaultText}>Stop Recording</Text>
      </TouchableOpacity>
    );
  },
  closeAudioRecorderButton: ({ onPress }) => {
    return (
      <TouchableOpacity
        style={styles.defaultTouchableHighlight}
        onPress={onPress}
        underlayColor="#E0E0E0"
      >
        <Text style={styles.defaultText}>Go Back</Text>
      </TouchableOpacity>
    );
  },
  playButton: ({ onPress }) => {
    return (
      <TouchableOpacity
        style={styles.defaultTouchableHighlight}
        onPress={onPress}
        underlayColor="#E0E0E0"
      >
        <Text style={styles.defaultText}>Play</Text>
      </TouchableOpacity>
    );
  },
  pauseButton: ({ onPress }) => {
    return (
      <TouchableOpacity
        style={styles.defaultTouchableHighlight}
        onPress={onPress}
        underlayColor="#E0E0E0"
      >
        <Text style={styles.defaultText}>Pause</Text>
      </TouchableOpacity>
    );
  },
  resetButton: ({ onPress, isPlaying, isRecording }) => {
    return (
      <TouchableOpacity
        style={styles.defaultTouchableHighlight}
        onPress={onPress}
        underlayColor="#E0E0E0"
      >
        <Text
          style={{
            ...styles.defaultText,
            color: isPlaying || isRecording ? 'gray' : 'black'
          }}
        >
          Reset
        </Text>
      </TouchableOpacity>
    );
  },
  showTimer: true,
  recorderTimerComponent: ({ value }) => {
    return (
      <View style={{ background: 'rgba(0,0,0,.5' }}>
        <Text style={{ fontSize: 64, color: 'white' }}>{value}</Text>
      </View>
    );
  },
  playbackTimerComponent: ({ currentValue, duration }) => {
    return (
      <View style={{ background: 'rgba(0,0,0,.5' }}>
        <Text style={{ fontSize: 42, color: 'white' }}>
          {`${currentValue} / ${duration}`}
        </Text>
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
