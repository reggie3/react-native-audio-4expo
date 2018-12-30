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

  onAudioPlayerError = (error) => {
    console.log({ error });
  };

  onCloseAudioPlayer=()=>{
      this.props.navigation.goBack()
  }

  render = () => {
    
    return (
      <Container
        style={{
          backgroundColor: `${BACKGROUND_COLOR}`
        }}
      >
        <AudioPlayer
         /* source={{
            uri: this.state.audioInfo.uri
          }}  */
          debug={true}
        closeAudioPlayerButton={(renderProps) => {
            return (
              <Button
                onPress={() => {
                  renderProps.onPress();
                  this.onCloseAudioPlayer(renderProps.audioInfo);
                }}
                disabled={renderProps.isRecording}
                block
                info={!renderProps.isRecording}
                style={{ margin: 5 }}
                onError={this.onAudioPlayerError}
              >
                <Text>Go Back</Text>
              </Button>
            );
          }}/>
        </Container>
    );
  }
}

export default withNavigation(PlayAudioScreen);
