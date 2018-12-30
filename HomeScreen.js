import React from 'react';
import { View } from 'react-native';
import { withNavigation } from 'react-navigation';
import { Button, Text, Container } from 'native-base';
import { FileSystem } from 'expo';

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

class HomeScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      audioInfo: 'Audio File Info Will Appear Here',
      isAudioReady: false
    };
    /* this.props.navigation.navigate('RecordAudioScreen', {
     audioInfo: this.state.audioInfo
    });  */
  }

  componentDidUpdate = (prevProps, prevState) => {
    if (this.state.audioInfo !== prevState.audioInfo) {
      console.log('audio has updated');
      // do checks to see if the audio is valid and update isAudioReady
    }

    // update the audio info in state if it it has been passed, and if
    // it is different from what we already have
    if (
      (this.props.navigation.state.params &&
        this.props.navigation.state.params.audioInfo &&
        !prevProps.navigation.state.params) ||
      (this.props.navigation.state.params &&
        this.props.navigation.state.params.audioInfo &&
        this.props.navigation.state.params.audioInfo !==
          prevProps.navigation.state.params.audioInfo)
    ) {
      console.log(this.props.navigation.state.params.audioInfo);
      this.setState({
        audioInfo: this.props.navigation.state.params.audioInfo,
        isAudioReady: true
      });
    }
  };

  componentWillUnmount = async () => {
    // delete the file on exit
    console.log('deleting file');
    if (this.state.isAudioReady) {
      let deleteRes = await FileSystem.deleteAsync(this.state.audioInfo.uri);
      console.log(deleteRes);
    }
  };

  render() {
    return (
      <Container
        style={{
          backgroundColor: `${BACKGROUND_COLOR}`
        }}
      >
        <View
          style={{
            flex: 1,
            padding: 10
          }}
        >
          <Text
            style={{
              backgroundColor: 'white',
              flex: 1,
              padding: 5
            }}
          >
            {typeof this.state.audioInfo === 'object'
              ? JSON.stringify(this.state.audioInfo, null, 2)
              : this.state.audioInfo}
          </Text>
        </View>
        <Button
          success
          block
          style={{ margin: 10 }}
          onPress={() => {
            this.props.navigation.navigate('RecordAudioScreen');
          }}
        >
          <Text>Record Audio</Text>
        </Button>
        <Button
          success={this.state.isAudioReady}
          disabled={!this.state.isAudioReady}
          block
          style={{ margin: 10 }}
          onPress={() => {
            console.log('sending: ', this.state.audioInfo);
            this.props.navigation.navigate('PlayAudioScreen', {
              audioInfo: this.state.audioInfo
            });
          }}
        >
          <Text>Play Audio</Text>
        </Button>
      </Container>
    );
  }
}

export default withNavigation(HomeScreen);
