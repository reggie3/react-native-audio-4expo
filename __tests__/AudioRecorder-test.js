import React from 'react';
import { AudioRecorder } from '../index';
import { render } from 'react-native-testing-library';

it('should display an activity indicator prior to confirming permissions', () => {
  const output = render(<AudioRecorder />);
  console.log(output.state);
});
