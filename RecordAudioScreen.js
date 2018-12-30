import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text, Button, Container, Icon } from 'native-base';
import { withNavigation } from 'react-navigation';
import { AudioRecorder } from './index';
import { Audio } from 'expo';
import * as styles from './styles';


const ICON_SIZE = 40;

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

class RecordAudioScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  permissionsRetrievedCallback = (permissionsRetrievedCallbackRes) => {
    console.log({ permissionsRetrievedCallbackRes });
  };

  doNotTryAgainCallback = () => {
    console.log('Permissions denied');
  };

  onAudioRecorderError = (error) => {
    console.log({ error });
  };

  onRecordingCompleteCallback = () => {
    console.log('onRecordingCompleteCallback called');
  };

  onStartRecording = () => {
    console.log('onStartRecording');
  };

  onStopRecording = () => {
    console.log('onStopRecording');
  };

  onCloseAudioRecorder = (audioInfo) => {
      console.log({audioInfo});
    this.props.navigation.navigate('HomeScreen', { audioInfo });
  };

  render() {
    return (
      <Container
        style={{
          backgroundColor: `${BACKGROUND_COLOR}`
        }}
      >
        <AudioRecorder
          permissionsRetrievedCallback={this.permissionsRetrievedCallback}
          doNotTryAgainCallback={this.doNotTryAgainCallback}
          onError={this.onAudioRecorderError}
          getAudioCallback={this.getAudioCallback}
          recordingOptions={{
            quality: Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
          }}
          denyPermissionRequestCallback={() => {
            console.log('request for permissions denied');
            this.props.navigation.goBack();
          }}
          showRecorderTimer={true}
          showPlaybackTimer={true}
          /* permissionsAlert={{
          display: true,
          title:  'Permissions Required',
          message: 'Camera permissions are required to add images to location.',
          tryAgainText: 'Try Again',
          doNotTryAgainText: 'OK'
        }} */

         /*  activityIndicator={() => {
            return <ActivityIndicator size="large" color="#00ff00" />;
          }} */
          /* startRecordingButton={(renderProps) => {
            return (
              <Button
                onPress={() => {
                  renderProps.onPress();
                  this.onStartRecording();
                }}
                danger
                style={{
                  ...styles.bigButtonStyle,
                  backgroundColor: 'red',
                  borderWidth: 6,
                  borderColor: 'lightgray'
                }}
              />
            );
          }} */
          /* stopRecordingButton={(renderProps) => {
            return (
              <Button
                onPress={() => {
                  renderProps.onPress();
                  this.onStopRecording();
                }}
                style={{
                  ...styles.bigButtonStyle,
                  border: 3,
                  backgroundColor: 'lightgray',
                  borderColor: 'white'
                }}
              />
            );
          }} */
          closeAudioRecorderButton={(renderProps) => {
            return (
              <Button
                onPress={() => {
                  renderProps.onPress();
                  this.onCloseAudioRecorder(renderProps.audioInfo);
                }}
                disabled={renderProps.isRecording}
                block
                info={!renderProps.isRecording}
                style={{ margin: 5 }}
              >
                <Text>Go Back</Text>
              </Button>
            );
          }}/* playButton={(renderProps) => {
            return (
              <Button
                onPress={renderProps.onPress}
                success
                style={styles.bigButtonStyle}
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
          
          timerComponent={(renderProps) => {
            return (
              <View style={{ background: 'rgba(0,0,0,.5' }}>
                <Text style={{ color: 'white', fontSize: 20 }}>
                  {renderProps.value}
                </Text>
              </View>
            );
          }}*/
        />
      </Container>
    );
  }
}

export default withNavigation(RecordAudioScreen);
