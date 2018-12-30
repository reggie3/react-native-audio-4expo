import React, { Component } from 'react';
import {
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Slider
} from 'react-native';
import { Text } from 'native-base';
import { Audio } from 'expo';
import PropTypes from 'prop-types';
import * as styles from './styles';

// the amount of time fast forward or rewind moves within the audio clip
const SOUND_JUMP_MILLIS = 5000;

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

export default class AudioPlayer extends Component {
  constructor(props) {
    super(props);

    this.recording = null;
    this.state = {
      error: null,
      secondsElapsed: 0,
      audioInfo: {},
      debugStatements: 'debug info will appear here',
      isAudioReady: false
    };
    this.sound = null;
  }

  componentDidMount = async () => {
    console.log('mounting player');
    console.log('source: ', this.props);
  };

  componentDidUpdate = (prevProps, prevState) => {
    if (this.props.source !== prevProps.source) {
      this.setState(
        {
          audioInfo: this.props.audioInfo,
          source: this.props.source
        },
        () => {
          this.loadSound();
        }
      );
    }
  };

  componentWillUnmount = () => {
    if (this.sound) {
      this.sound.setOnPlaybackStatusUpdate(null);
    }
  };

  loadSound = async () => {
    this.sound = new Audio.Sound();
    try {
      this.sound.setOnPlaybackStatusUpdate(
        this.onPlaybackStatusUpdate.bind(this)
      );
      let playbackSoundInfo = await this.sound.loadAsync({
        uri: this.props.source.uri
      });
      console.log({ playbackSoundInfo });
      this.setState({ isAudioReady: true, playbackSoundInfo });
    } catch (error) {
      this.props.onError &&
        this.props.onError({ 'onPlayPress loadAsync error': error });
    }
  };

