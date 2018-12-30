import React from 'react';
import {
  Slider,
  View,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { AudioPlayer } from './index';
import { Text, Button, Container } from 'native-base';
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

class PlayAudioScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isFullScreen: false,
      audioInfo: {}
    };
    console.log('PlayAudioScreen initialized');
  }

  componentDidMount = () => {
    console.log('========== componentDidMount PlayAudioScreen ============');
    console.log(this.props);
    console.log('componentDidMount navigation: ', this.props.navigation);
    this.setState({ audioInfo: this.props.navigation.state.params.audioInfo });
  };

  /*  TODO: I think this can be removed
 componentDidUpdate = (prevProps, prevState) => {
    console.log('========== componentDidUpdate PlayAudioScreen ============');
    console.log(this.props);
    console.log('componentDidUpdate navigation: ', this.props.navigation);
    debugger;
    if 
      (this.props.navigation.state.params &&
        this.props.navigation.state.params.audioInfo &&
        !prevState.audioInfo)  {
      console.log('player received audio');
      console.log(this.props.navigation.state.params.audioInfo);
      this.setState(
        {
          audioInfo: this.props.navigation.state.params.audioInfo,
          isAudioReady: true
        },
        () => {
          console.log(this.state.audioInfo);
        }
      );
    }
  }; */

  onAudioPlayerError = (error) => {
    console.log({ error });
  };

  onCloseAudioPlayer = () => {
    this.props.navigation.goBack();
  };

  render = () => {
    return (
      <Container
        style={{
          backgroundColor: `${BACKGROUND_COLOR}`
        }}
      >
      
        <AudioPlayer
        audioInfo={this.state.audioInfo}
          source={{
            uri: this.state.audioInfo.uri
          }}
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
          }}
        />
      </Container>
    );
  };
}

export default withNavigation(PlayAudioScreen);
