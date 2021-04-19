const tokenReducer = (state, action) => {
  if (!state) {
    return {
      tokens: []
    }
  }

  switch(action.type) {
    case 'FETCHED_TOKEN_LIST':
      return {
        ...state,
        tokens: action.payload.tokens
      }
    case 'NEW_TOKEN':
      return {
        ...state,
        tokens: [...state.tokens, action.payload.token]
      }
    case 'DELETE_TOKEN':
      return {
        ...state,
        tokens: state.tokens.filter(token=>token.uuid !== action.payload.uuid)
      }
    default:
      return state;
  }
}