  /*
  Function used to update the UI during playback
  */
  onPlaybackStatusUpdate = (playbackStatus) => {
    let that = this;
    this.props.debug && console.log({ playbackStatus });
    this.setState({
      prevPlaybackStatus: that.state.playbackStatus,
      playbackStatus: playbackStatus
    });

    if (playbackStatus.error) {
      this.setState({ playBackStatus: 'ERROR' });
      this.props.onError &&
        this.props.onError(
          `Encountered a fatal error during playback: ${playbackStatus.error}
        Please report this error as an issue.  Thank you!`
        );
    }

    if (playbackStatus.isLoaded) {
      // don't care about buffering if state.playStatus is equal to one of the other states
      // state.playStatus can only be equal to one of the other states after buffer
      // has completed, at which point state.playStatus is set to 'STOPPED'
      if (
        this.state.playStatus !== 'PLAYING' &&
        this.state.playStatus !== 'PAUSED' &&
        this.state.playStatus !== 'STOPPED' &&
        this.state.playStatus !== 'ERROR'
      ) {
        if (playbackStatus.isLoaded && !this.state.isLoaded) {
          this.setState({ isLoaded: true });
        }
        if (this.state.isLoaded && playbackStatus.isBuffering) {
          this.setState({
            isBuffering: true
          });
        }
        if (
          this.state.isLoaded &&
          !playbackStatus.isBuffering &&
          playbackStatus.hasOwnProperty('durationMillis')
        ) {
          this.setState({
            isPlaying: false,
            isStopped: true,
            isPaused: false
          });
        }
      }

      // Update the UI for the loaded state
      if (playbackStatus.isPlaying) {
        // Update  UI for the playing state
        this.setState({
          isPlaying: true,
          isStopped: false,
          isPaused: false,
          positionMillis: playbackStatus.positionMillis,
          currentSliderValue: playbackStatus.positionMillis
        });
      }

      if (playbackStatus.didJustFinish && !playbackStatus.isLooping) {
        this.setState({
          playStatus: 'STOPPED',
          isPlaying: false,
          isStopped: true,
          isPaused: false,
          positionMillis: playbackStatus.durationMillis,
          currentSliderValue: playbackStatus.durationMillis
        });
      }
    }
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
        this.props.onError &&
          this.props.onError({ 'Error: unloadAsync': error });
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

  onPlaybackSliderValueChange = (value) => {
    // set the postion of the actual sound object
    this.sound.setPositionAsync(value);
  };

  onPlayPress = async () => {
    this.playAudio();
  };

  playAudio = async () => {
    try {
      if (this.state.isPaused) {
        let playFromPositionAsyncRes = await this.sound.playFromPositionAsync(
          this.state.pausedPosition
        );
        this.props.debug && console.log({ playFromPositionAsyncRes });
      } else {
        let playAsyncRes = await this.sound.playAsync();
        this.props.debug && console.log(playAsyncRes);
        ({ playAsyncRes });
      }
      this.setState({ isPlaying: true, isPaused: false });
    } catch (error) {
      this.props.onError &&
        this.props.onError({ 'onPlayPress playAsync error': error });
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

  onResetPlaybackPress = async () => {
    let replayAsyncRes = await this.sound.replayAsync();
    this.props.onError && this.props.onError({ replayAsyncRes });
  };

  onFastForwardPressed = async () => {
    try {
      this.props.debug && console.log('in onFastForwardPressed');
      let status = await this.sound.getStatusAsync();
      this.props.debug && console.log({ status });

      let res = await this.sound.setPositionAsync(
        Math.min(
          status.positionMillis + SOUND_JUMP_MILLIS,
          status.playableDurationMillis
        )
      );
      this.props.debug && console.log(res);
    } catch (error) {
      this.props.debug && console.log({ error });
    }
  };

  onRewindPressed = async () => {
    this.props.debug && console.log('in onRewindPressed');
    try {
      let status = await this.sound.getStatusAsync();
      this.props.debug && console.log({ status });

      let res = await this.sound.setPositionAsync(
        Math.max(status.positionMillis - SOUND_JUMP_MILLIS, 0)
      );
      this.props.debug && console.log(res);
    } catch (error) {
      this.props.debug && console.log({ error });
    }
  };

  renderPlaybackTimer = () => {
    return this.props.playbackTimer({
      currentValue: formattedSeconds(
        this.state.playbackStatus.positionMillis || 0
      ),
      duration: formattedSeconds(this.state.playbackStatus.durationMillis || 0),
      isPlaying: this.state.isPlaying,
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
        {this.props.resetButton({
          onPress: this.onResetPlaybackPress,
          isPlaying: this.state.isPlaying
        })}
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
      this.props.onError && this.props.onError({ pauseAsyncRes });
    } catch (error) {
      this.props.onError && this.props.onError({ error });
    }
  };

  changePlaybackLocation = async (value) => {
    this.props.onError && this.props.onError({ value });
    this.props.onError &&
      console.log({ tempDurationMillis: this.state.tempDurationMillis });
    try {
      let setStatusAsyncRes = await this.videoRef.setStatusAsync({
        positionMillis: value,
        durationMillis: this.state.tempDurationMillis
      });
      this.props.onError && this.props.onError({ setStatusAsyncRes });
      this.props.onError && this.props.onError(this.state);

      let playAsyncRes = await this.videoRef.playAsync();
      this.props.onError && this.props.onError({ playAsyncRes });

      this.setState({ tempDurationMillis: null });
    } catch (error) {
      this.props.onError && this.props.onError({ error });
    }
  };

  renderPlaybackSlider = () => {
    return (
      <View style={{ width: '100%' }}>
        {this.props.playbackSlider({
          minimumValue: 0,
          maximumValue: this.state.playbackStatus.durationMillis,
          value: this.state.playbackStatus.positionMillis,
          onSlidingComplete: this.changePlaybackLocation,
          onValueChange: this.haltPlaybackForSliderValueChange
        })}
      </View>
    );
  };

  renderMiddleControls = () => {
    if (this.state.playbackStatus) {
      return (
        <View
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {this.props.showPlaybackTimer ? this.renderPlaybackTimer() : null}
          {this.props.showPlaybackSlider ? this.renderPlaybackSlider() : null}
        </View>
      );
    } else {
      return null;
    }
  };

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
        <View
          style={{
            display: 'flex',
            flexDirection: 'row'
            /* justifyContent: 'space-evenly' */
          }}
        >
          {this.props.rewindButton({
            onPress: this.onRewindPressed,
            isAudioReady: this.state.isAudioReady
          })}
          {this.state.isAudioReady && !this.state.isPlaying
            ? this.props.playButton({
                onPress: this.onPlayPress,
                isAudioReady: this.state.isAudioReady
              })
            : null}
          {this.state.isPlaying
            ? this.props.pauseButton({
                onPress: this.onPausePress
              })
            : null}
          {this.props.fastForwardButton({
            onPress: this.onFastForwardPressed,
            isAudioReady: this.state.isAudioReady
          })}
        </View>
        {this.props.closeAudioPlayerButton({
          onPress: () => {},
          audioInfo: this.state.audioInfo
        })}
      </View>
    );
  };

  render() {
    return (
      <View style={{ flex: 1 }}>
        {this.state.isAudioReady ? (
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

AudioPlayer.propTypes = {
  // spinner shown until the the camera is available
  activityIndicator: PropTypes.func,

  // onError: callback that is passed an error object
  onError: PropTypes.func,

  // UI elements
  playButton: PropTypes.func,
  pauseButton: PropTypes.func,
  resetButton: PropTypes.func,
  closeAudioPlayerButton: PropTypes.func.isRequired,

  // showTimer: show a timer while playing
  showPlaybackTimer: PropTypes.bool,
  // showPlaybackSlider: show a slider while playing
  showPlaybackSlider: PropTypes.bool,
  // timer: function returning component to render as timeStamp
  playbackTimer: PropTypes.func,
  // slider: function returning component to render as playback slider
  playbackSlider: PropTypes.func
};

AudioPlayer.defaultProps = {
  source: {
    uri:
      'https://s3.amazonaws.com/exp-us-standard/audio/playlist-example/Comfort_Fit_-_03_-_Sorry.mp3'
  },
  activityIndicator: () => {
    return <ActivityIndicator size="large" color="#0000ff" />;
  },
  onError: (error) => {
    console.log({ error });
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
  fastForwardButton: (renderProps) => {
    return (
      <TouchableOpacity
        style={styles.defaultTouchableHighlight}
        onPress={renderProps.onPress}
        underlayColor="#E0E0E0"
      >
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{'>>'}</Text>
      </TouchableOpacity>
    );
  },
  rewindButton: (renderProps) => {
    return (
      <TouchableOpacity
        style={styles.defaultTouchableHighlight}
        onPress={renderProps.onPress}
        underlayColor="#E0E0E0"
      >
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{'<<'}</Text>
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
  closeAudioPlayerButton: ({ onPress }) => {
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
  showPlaybackTimer: true,
  playbackTimer: ({ currentValue, duration }) => {
    return (
      <View style={{ background: 'rgba(0,0,0,.5' }}>
        <Text style={{ fontSize: 42, color: 'white' }}>
          {`${currentValue} / ${duration}`}
        </Text>
      </View>
    );
  },
  showPlaybackSlider: true,
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
  }
};
