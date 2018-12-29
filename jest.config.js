module.exports = {
    preset: 'jest-expo',
    transform: {
      '\\.js$': '<rootDir>/node_modules/react-native/jest/preprocessor.js'
    },
    transformIgnorePatterns: [
      'node_modules/(?!native-base-shoutem-theme|native-base|react-native-easy-grid|react-native|react-navigation|expo|@expo/vector-icons)'
    ]
  };
  