import React from 'react';

import RecordAudioScreen from './RecordAudioScreen';
import PlayAudioScreen from './PlayAudioScreen';
import HomeScreen from './HomeScreen';
//
import { createStackNavigator } from 'react-navigation';
import { AppLoading, Font } from 'expo';

const RootStack = createStackNavigator(
  {
    HomeScreen: {
      screen: HomeScreen
    },
    RecordAudioScreen: {
      screen: RecordAudioScreen
    },
    PlayAudioScreen: {
      screen: PlayAudioScreen
    }
  },
  {
    initialRouteName: 'HomeScreen',
    navigationOptions: {
      title: 'Audio 4Expo Demo',
      headerStyle: {
        backgroundColor: '#2266cc',

      },
      headerTintColor: '#44f',
      headerTitleStyle: {
        fontWeight: 'bold',
        color: '#dbee00'
      },
    },
  }
  
);

export default class App extends React.Component {
  state = {
    fontLoaded: false
  };

  async componentWillMount() {
    await Font.loadAsync({
      Roboto: require('native-base/Fonts/Roboto.ttf'),
      Roboto_medium: require('native-base/Fonts/Roboto_medium.ttf'),
      Ionicons: require('@expo/vector-icons/fonts/Ionicons.ttf')
    });
    this.setState({ fontLoaded: true });
  }

  render = () => {
    if (!this.state.fontLoaded) {
      return <AppLoading />;
    } else {
      return <RootStack />;
    }
  };
}
