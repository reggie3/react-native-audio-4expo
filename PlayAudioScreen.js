import React from 'react';
import {
  Slider,
  View,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { AudioPlayer } from './index';
import { Text, Button, Container, Icon } from 'native-base';
import { Audio, ScreenOrientation } from 'expo';
import { withNavigation } from 'react-navigation';

const random_rgba = () => {
  var o = Math.round,
    r = Math.random,
    s = 255;
  return (
    'rgba(' +
    o(r() * s) +
    ',' +
    o(r() * s) +
    ',' +
    o(r() * s) +
    ',' +
    r().toFixed(1) +
    ')'
  );
};

const BACKGROUND_COLOR = random_rgba();
const ICON_SIZE = 40;

const buttonTemplate = {
  alignSelf: 'center',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
};

const bigButtonStyle = {
  ...buttonTemplate,
  width: 72,
  height: 72,
  borderRadius: 36
};

const buttonStyle = {
  ...buttonTemplate,
  width: 64,
  height: 64,
  borderRadius: 32
};

const smallButtonStyle = {
  ...buttonTemplate,
  width: 24,
  height: 24,
  borderRadius: 12
};

class PlayAudioScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isFullScreen: false,
      audioInfo: {}
    };
    ScreenOrientation.allowAsync(ScreenOrientation.Orientation.PORTRAIT);
    console.log('PlayAudioScreen initialized');
  }

  componentDidUpdate = (prevProps, prevState) => {
    console.log('componentDidUpdate navigation: ', this.props.navigation);
    if (
      (this.props.navigation.state.params &&
        this.props.navigation.state.params.audioInfo &&
        !prevProps.navigation.state.params) ||
      (this.props.navigation.state.params &&
        this.props.navigation.state.params.audioInfo &&
        this.props.navigation.state.params.audioInfo !==
          prevProps.navigation.state.params.audioInfo)
    ) {
      console.log('player received audio');
      console.log(this.props.navigation.state.params.audioInfo);
      this.setState({
        audioInfo: this.props.navigation.state.params.audioInfo,
        isAudioReady: true
      });
    }
  };

  toggleFullScreenCallback = () => {
    this.setState({ isFullScreen: !this.state.isFullScreen }, () => {
      console.log({ isFullScreen: this.state.isFullScreen });
    });
  };

  onAudioPlayerError = (error) => {
    console.log({ error });
  };

  renderPlayer = (uri) => {
    return (
      <View style={{ flex: 1 }}>
        {this.state.isFullScreen ? null : (
          <View
            style={{
              flex: 1,
              display: 'flex',
              backgroundColor: '#E5CCFF',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Text>Boundary Area</Text>
          </View>
        )}
        <View
          style={{
            backgroundColor: 'black',
            padding: 15,
            display: 'flex',
            flex: 2
          }}
        >
          <AudioPlayer
            source={{
              uri: this.props.navigation.state.params.audioInfo.uri
            }} 
            useNativeControls={true}
            resizeMode={Audio.RESIZE_MODE_CONTAIN} 
            positionMillis={1500}
            isLooping={true}
            debug={false}
            onError={this.onAudioPlayerError}
            toggleFullScreenCallback={(isFullScreen) => {
              console.log({ isFullScreen });
            }}
            playCompleteCallback={() => {
              console.log('play complete');
            }}
            onLoadStart={() => {
              console.log('onLoadStart');
            }}
            onLoad={(playbackStatus) => {
              console.log('onLoad', playbackStatus);
            }}
            onReadyForDisplayCallback={(audioInfo) => {
              console.log('audio ready for display: ', audioInfo);
            }}
            onPlaybackStatusUpdateCallback={(playbackStatus) => {
              // console.log({playbackStatus});
            }}
             playButton={(renderProps) => {
              return (
                <Button
                  onPress={renderProps.onPress}
                  success
                  style={bigButtonStyle}
                >
                  <Icon
                    type="FontAwesome"
                    name="play"
                    color="white"
                    style={{ fontSize: ICON_SIZE }}
                  />
                </Button>
              );
            }}
            pauseButton={(renderProps) => {
              return (
                <Button
                  success
                  style={bigButtonStyle}
                  onPress={renderProps.onPress}
                >
                  <Icon
                    type="FontAwesome"
                    name="pause"
                    color="white"
                    style={{ fontSize: ICON_SIZE }}
                  />
                </Button>
              );
            }}
            fastForwardButton={(renderProps) => {
              return (
                <Button
                  onPress={renderProps.onPress}
                  success
                  style={buttonStyle}
                >
                  <Icon
                    type="FontAwesome"
                    name="forward"
                    color="white"
                    style={{ fontSize: ICON_SIZE - 10 }}
                  />
                </Button>
              );
            }}
            rewindButton={(renderProps) => {
              return (
                <Button
                  onPress={renderProps.onPress}
                  success
                  style={buttonStyle}
                >
                  <Icon
                    type="FontAwesome"
                    name="backward"
                    color="white"
                    style={{ fontSize: ICON_SIZE - 10 }}
                  />
                </Button>
              );
            }}
            repeatAudioButton={(renderProps) => {
              return (
                <Button
                  onPress={renderProps.onPress}
                  success
                  style={bigButtonStyle}
                >
                  <Icon
                    type="FontAwesome"
                    name="fast-backward"
                    color="white"
                    style={{ fontSize: ICON_SIZE }}
                  />
                </Button>
              );
            }}
            playbackSlider={(renderProps) => {
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
            }}
            showTimeStamp={true}
            timeStamp={(renderProps) => {
              return (
                <View
                  style={{ background: 'rgba(0,0,0,.5)', marginHorizontal: 5 }}
                >
                  <Text style={{ color: 'white', fontSize: 20 }}>
                    {renderProps.value}
                  </Text>
                </View>
              );
            }}
            fullScreenButton={(renderProps) => {
              return (
                <TouchableOpacity
                  onPress={renderProps.onPress}
                  style={smallButtonStyle}
                >
                  <Icon
                    type="Ionicons"
                    name="expand"
                    style={{ fontSize: 20, color: 'white' }}
                  />
                </TouchableOpacity>
              );
            }} 
          />
        </View>
        {this.state.isFullScreen ? null : (
          <View
            style={{
              flex: 1,
              display: 'flex',
              backgroundColor: 'rgba(255,255,255,.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 5
            }}
          >
            <Text>Boundary Area</Text>
            <Button
              success
              block
              onPress={() => {
                this.props.navigation.navigate('HomeScreen');
              }}
            >
              <Text>Go to HomeScreen</Text>
            </Button>
          </View>
        )}
      </View>
    );
  };
  render() {
    const { navigation } = this.props;
    const audioInfo = navigation.getParam('audioInfo', null);
    console.log(audioInfo);
    return (
      <Container
        style={{
          backgroundColor: `${BACKGROUND_COLOR}`
        }}
      >
        {audioInfo !== null ? (
          this.renderPlayer(audioInfo.uri)
        ) : (
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        )}
      </Container>
    );
  }
}

export default withNavigation(PlayAudioScreen);
