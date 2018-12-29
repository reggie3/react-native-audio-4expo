export const defaultButton = {
    alignItems: 'center',
    backgroundColor: '#DDDDDD',
    padding: 10,
    color: 'black'
  };
  
  export const buttonTemplate = {
    alignSelf: 'center',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white'
  };
  
  export const bigButtonStyle = {
    ...buttonTemplate,
    width: 72,
    height: 72,
    borderRadius: 36
  };
  
  export const buttonStyle = {
    ...buttonTemplate,
    width: 64,
    height: 64,
    borderRadius: 32
  };
  
  export const smallButtonStyle = {
    ...buttonTemplate,
    width: 24,
    height: 24,
    borderRadius: 12
  };
  

  export const flashButtonStyle ={
      ...buttonTemplate,
      width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,.3)'

  }

  export const defaultText={
      color: 'black',
      fontSize: 20
  }

  export const defaultTouchableHighlight={
      backgroundColor: 'rgba(255,255,255,.75)',
      padding: 5,
      marginHorizontal: 50,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 15
  }